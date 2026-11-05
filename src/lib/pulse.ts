import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { todayUtc } from "@/lib/systems";

/**
 * The pulse is shown only when at least this many different people read in
 * the window (today's daily cards + spreads of the last 24 h). Below that a
 * single person's cards would be recognisable.
 */
export const PULSE_MIN_PEOPLE = 5;
/** How many cards the pulse lists. */
export const PULSE_TOP_CARDS = 3;
/** Cache lifetime, in seconds. */
export const PULSE_REVALIDATE_SECONDS = 600;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Public shape: no counts, no totals, no ids. */
export interface PulseCard {
  name: string;
  nameEs: string;
  imageUrl: string;
  /** Share of the window's readings in which the card came up, 0–100, rounded. */
  percent: number;
}

export type CollectivePulse =
  | { enough: false }
  | {
      enough: true;
      /** UTC day, "YYYY-MM-DD". */
      date: string;
      cards: PulseCard[];
    };

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Card ids in a `Reading.cards` JSON value, each at most once; anything malformed is skipped. */
function cardIdsOf(cards: unknown): string[] {
  if (!Array.isArray(cards)) return [];
  const ids = new Set<string>();
  for (const item of cards) {
    if (item && typeof item === "object" && "cardId" in item) {
      const id = (item as { cardId: unknown }).cardId;
      if (typeof id === "string" && id.length > 0) ids.add(id);
    }
  }
  return [...ids];
}

/**
 * The cards that came up most in Arcana: today's daily cards plus every card
 * of the spreads read in the last 24 hours. User ids are read only to count
 * how many different people there are; the result has no ids and no counts.
 * Uncached; use `getCollectivePulse` in pages and routes.
 */
export async function computeCollectivePulse(
  today: Date = todayUtc(),
  now: Date = new Date(),
): Promise<CollectivePulse> {
  const [dailyReadings, readings] = await Promise.all([
    prisma.dailyReading.findMany({
      where: { date: today },
      select: { userId: true, cardId: true },
    }),
    prisma.reading.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
      select: { userId: true, cards: true },
    }),
  ]);

  const counts = new Map<string, number>();
  const people = new Set<string>();
  let totalReadings = 0;

  const count = (cardId: string) => counts.set(cardId, (counts.get(cardId) ?? 0) + 1);

  for (const daily of dailyReadings) {
    if (!daily.cardId) continue;
    people.add(daily.userId);
    totalReadings += 1;
    count(daily.cardId);
  }

  for (const reading of readings) {
    const ids = cardIdsOf(reading.cards);
    if (ids.length === 0) continue;
    people.add(reading.userId);
    totalReadings += 1;
    ids.forEach(count);
  }

  if (people.size < PULSE_MIN_PEOPLE) return { enough: false };

  const ranked = [...counts.entries()]
    .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB))
    .slice(0, PULSE_TOP_CARDS);

  const found = await prisma.card.findMany({
    where: { id: { in: ranked.map(([id]) => id) } },
    select: { id: true, name: true, nameEs: true, imageUrl: true },
  });
  const byId = new Map(found.map((card) => [card.id, card]));

  const cards: PulseCard[] = [];
  for (const [cardId, n] of ranked) {
    const card = byId.get(cardId);
    if (!card) continue; // a deleted card id in old JSON
    cards.push({
      name: card.name,
      nameEs: card.nameEs,
      imageUrl: card.imageUrl,
      percent: Math.round((n / totalReadings) * 100),
    });
  }

  if (cards.length === 0) return { enough: false };

  return { enough: true, date: isoDay(today), cards };
}

/**
 * `computeCollectivePulse`, cached for 10 minutes per UTC day. The day is part
 * of the cache key, so the pulse starts fresh at 00:00 UTC.
 */
export function getCollectivePulse(today: Date = todayUtc()): Promise<CollectivePulse> {
  const day = isoDay(today);
  return unstable_cache(
    () => computeCollectivePulse(new Date(`${day}T00:00:00.000Z`)),
    ["collective-pulse", day],
    { revalidate: PULSE_REVALIDATE_SECONDS, tags: ["collective-pulse"] },
  )();
}
