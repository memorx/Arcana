import { render } from "@testing-library/react";
import SharedBlueprintPage, { generateMetadata } from "@/app/share/blueprint/[shareId]/page";
import { blueprintInputsHash } from "@/lib/ai/blueprint-synthesis";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    arcanaProfile: { findUnique: jest.fn() },
  },
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/share/blueprint/x",
  useSearchParams: () => new URLSearchParams(),
}));

// The page only needs the hash; keep the Anthropic SDK (needs TextEncoder) out of jsdom.
jest.mock("@/lib/ai/config", () => ({ AI_MODELS: { synthesis: "test-model" }, complete: jest.fn() }));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${namespace}.${key}:${Object.values(values).join(",")}` : `${namespace}.${key}`
  ),
  getLocale: jest.fn(async () => "es"),
}));

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const findUnique = (prisma.arcanaProfile as unknown as { findUnique: jest.Mock }).findUnique;

const birthDate = new Date("1990-07-15T00:00:00.000Z");
const fullName = "Ana Sofía López";
const SYNTHESIS = "Retrato de Ana, que cuida y se mueve.\n\n¿Qué cuidas cuando te quedas?";

const sharedRow = (overrides: { inputsHash?: string; synthesis?: string } = {}) => ({
  synthesis: overrides.synthesis ?? SYNTHESIS,
  inputsHash: overrides.inputsHash ?? blueprintInputsHash(birthDate, fullName, "es"),
  user: { profile: { birthDate, fullName, locale: "es" } },
});

const params = (shareId: string) => ({ params: Promise.resolve({ shareId }) });

/** Every text node of the rendered page, one by one (so adjacent numbers don't merge). */
function textNodes(root: Node): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode.textContent ?? "");
  return out;
}

describe("/share/blueprint/[shareId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("an unknown id → notFound()", async () => {
    findUnique.mockResolvedValue(null);
    await expect(SharedBlueprintPage(params("abcdef1234"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { shareId: "abcdef1234" } }));
    expect(notFound).toHaveBeenCalled();
  });

  it("an id with an invalid format → notFound() without querying the database", async () => {
    for (const bad of ["a b", "../../etc", "x", "abc$%^def", "a".repeat(40)]) {
      await expect(SharedBlueprintPage(params(bad))).rejects.toThrow("NEXT_NOT_FOUND");
    }
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("a shared map whose owner has no profile anymore → notFound()", async () => {
    findUnique.mockResolvedValue({ ...sharedRow(), user: { profile: null } });
    await expect(SharedBlueprintPage(params("abcdef1234"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows the first name, the badges and the synthesis, never the surname or the birth date", async () => {
    findUnique.mockResolvedValue(sharedRow());
    const { container } = render(await SharedBlueprintPage(params("abcdef1234")));
    const html = container.innerHTML;

    expect(html).toContain("blueprint.public.title:Ana");
    expect(html).toContain("Caballo de Metal");
    expect(html).toContain("12 Cóatl · 12 Serpiente");
    expect(html).toContain("Retrato de Ana, que cuida y se mueve.");

    // No surname or middle name, no year, no ISO date, no day or month.
    expect(html).not.toContain("López");
    expect(html).not.toContain("Sofía");
    expect(html).not.toContain("1990");
    expect(html).not.toContain("1990-07-15");
    for (const text of textNodes(container)) {
      expect(text).not.toMatch(/(^|\D)15(\D|$)/);
      expect(text).not.toMatch(/julio|july/i);
    }
  });

  it("does not show a synthesis written for other inputs (profile changed)", async () => {
    findUnique.mockResolvedValue(
      sharedRow({ inputsHash: blueprintInputsHash(birthDate, "Ana", "es"), synthesis: "Texto viejo de otra fecha." })
    );
    const { container } = render(await SharedBlueprintPage(params("abcdef1234")));
    expect(container.innerHTML).not.toContain("Texto viejo de otra fecha.");
    expect(container.innerHTML).toContain("blueprint.public.noSynthesis");
    // The badges are still there.
    expect(container.innerHTML).toContain("Caballo de Metal");
  });

  it("generateMetadata: noindex, first name in the title, no birth date in the description", async () => {
    findUnique.mockResolvedValue(sharedRow());
    const metadata = await generateMetadata(params("abcdef1234"));
    expect((metadata.robots as { index?: boolean }).index).toBe(false);
    expect(String(metadata.title)).toContain("Ana");
    expect(String(metadata.title)).not.toContain("López");
    expect(String(metadata.description)).toContain("Caballo de Metal");
    expect(String(metadata.description)).not.toMatch(/1990|López|julio/);
  });

  it("generateMetadata for an unknown id is also noindex", async () => {
    findUnique.mockResolvedValue(null);
    const metadata = await generateMetadata(params("abcdef1234"));
    expect((metadata.robots as { index?: boolean }).index).toBe(false);
  });
});

describe("/share/blueprint/[shareId] in two inks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is complete without JavaScript: one h1, no entrance animation, the brand band and the footer", async () => {
    findUnique.mockResolvedValue(sharedRow());
    const { container } = render(await SharedBlueprintPage(params("abcdef1234")));

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    // Nothing waits for an animation (or for hydration) to become visible.
    expect(container.innerHTML).not.toMatch(/animate-|opacity-0/);
    expect(container.querySelector("header.suelo-tinta a[href='/']")).toHaveTextContent("Arcana");
    expect(container.querySelector("footer.suelo-tinta")).toBeInTheDocument();
    // The five stamps are a labelled list; the call to action links to sign up.
    const sellos = container.querySelector('ul[aria-label="blueprint.badgesLabel"]');
    expect(sellos?.querySelectorAll("li")).toHaveLength(5);
    expect(container.querySelector("a[href='/register']")).toHaveTextContent("blueprint.public.cta");
  });
});
