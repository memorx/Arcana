/**
 * Pure helpers for the "your own deck" flow: searching the 78 cards, the suit
 * filter, and turning the chosen slots into the POST /api/reading/manual payload.
 * No React here so they can be tested on their own.
 */
import { cartaImagen, type VarianteCarta } from "@/lib/cartas";

export type Suit = "WANDS" | "CUPS" | "SWORDS" | "PENTACLES";

export interface DeckCard {
  id: string;
  name: string;
  nameEs: string;
  arcana: "MAJOR" | "MINOR";
  suit: Suit | null;
  number: number;
}

export type DeckFilter = "all" | "major" | Suit;

export const DECK_FILTERS: DeckFilter[] = ["all", "major", "WANDS", "CUPS", "SWORDS", "PENTACLES"];

/** One position of the spread: which card came out there (if any) and whether it was reversed. */
export interface SlotChoice {
  cardId: string | null;
  isReversed: boolean;
}

export interface ManualCardPayload {
  position: number;
  cardId: string;
  isReversed: boolean;
}

/**
 * The engraving of a card in the picker, self-hosted (public/cartas): the light grey `mesa`
 * variant (≈ 12 KB) for the index of the 78, and the inked `tinta` variant once the card is
 * placed in a position of the spread.
 */
export function thumbnailOf(card: Pick<DeckCard, "name">, placed = false): string {
  const variant: VarianteCarta = placed ? "tinta" : "mesa";
  return cartaImagen(card.name, variant);
}

/** Lowercase, without accents (á→a, ñ→n) and trimmed, so "Torre", "torre" and "TÓRRE" match. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Cards matching the filter and every word of the query. Words are matched against
 * the English and Spanish names; a number matches the card's number exactly, so
 * "3 copas" finds the Three of Cups and "16" finds The Tower.
 */
export function filterDeck(cards: DeckCard[], query: string, filter: DeckFilter): DeckCard[] {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);

  return cards.filter((card) => {
    if (filter === "major" && card.arcana !== "MAJOR") return false;
    if (filter !== "all" && filter !== "major" && card.suit !== filter) return false;
    if (tokens.length === 0) return true;

    const haystack = normalizeText(`${card.name} ${card.nameEs}`);
    return tokens.every((token) =>
      /^\d+$/.test(token) ? card.number === Number(token) : haystack.includes(token)
    );
  });
}

export function emptySlots(count: number): SlotChoice[] {
  return Array.from({ length: count }, () => ({ cardId: null, isReversed: false }));
}

/** Index of the first empty slot after `from` (wrapping around), or -1 when all are filled. */
export function nextEmptySlot(slots: SlotChoice[], from: number): number {
  for (let step = 1; step <= slots.length; step++) {
    const index = (from + step) % slots.length;
    if (!slots[index].cardId) return index;
  }
  return -1;
}

/** Puts `cardId` in slot `index`. A card can only be in one slot, so it is removed from any other. */
export function assignCard(slots: SlotChoice[], index: number, cardId: string): SlotChoice[] {
  return slots.map((slot, i) => {
    if (i === index) return { ...slot, cardId };
    if (slot.cardId === cardId) return { ...slot, cardId: null };
    return slot;
  });
}

export function isComplete(slots: SlotChoice[]): boolean {
  return slots.length > 0 && slots.every((slot) => !!slot.cardId);
}

/** Body `cards` for POST /api/reading/manual (positions 1..n in slot order). */
export function buildManualCards(slots: SlotChoice[]): ManualCardPayload[] {
  return slots.map((slot, index) => {
    if (!slot.cardId) throw new Error(`Position ${index + 1} has no card`);
    return { position: index + 1, cardId: slot.cardId, isReversed: slot.isReversed };
  });
}
