import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { todayUtc } from "@/lib/systems";

/** Below this many readings the pulse is not shown (too few to be anonymous or meaningful). */
export const PULSE_MIN_READINGS = 5;
/** How many cards the pulse lists. */
export const PULSE_TOP_CARDS = 3;
/** Cache lifetime, in seconds. */
export const PULSE_REVALIDATE_SECONDS = 600;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PulseCard {
  cardId: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  /** Readings in which the card came up. */
  count: number;
  /** Share of all readings counted, 0–100, rounded. */
  percentage: number;
}

export type CollectivePulse =
  | { enough: false }
  | {
      enough: true;
      /** UTC day, "YYYY-MM-DD". */
      date: string;
      /** Daily cards of the day + spreads of the last 24 h. */
      totalReadings: number;
      top: PulseCard[];
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
 * of the spreads read in the last 24 hours. Anonymous: only counts are read,
 * never who drew what. Uncached; use `getCollectivePulse` in pages and routes.
 */
export async function computeCollectivePulse(
  today: Date = todayUtc(),
  now: Date = new Date(),
): Promise<CollectivePulse> {
  const [dailyGroups, readings] = await Promise.all([
    prisma.dailyReading.groupBy({
      by: ["cardId"],
      where: { date: today },
      _count: true,
    }),
    prisma.reading.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
      select: { cards: true },
    }),
  ]);

  const counts = new Map<string, number>();
  let totalReadings = 0;

  for (const group of dailyGroups) {
    const n = typeof group._count === "number" ? group._count : 0;
    if (n <= 0) continue;
    counts.set(group.cardId, (counts.get(group.cardId) ?? 0) + n);
    totalReadings += n;
  }

  for (const reading of readings) {
    const ids = cardIdsOf(reading.cards);
    if (ids.length === 0) continue;
    totalReadings += 1;
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  if (totalReadings < PULSE_MIN_READINGS) return { enough: false };

  const ranked = [...counts.entries()]
    .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB))
    .slice(0, PULSE_TOP_CARDS);

  const cards = await prisma.card.findMany({
    where: { id: { in: ranked.map(([id]) => id) } },
    select: { id: true, name: true, nameEs: true, imageUrl: true },
  });
  const byId = new Map(cards.map((card) => [card.id, card]));

  const top: PulseCard[] = [];
  for (const [cardId, count] of ranked) {
    const card = byId.get(cardId);
    if (!card) continue; // a deleted card id in old JSON
    top.push({
      cardId,
      name: card.name,
      nameEs: card.nameEs,
      imageUrl: card.imageUrl,
      count,
      percentage: Math.round((count / totalReadings) * 100),
    });
  }

  if (top.length === 0) return { enough: false };

  return { enough: true, date: isoDay(today), totalReadings, top };
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
