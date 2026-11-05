import { prisma } from "@/lib/prisma";

/**
 * "Mi historia": personal analytics computed from `Reading.cards` (JSON).
 * Month and day boundaries use UTC fields, like the rest of the date logic.
 */

export type SuitKey = "MAJOR" | "WANDS" | "CUPS" | "SWORDS" | "PENTACLES";
export const SUIT_KEYS: readonly SuitKey[] = ["MAJOR", "WANDS", "CUPS", "SWORDS", "PENTACLES"];

/** Window for recurring cards, suits and reversed rate. */
export const INSIGHTS_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_CARDS = 6;
const MONTHS_SHOWN = 12;

export interface StoredReadingCard {
  position: number;
  cardId: string;
  isReversed: boolean;
  isGolden: boolean;
}

/** Reads `Reading.cards` defensively: anything that isn't a card entry is skipped. */
export function parseReadingCards(value: unknown): StoredReadingCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.cardId !== "string" || !entry.cardId) return [];
    return [
      {
        position: Number(entry.position) || 0,
        cardId: entry.cardId,
        isReversed: entry.isReversed === true,
        isGolden: entry.isGolden === true,
      },
    ];
  });
}

export interface SpreadPositionName {
  position: number;
  name: string;
  nameEs: string;
}

/** Reads `SpreadType.positions` (JSON) defensively. */
export function parseSpreadPositions(value: unknown): SpreadPositionName[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    return [
      {
        position: Number(entry.position) || 0,
        name: typeof entry.name === "string" ? entry.name : "",
        nameEs: typeof entry.nameEs === "string" ? entry.nameEs : "",
      },
    ];
  });
}

export interface CardTally {
  cardId: string;
  count: number;
  reversedCount: number;
  /** Timestamp of the most recent reading where the card came up (tie-breaker). */
  lastSeen: number;
}

/** Counts how often each card came up. Sorted by count, then most recent, then id. */
export function tallyCards(readings: { createdAt: Date; cards: unknown }[]): CardTally[] {
  const tallies = new Map<string, CardTally>();
  for (const reading of readings) {
    const seenAt = new Date(reading.createdAt).getTime();
    for (const card of parseReadingCards(reading.cards)) {
      const tally = tallies.get(card.cardId) ?? { cardId: card.cardId, count: 0, reversedCount: 0, lastSeen: 0 };
      tally.count += 1;
      if (card.isReversed) tally.reversedCount += 1;
      tally.lastSeen = Math.max(tally.lastSeen, seenAt);
      tallies.set(card.cardId, tally);
    }
  }
  return [...tallies.values()].sort(
    (a, b) => b.count - a.count || b.lastSeen - a.lastSeen || a.cardId.localeCompare(b.cardId)
  );
}

/**
 * Whole-number percentages that add up to exactly 100 (largest remainder).
 * With no data every value is 0.
 */
export function toPercentages<K extends string>(counts: Record<K, number>): Record<K, number> {
  const keys = Object.keys(counts) as K[];
  const total = keys.reduce((sum, key) => sum + counts[key], 0);
  const result = {} as Record<K, number>;
  if (total <= 0) {
    for (const key of keys) result[key] = 0;
    return result;
  }

  // Integer arithmetic: floating-point remainders would break ties unpredictably.
  const parts = keys.map((key, index) => {
    const scaled = counts[key] * 100;
    return { key, index, floor: Math.floor(scaled / total), remainder: scaled % total };
  });
  for (const part of parts) result[part.key] = part.floor;

  let missing = 100 - parts.reduce((sum, part) => sum + part.floor, 0);
  const byRemainder = [...parts].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const part of byRemainder) {
    if (missing <= 0) break;
    result[part.key] += 1;
    missing -= 1;
  }
  return result;
}

