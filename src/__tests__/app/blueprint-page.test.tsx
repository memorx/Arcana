import { render, screen, within } from "@testing-library/react";
import { blueprintInputsHash } from "@/lib/ai/blueprint-synthesis";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.values(values).join(",")})` : key
  ),
  getLocale: jest.fn(async () => "es"),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; className?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} className={props.className} />;
  },
}));

// The page only needs the hash; keep the Anthropic SDK (needs TextEncoder) out of jsdom.
jest.mock("@/lib/ai/config", () => ({ AI_MODELS: { synthesis: "test-model" }, complete: jest.fn() }));

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: jest.fn() },
    arcanaProfile: { findUnique: jest.fn() },
    card: { findMany: jest.fn() },
  },
}));

import BlueprintPage from "@/app/(main)/blueprint/page";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const db = prisma as unknown as {
  userProfile: { findUnique: jest.Mock };
  arcanaProfile: { findUnique: jest.Mock };
  card: { findMany: jest.Mock };
};

const birthDate = new Date("1990-07-15T00:00:00.000Z");
const fullName = "Ana Sofía López";
/** Text of an element without its aria-hidden parts (the glyphs). */
function textoVisibleParaLector(el: Element): string {
  const copia = el.cloneNode(true) as Element;
  copia.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return copia.textContent ?? "";
}

const SYNTHESIS = "Retrato de Ana, que cuida y se mueve.\n\nSegundo párrafo.\n\n¿Qué cuidas cuando te quedas?";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
  db.userProfile.findUnique.mockResolvedValue({ birthDate, fullName, locale: "es" });
  db.arcanaProfile.findUnique.mockResolvedValue({
    synthesis: SYNTHESIS,
    inputsHash: blueprintInputsHash(birthDate, fullName, "es"),
    shareId: null,
  });
});

describe("/blueprint (Mapa Arcano)", () => {
  it("sends visitors without a session to login", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(BlueprintPage()).rejects.toThrow("NEXT_REDIRECT /login?callbackUrl=/blueprint");
    expect(redirect).toHaveBeenCalledWith("/login?callbackUrl=/blueprint");
  });

  it("hero: one h1 with the first name and the five stamps in order", async () => {
    render(await BlueprintPage());
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("title(Ana)");
    expect(h1s[0]).not.toHaveTextContent("López");

    // The stamps are a labelled list (the data); the map glyph repeats them aria-hidden.
    const sellos = screen.getByRole("list", { name: "badgesLabel" });
    const items = within(sellos).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-sello"))).toEqual([
      "western",
      "chinese",
      "tonalli",
      "lifePath",
      "birthCard",
    ]);
    expect(items.map(textoVisibleParaLector)).toEqual([
      "badges.western: Cáncer",
      "badges.chinese: Caballo de Metal",
      "badges.tonalli: 12 Cóatl · 12 Serpiente",
      "badges.lifePath: badges.lifePathValue(5)",
      "badges.birthCard: El Hierofante",
    ]);
  });

  it("one plate per system, each with its own h3, in the order of the map", async () => {
    const { container } = render(await BlueprintPage());
    const laminas = [...container.querySelectorAll("[data-laminas] > li")];
    expect(laminas.map((li) => li.getAttribute("data-lamina"))).toEqual([
      "tarot",
      "western",
      "chinese",
      "tonalli",
      "numerology",
    ]);
    for (const lamina of laminas) {
      expect(lamina.querySelectorAll("h3").length).toBeGreaterThanOrEqual(1);
    }
    const [tarot, western, chinese, tonalli, numerology] = laminas as HTMLElement[];
    expect(within(tarot).getByRole("heading", { level: 3, name: "El Hierofante" })).toBeInTheDocument();
    expect(within(western).getByRole("heading", { level: 3, name: "Cáncer" })).toBeInTheDocument();
    expect(within(chinese).getByRole("heading", { level: 3, name: "Caballo de Metal" })).toBeInTheDocument();
    // Tonalli: number + Nahuatl name as the title, the Spanish name next to it
    expect(within(tonalli).getByRole("heading", { level: 3, name: "12 Cóatl" })).toBeInTheDocument();
    expect(tonalli).toHaveTextContent("12 Serpiente");
    // Numerology: the life path number as the plate's large Gloock figure
    const figura = numerology.querySelector("[data-figura]");
    expect(figura).toHaveTextContent(/^5$/);
    expect(figura).toHaveClass("font-titulo");
    expect(figura).toHaveAttribute("aria-hidden", "true");
  });

  it("the birth card is the self-hosted engraving from its Major Arcana index, without asking the database", async () => {
    const { container } = render(await BlueprintPage());
    const tarot = container.querySelector('[data-lamina="tarot"]') as HTMLElement;
    const img = within(tarot).getByAltText("El Hierofante");
    expect(img).toHaveAttribute("src", "/cartas/rws-tarot-05-hierophant-tinta.webp");
    expect(db.card.findMany).not.toHaveBeenCalled();
    expect(container.innerHTML).not.toMatch(/wikimedia|imageUrl/i);
  });

  it("glyphs are printed in one ink (zodiac signs in their text form, animals and day signs in grey)", async () => {
    const { container } = render(await BlueprintPage());
    const glifos = [...container.querySelectorAll("[data-glifo]")];
    expect(glifos.length).toBeGreaterThan(0);
    for (const glifo of glifos) {
      expect(glifo).toHaveClass("grayscale");
      expect(glifo).toHaveAttribute("aria-hidden", "true");
    }
    const cancer = glifos.find((g) => g.textContent?.startsWith("♋"));
    expect(cancer?.textContent).toBe("♋︎");
  });

  it("with a current synthesis: the written sheet, the questions apart, no generate button", async () => {
    render(await BlueprintPage());
    const region = document.getElementById("synthesis") as HTMLElement;
    expect(region).toHaveAttribute("role", "region");
    expect(region).toHaveAttribute("data-estado", "escrita");
    expect(within(region).getByText("Retrato de Ana, que cuida y se mueve.")).toBeInTheDocument();
    expect(within(region).getByRole("heading", { level: 3, name: "questionsTitle" })).toBeInTheDocument();
    expect(within(region).getByText("¿Qué cuidas cuando te quedas?")).toHaveClass("italic");
    expect(within(region).queryByRole("button", { name: "generate" })).not.toBeInTheDocument();
  });

  it("with a synthesis written for other inputs: the stale state asks to update it", async () => {
    db.arcanaProfile.findUnique.mockResolvedValue({
      synthesis: "Texto viejo.",
      inputsHash: blueprintInputsHash(birthDate, "Ana", "es"),
      shareId: null,
    });
    render(await BlueprintPage());
    const region = document.getElementById("synthesis") as HTMLElement;
    expect(region).toHaveAttribute("role", "region");
    expect(region).toHaveAttribute("data-estado", "vieja");
    expect(within(region).getByText("stale")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "regenerate" })).toBeInTheDocument();
    expect(region).not.toHaveTextContent("Texto viejo.");
  });

  it("without a synthesis yet: the pending state offers to generate it", async () => {
    db.arcanaProfile.findUnique.mockResolvedValue(null);
    render(await BlueprintPage());
    const region = document.getElementById("synthesis") as HTMLElement;
    expect(region).toHaveAttribute("role", "region");
    expect(region).toHaveAttribute("data-estado", "pendiente");
    expect(within(region).getByRole("button", { name: "generate" })).toBeInTheDocument();
  });

  it("without a profile: one h1 and the way to the profile, no plates", async () => {
    db.userProfile.findUnique.mockResolvedValue(null);
    const { container } = render(await BlueprintPage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("noProfile.title");
    expect(container.querySelector('[data-estado="sin-perfil"]')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "noProfile.cta" })).toHaveAttribute("href", "/profile/setup");
    expect(container.querySelector("[data-laminas]")).not.toBeInTheDocument();
  });
});
