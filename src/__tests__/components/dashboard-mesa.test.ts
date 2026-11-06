jest.mock("@/lib/prisma", () => ({
  prisma: { card: { findMany: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { CARTAS, slugCarta } from "@/lib/cartas";
import {
  cartasDeLectura,
  MAX_GRABADOS_MESA,
  MESA_FIJA,
  nombresDeCartas,
  slugsParaMesa,
} from "@/components/dashboard/mesa";

const findCards = prisma.card.findMany as jest.Mock;

describe("la mesa de grabados del dashboard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("the fixed table is 16 real engravings, all different", () => {
    expect(MESA_FIJA).toHaveLength(MAX_GRABADOS_MESA);
    expect(new Set(MESA_FIJA).size).toBe(MESA_FIJA.length);
    const slugs = new Set(CARTAS.map((c) => c.slug));
    for (const slug of MESA_FIJA) {
      expect(slugs.has(slug)).toBe(true);
      expect(slugCarta(slug)).toBe(slug);
    }
  });

  it("puts the recent cards first, without repeats, and completes with the fixed table up to 16", () => {
    const slugs = slugsParaMesa(["The Star", "The Star", "Two of Cups", "not a card", "", "The Fool"]);
    expect(slugs.slice(0, 3)).toEqual(["rws-tarot-17-star", "cups02", "rws-tarot-00-fool"]);
    expect(slugs).toHaveLength(MAX_GRABADOS_MESA);
    expect(new Set(slugs).size).toBe(MAX_GRABADOS_MESA);
    // The fixed ones that were already used are not repeated
    expect(slugs.filter((s) => s === "rws-tarot-00-fool")).toHaveLength(1);
  });

  it("never returns more than 16, whatever the history or the requested size", () => {
    const todas = CARTAS.map((c) => c.name);
    expect(slugsParaMesa(todas)).toHaveLength(16);
    expect(slugsParaMesa(todas, 40)).toHaveLength(16);
    expect(slugsParaMesa(todas, 8)).toEqual(CARTAS.slice(0, 8).map((c) => c.slug));
    expect(slugsParaMesa([], 0)).toEqual([]);
  });

  it("without history it is exactly the fixed table", () => {
    expect(slugsParaMesa([])).toEqual([...MESA_FIJA]);
  });

  it("reads the card names in one query, only for the ids of those readings", async () => {
    findCards.mockResolvedValue([
      { id: "c1", name: "The Star" },
      { id: "c2", name: "Death" },
    ]);
    const nombres = await nombresDeCartas([
      { cards: [{ position: 0, cardId: "c1" }, { position: 1, cardId: "c2" }] },
      { cards: [{ position: 0, cardId: "c1" }, { nada: true }] },
      { cards: null },
    ]);
    expect(findCards).toHaveBeenCalledTimes(1);
    expect(findCards).toHaveBeenCalledWith({ where: { id: { in: ["c1", "c2"] } }, select: { id: true, name: true } });
    expect(nombres.get("c2")).toBe("Death");
  });

  it("does not query without cards, and survives a failed query", async () => {
    expect((await nombresDeCartas([{ cards: [] }])).size).toBe(0);
    expect(findCards).not.toHaveBeenCalled();

    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    findCards.mockRejectedValue(new Error("db down"));
    expect((await nombresDeCartas([{ cards: [{ position: 0, cardId: "x" }] }])).size).toBe(0);
    error.mockRestore();
  });

  it("lists the cards of a reading by position, skipping unknown ids", () => {
    const nombres = new Map([
      ["a", "The Moon"],
      ["b", "The Sun"],
    ]);
    expect(
      cartasDeLectura(
        [
          { position: 2, cardId: "b", isReversed: true },
          { position: 0, cardId: "a" },
          { position: 1, cardId: "zz" },
        ],
        nombres
      )
    ).toEqual([
      { cardId: "a", name: "The Moon", isReversed: false },
      { cardId: "b", name: "The Sun", isReversed: true },
    ]);
  });
});
