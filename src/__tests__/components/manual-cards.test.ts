import {
  assignCard,
  buildManualCards,
  emptySlots,
  filterDeck,
  isComplete,
  nextEmptySlot,
  normalizeText,
  type DeckCard,
} from "@/components/manual/manual-cards";

const deck: DeckCard[] = [
  { id: "major_16", name: "The Tower", nameEs: "La Torre", arcana: "MAJOR", suit: null, number: 16, imageUrl: "x" },
  { id: "major_19", name: "The Sun", nameEs: "El Sol", arcana: "MAJOR", suit: null, number: 19, imageUrl: "x" },
  { id: "cups_3", name: "Three of Cups", nameEs: "Tres de Copas", arcana: "MINOR", suit: "CUPS", number: 3, imageUrl: "x" },
  { id: "cups_13", name: "Queen of Cups", nameEs: "Reina de Copas", arcana: "MINOR", suit: "CUPS", number: 13, imageUrl: "x" },
  { id: "pentacles_3", name: "Three of Pentacles", nameEs: "Tres de Oros", arcana: "MINOR", suit: "PENTACLES", number: 3, imageUrl: "x" },
  { id: "swords_1", name: "Ace of Swords", nameEs: "As de Espadas", arcana: "MINOR", suit: "SWORDS", number: 1, imageUrl: "x" },
];

const ids = (cards: DeckCard[]) => cards.map((c) => c.id);

describe("manual deck helpers (F-61)", () => {
  describe("normalizeText", () => {
    it("drops accents and case", () => {
      expect(normalizeText("  Ásí ÑANDÚ ")).toBe("asi nandu");
    });
  });

  describe("filterDeck", () => {
    it("returns everything with no query and the 'all' filter", () => {
      expect(filterDeck(deck, "", "all")).toHaveLength(deck.length);
    });

    it("matches Spanish and English names, ignoring accents and case", () => {
      expect(ids(filterDeck(deck, "torre", "all"))).toEqual(["major_16"]);
      expect(ids(filterDeck(deck, "TOWER", "all"))).toEqual(["major_16"]);
      expect(ids(filterDeck(deck, "réina", "all"))).toEqual(["cups_13"]);
    });

    it("needs every word to match and treats numbers as the card number", () => {
      expect(ids(filterDeck(deck, "3 copas", "all"))).toEqual(["cups_3"]);
      expect(ids(filterDeck(deck, "3", "all"))).toEqual(["cups_3", "pentacles_3"]);
      // "1" is the Ace only, not 13 or 16
      expect(ids(filterDeck(deck, "1", "all"))).toEqual(["swords_1"]);
      expect(ids(filterDeck(deck, "16", "all"))).toEqual(["major_16"]);
    });

    it("filters by major arcana or by suit", () => {
      expect(ids(filterDeck(deck, "", "major"))).toEqual(["major_16", "major_19"]);
      expect(ids(filterDeck(deck, "", "CUPS"))).toEqual(["cups_3", "cups_13"]);
      expect(ids(filterDeck(deck, "tres", "PENTACLES"))).toEqual(["pentacles_3"]);
      expect(filterDeck(deck, "torre", "CUPS")).toEqual([]);
    });
  });

  describe("slots", () => {
    it("assigning a card moves it out of any other position (no repeats)", () => {
      let slots = emptySlots(3);
      slots = assignCard(slots, 0, "major_16");
      slots = assignCard(slots, 2, "major_16");
      expect(slots.map((s) => s.cardId)).toEqual([null, null, "major_16"]);
    });

    it("keeps the reversed flag of the slot when its card changes", () => {
      const slots = [{ cardId: "major_16", isReversed: true }, { cardId: null, isReversed: false }];
      expect(assignCard(slots, 0, "major_19")[0]).toEqual({ cardId: "major_19", isReversed: true });
    });

    it("finds the next empty slot, wrapping around", () => {
      const slots = [
        { cardId: null, isReversed: false },
        { cardId: "a", isReversed: false },
        { cardId: "b", isReversed: false },
      ];
      expect(nextEmptySlot(slots, 1)).toBe(0);
      expect(nextEmptySlot(slots.map((s) => ({ ...s, cardId: s.cardId ?? "c" })), 0)).toBe(-1);
    });

    it("builds the request payload with positions 1..n once every slot has a card", () => {
      const slots = [
        { cardId: "cups_3", isReversed: true },
        { cardId: "major_19", isReversed: false },
      ];
      expect(isComplete(slots)).toBe(true);
      expect(buildManualCards(slots)).toEqual([
        { position: 1, cardId: "cups_3", isReversed: true },
        { position: 2, cardId: "major_19", isReversed: false },
      ]);
    });

    it("refuses to build a payload with an empty slot", () => {
      const slots = [{ cardId: "cups_3", isReversed: false }, { cardId: null, isReversed: false }];
      expect(isComplete(slots)).toBe(false);
      expect(() => buildManualCards(slots)).toThrow("Position 2");
    });
  });
});