/** First instant of the UTC month of `date`, shifted by `offset` months. */
export function utcMonthStart(date: Date, offset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

export interface InsightsCardInfo {
  id: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: "MAJOR" | "MINOR";
  suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
}

export interface InsightsCard {
  cardId: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: "MAJOR" | "MINOR";
  suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
  count: number;
  reversedCount: number;
}

export interface MonthCount {
  year: number;
  /** 1–12 */
  month: number;
  count: number;
}

export interface UserInsights {
  totalReadings: number;
  /** Last 12 UTC months, oldest first, current month last. */
  byMonth: MonthCount[];
  /** Top 6 cards of the last 90 days. */
  topCards: InsightsCard[];
  /** Share of the cards drawn in the last 90 days, in whole percentages (sum 100, or all 0). */
  suits: Record<SuitKey, number>;
  /** Percentage (0–100) of the cards drawn in the last 90 days that came up reversed. */
  reversedRate: number;
  resonance: { count: number; average: number | null };
  /** Most frequent card of the current UTC month. */
  cardOfTheMonth: InsightsCard | null;
}

export const CARD_INFO_SELECT = {
  id: true,
  name: true,
  nameEs: true,
  imageUrl: true,
  arcana: true,
  suit: true,
  number: true,
} as const;

function toInsightsCard(tally: CardTally, info: InsightsCardInfo): InsightsCard {
  return {
    cardId: tally.cardId,
    name: info.name,
    nameEs: info.nameEs,
    imageUrl: info.imageUrl,
    arcana: info.arcana,
    suit: info.suit,
    number: info.number,
    count: tally.count,
    reversedCount: tally.reversedCount,
  };
}

/** Top cards with their card data; cards missing from the catalog are skipped. */
function withCardInfo(tallies: CardTally[], cards: Map<string, InsightsCardInfo>, limit: number): InsightsCard[] {
  const result: InsightsCard[] = [];
  for (const tally of tallies) {
    const info = cards.get(tally.cardId);
    if (!info) continue;
    result.push(toInsightsCard(tally, info));
    if (result.length >= limit) break;
  }
  return result;
}

export interface ComputeInsightsInput {
  totalReadings: number;
  /** Readings of (at least) the last 12 months. */
  readings: { createdAt: Date; cards: unknown }[];
  cards: Map<string, InsightsCardInfo>;
  resonance: { count: number; average: number | null };
  now: Date;
}

/** Pure part of the insights: everything except the queries. */
export function computeInsights(input: ComputeInsightsInput): UserInsights {
  const { readings, cards, now } = input;

  // Month by month, oldest first
  const firstMonth = utcMonthStart(now, -(MONTHS_SHOWN - 1));
  const byMonth: MonthCount[] = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const start = utcMonthStart(firstMonth, i);
    return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, count: 0 };
  });
  for (const reading of readings) {
    const date = new Date(reading.createdAt);
    const slot = byMonth.find(
      (m) => m.year === date.getUTCFullYear() && m.month === date.getUTCMonth() + 1
    );
    if (slot) slot.count += 1;
  }

  // Last 90 days: recurring cards, suits and reversed rate
  const windowStart = now.getTime() - INSIGHTS_WINDOW_DAYS * DAY_MS;
  const recent = readings.filter((r) => new Date(r.createdAt).getTime() >= windowStart);
  const recentTallies = tallyCards(recent);

  const suitCounts: Record<SuitKey, number> = { MAJOR: 0, WANDS: 0, CUPS: 0, SWORDS: 0, PENTACLES: 0 };
  let drawn = 0;
  let reversed = 0;
  for (const tally of recentTallies) {
    drawn += tally.count;
    reversed += tally.reversedCount;
    const info = cards.get(tally.cardId);
    if (!info) continue;
    const suit: SuitKey | null = info.arcana === "MAJOR" ? "MAJOR" : info.suit;
    if (suit) suitCounts[suit] += tally.count;
  }

  // Current month
  const monthStart = utcMonthStart(now).getTime();
  const thisMonth = readings.filter((r) => new Date(r.createdAt).getTime() >= monthStart);
  const [cardOfTheMonth] = withCardInfo(tallyCards(thisMonth), cards, 1);

  return {
    totalReadings: input.totalReadings,
    byMonth,
    topCards: withCardInfo(recentTallies, cards, TOP_CARDS),
    suits: toPercentages(suitCounts),
    reversedRate: drawn > 0 ? Math.round((reversed * 100) / drawn) : 0,
    resonance: input.resonance,
    cardOfTheMonth: cardOfTheMonth ?? null,
  };
}

async function loadCardInfo(readings: { cards: unknown }[]): Promise<Map<string, InsightsCardInfo>> {
  const ids = [...new Set(readings.flatMap((r) => parseReadingCards(r.cards).map((c) => c.cardId)))];
  if (ids.length === 0) return new Map();
  const rows = await prisma.card.findMany({
    where: { id: { in: ids } },
    select: CARD_INFO_SELECT,
  });
  return new Map(rows.map((row) => [row.id, row]));
}

/** Everything `GET /api/insights` and the "Mi historia" page show. */
export async function getUserInsights(userId: string, now: Date = new Date()): Promise<UserInsights> {
  const since = utcMonthStart(now, -(MONTHS_SHOWN - 1));

  const [totalReadings, readings, resonance] = await Promise.all([
    prisma.reading.count({ where: { userId } }),
    prisma.reading.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, cards: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reading.aggregate({
      where: { userId, resonance: { not: null } },
      _avg: { resonance: true },
      _count: { resonance: true },
    }),
  ]);

  const windowStart = now.getTime() - INSIGHTS_WINDOW_DAYS * DAY_MS;
  const cards = await loadCardInfo(
    readings.filter((r) => new Date(r.createdAt).getTime() >= windowStart)
  );

  const resonanceCount = resonance._count?.resonance ?? 0;
  const resonanceAverage = resonance._avg?.resonance;

  return computeInsights({
    totalReadings,
    readings,
    cards,
    resonance: {
      count: resonanceCount,
      average:
        resonanceCount > 0 && typeof resonanceAverage === "number"
          ? Math.round(resonanceAverage * 10) / 10
          : null,
    },
    now,
  });
}

/** The dashboard widget only needs the current month. */
export async function getCardOfTheMonth(
  userId: string,
  now: Date = new Date()
): Promise<{ card: InsightsCard | null; monthReadings: number }> {
  const readings = await prisma.reading.findMany({
    where: { userId, createdAt: { gte: utcMonthStart(now) } },
    select: { createdAt: true, cards: true },
  });
  if (readings.length === 0) return { card: null, monthReadings: 0 };

  const cards = await loadCardInfo(readings);
  const [card] = withCardInfo(tallyCards(readings), cards, 1);
  return { card: card ?? null, monthReadings: readings.length };
}

/**
 * Consecutive months with at least one reading, counting back from the
 * current month. The current month doesn't break the streak while it's empty
 * (it's still in progress).
 */
export function getMonthStreak(byMonth: MonthCount[]): number {
  let streak = 0;
  for (let i = byMonth.length - 1; i >= 0; i--) {
    if (byMonth[i].count > 0) {
      streak += 1;
    } else if (i === byMonth.length - 1) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}
