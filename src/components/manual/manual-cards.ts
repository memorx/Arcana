/**
 * Pure helpers for the "your own deck" flow: searching the 78 cards, the suit
 * filter, and turning the chosen slots into the POST /api/reading/manual payload.
 * No React here so they can be tested on their own.
 */

export type Suit = "WANDS" | "CUPS" | "SWORDS" | "PENTACLES";

export interface DeckCard {
  id: string;
  name: string;
  nameEs: string;
  arcana: "MAJOR" | "MINOR";
  suit: Suit | null;
  number: number;
  imageUrl: string;
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

const WIKIMEDIA_COMMONS = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/;

/**
 * Wikimedia's own resized copy of a Commons image:
 * `…/commons/a/ab/X.jpg` → `…/commons/thumb/a/ab/X.jpg/120px-X.jpg`.
 * Any other URL (or one that is already a thumbnail) comes back unchanged.
 */
export function thumbUrl(url: string, width: number): string {
  const match = WIKIMEDIA_COMMONS.exec(url);
  if (!match) return url;
  const [, base, a, ab, file] = match;
  return `${base}/thumb/${a}/${ab}/${file}/${width}px-${file}`;
}

/** Width of the card thumbnails (one of Wikimedia's standard thumbnail sizes). */
export const THUMB_WIDTH = 120;

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
