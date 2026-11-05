import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SynthesisPanel } from "@/components/blueprint/SynthesisPanel";
import { BlueprintShare } from "@/components/blueprint/BlueprintShare";
import { BlueprintBadges } from "@/components/blueprint/BlueprintBadges";
import {
  getBirthCardRoles,
  getBlueprintBadges,
  splitSynthesis,
  toRoman,
  traitList,
  formatBirthDate,
} from "@/components/blueprint/view-model";
import { getArcanaBlueprint, getBirthCards } from "@/lib/systems";

const fakeT = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}(${Object.values(values).join(",")})` : key;

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const bp = getArcanaBlueprint(utc(1990, 7, 15), "Ana López", utc(2026, 11, 4));

const SYNTHESIS = [
  "Eres una persona que cuida y se mueve.",
  "",
  "**Coinciden** el agua de Cáncer y la serpiente.",
  "",
  "Hay una tensión: ¿quedarte o partir? Puede ser una fuerza.",
  "",
  "1. ¿Qué cuidas cuando te quedas?",
  "- ¿Qué buscas cuando te vas?",
  "¿Dónde está tu casa este año?",
].join("\n");

describe("view-model", () => {
  it("builds the five badges in order with the person's signs", () => {
    const es = getBlueprintBadges(bp, "es", fakeT);
    expect(es.map((b) => b.id)).toEqual(["western", "chinese", "tonalli", "lifePath", "birthCard"]);
    expect(es.map((b) => b.label)).toEqual([
      "Cáncer",
      "Caballo de Metal",
      "12 Cóatl · 12 Serpiente",
      "badges.lifePathValue(5)",
      "El Hierofante",
    ]);
    expect(es[0].symbol).toBe(bp.western.emoji);
    expect(es[3]).toMatchObject({ symbol: "5", symbolIsText: true });
    expect(es[4]).toMatchObject({ symbol: "V", symbolIsText: true });

    const en = getBlueprintBadges(bp, "en", fakeT);
    expect(en[0].label).toBe("Cancer");
    expect(en[1].label).toBe("Metal Horse");
    expect(en[4].label).toBe("The Hierophant");
  });

  it("toRoman writes the Major Arcana numerals", () => {
    expect([0, 1, 4, 5, 9, 10, 14, 19, 21].map(toRoman)).toEqual([
      "0", "I", "IV", "V", "IX", "X", "XIV", "XIX", "XXI",
    ]);
  });

  it("traitList splits and capitalizes", () => {
    expect(traitList("Cuidado, memoria, intuición.", "es")).toEqual(["Cuidado", "Memoria", "Intuición"]);
    expect(traitList("cooperation, sensitivity", "en")).toEqual(["Cooperation", "Sensitivity"]);
  });

  it("getBirthCardRoles shows one card when personality and soul match, and the hidden factor", () => {
    expect(getBirthCardRoles(getBirthCards(utc(1990, 7, 15)))).toEqual([{ role: "personalitySoul", index: 5 }]);
    expect(getBirthCardRoles(getBirthCards(utc(1962, 8, 21)))).toEqual([
      { role: "personality", index: 20 },
      { role: "soul", index: 2 },
    ]);
    expect(getBirthCardRoles({ personality: 19, soul: 1, hidden: 10, sum: 19 })).toEqual([
      { role: "personality", index: 19 },
      { role: "soul", index: 1 },
      { role: "hidden", index: 10 },
    ]);
  });

  it("formatBirthDate reads the UTC day", () => {
    expect(formatBirthDate("1990-07-15", "en")).toBe("July 15, 1990");
    expect(formatBirthDate("1990-01-01", "es")).toBe("1 de enero de 1990");
  });

  it("splitSynthesis strips stray Markdown and marks the closing questions", () => {
    const blocks = splitSynthesis(SYNTHESIS);
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph", "paragraph", "question", "question", "question"]);
    expect(blocks[1].text).toBe("Coinciden el agua de Cáncer y la serpiente.");
    expect(blocks[3].text).toBe("¿Qué cuidas cuando te quedas?");
    expect(blocks[4].text).toBe("¿Qué buscas cuando te vas?");
    // A question inside a paragraph that is not at the end stays a paragraph.
    expect(blocks[2].kind).toBe("paragraph");
  });
});

describe("BlueprintBadges", () => {
  it("renders a labelled list with the system names for screen readers", () => {
    render(<BlueprintBadges badges={getBlueprintBadges(bp, "es", fakeT)} label="Tus cinco signos" />);
    const list = screen.getByRole("list", { name: "Tus cinco signos" });
    expect(list.querySelectorAll("li")).toHaveLength(5);
    expect(screen.getByText("Caballo de Metal")).toBeInTheDocument();
    expect(screen.getByText("badges.western:", { exact: false })).toHaveClass("sr-only");
  });
});

describe("SynthesisPanel", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  const props = {
    initialSynthesis: null,
    isStale: false,
    initialShareId: null,
    synthesisLocale: "es" as const,
    uiLocale: "es" as const,
  };

  it("generates the synthesis and shows it in paragraphs with the questions apart", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ synthesis: SYNTHESIS, shareId: null, cached: false }),
    });
    render(<SynthesisPanel {...props} />);

    expect(screen.getByText("intro")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "generate" }));

    expect(await screen.findByText("Eres una persona que cuida y se mueve.")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/blueprint/synthesis", { method: "POST" });
    expect(screen.getByText("questionsTitle")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      expect.arrayContaining(["1¿Qué cuidas cuando te quedas?"])
    );
    // Share appears once there is a synthesis.
    expect(screen.getByRole("button", { name: "create" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "generate" })).not.toBeInTheDocument();
  });

  it("shows the loading state while waiting", async () => {
    let resolve: (value: unknown) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<SynthesisPanel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "generate" }));

    expect(await screen.findByRole("status")).toHaveTextContent("loadingSr");
    expect(screen.getByText("loading.western")).toBeInTheDocument();

    resolve({ ok: false, status: 503, json: () => Promise.resolve({ error: "synthesis_unavailable", retry: true }) });
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.unavailable");
  });

  it("503 shows the unavailable message and a retry button", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: "synthesis_unavailable", retry: true }),
    });
    render(<SynthesisPanel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "generate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("errors.unavailable");
    expect(screen.getByRole("button", { name: "retry" })).toBeInTheDocument();
  });

  it("422 and 429 have their own messages", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 422, json: () => Promise.resolve({ error: "synthesis_refused" }) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}) });
    render(<SynthesisPanel {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "generate" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.refused");

    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("errors.rateLimited"));
  });

  it("with a cached synthesis it renders it without calling the API", () => {
    render(<SynthesisPanel {...props} initialSynthesis={SYNTHESIS} initialShareId="abc123defg" />);
    expect(screen.getByText("Eres una persona que cuida y se mueve.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith("/api/blueprint/synthesis", expect.anything());
    expect(screen.getByRole("button", { name: "stop" })).toBeInTheDocument();
  });

  it("marks the synthesis language when it differs from the interface", () => {
    render(<SynthesisPanel {...props} initialSynthesis={SYNTHESIS} uiLocale="en" />);
    expect(screen.getByText("languageNote")).toBeInTheDocument();
    expect(screen.getByText("Eres una persona que cuida y se mueve.").closest("article")).toHaveAttribute("lang", "es");
  });

  it("a stale synthesis asks to update it", () => {
    render(<SynthesisPanel {...props} isStale />);
    expect(screen.getByText("stale")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "regenerate" })).toBeInTheDocument();
  });
});

describe("BlueprintShare", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("creates the link, shows it and copies it", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ shareId: "shr4Ab9xYz", sharePath: "/share/blueprint/shr4Ab9xYz" }),
    });
    render(<BlueprintShare initialShareId={null} />);
    fireEvent.click(screen.getByRole("button", { name: "create" }));

    const input = (await screen.findByLabelText("linkLabel")) as HTMLInputElement;
    expect(input.value).toBe("http://localhost/share/blueprint/shr4Ab9xYz");
    expect(global.fetch).toHaveBeenCalledWith("/api/blueprint/share", { method: "POST" });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("http://localhost/share/blueprint/shr4Ab9xYz");
    expect(await screen.findByRole("button", { name: "copyAria" })).toHaveTextContent("copied");
  });

  it("stops sharing with DELETE", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ shareId: null }),
    });
    render(<BlueprintShare initialShareId="shr4Ab9xYz" />);
    fireEvent.click(screen.getByRole("button", { name: "stop" }));

    expect(await screen.findByRole("button", { name: "create" })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/blueprint/share", { method: "DELETE" });
  });

  it("409 asks for the synthesis first", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: "synthesis_required" }),
    });
    render(<BlueprintShare initialShareId={null} />);
    fireEvent.click(screen.getByRole("button", { name: "create" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.synthesisRequired");
  });
});
