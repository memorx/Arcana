/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    reading: { count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    card: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  computeInsights,
  getCardOfTheMonth,
  getMonthStreak,
  getUserInsights,
  parseReadingCards,
  tallyCards,
  toPercentages,
  type InsightsCardInfo,
} from "@/lib/insights";

const NOW = new Date("2026-11-04T12:00:00Z");

const info = (id: string, arcana: "MAJOR" | "MINOR", suit: InsightsCardInfo["suit"] = null): InsightsCardInfo => ({
  id,
  name: id,
  nameEs: `${id}-es`,
  imageUrl: `/cards/${id}.jpg`,
  arcana,
  suit,
  number: 1,
});

const catalog = new Map<string, InsightsCardInfo>([
  ["tower", info("tower", "MAJOR")],
  ["fool", info("fool", "MAJOR")],
  ["cups2", info("cups2", "MINOR", "CUPS")],
  ["wands3", info("wands3", "MINOR", "WANDS")],
  ["swords9", info("swords9", "MINOR", "SWORDS")],
  ["pent5", info("pent5", "MINOR", "PENTACLES")],
  ["cups7", info("cups7", "MINOR", "CUPS")],
  ["wands1", info("wands1", "MINOR", "WANDS")],
]);

const card = (cardId: string, isReversed = false, position = 1) => ({ position, cardId, isReversed, isGolden: false });
const reading = (iso: string, cards: ReturnType<typeof card>[]) => ({ createdAt: new Date(iso), cards });

describe("parseReadingCards", () => {
  it("keeps valid entries and skips anything else", () => {
    expect(
      parseReadingCards([card("tower", true), null, "x", { cardId: 3 }, { position: "2", cardId: "fool" }])
    ).toEqual([
      { position: 1, cardId: "tower", isReversed: true, isGolden: false },
      { position: 2, cardId: "fool", isReversed: false, isGolden: false },
    ]);
    expect(parseReadingCards({ not: "an array" })).toEqual([]);
  });
});

describe("tallyCards", () => {
  it("orders by count, then by the most recent appearance", () => {
    const tallies = tallyCards([
      reading("2026-10-01T00:00:00Z", [card("fool"), card("tower", true)]),
      reading("2026-10-20T00:00:00Z", [card("cups2"), card("tower")]),
      reading("2026-10-25T00:00:00Z", [card("cups2", true)]),
    ]);

    expect(tallies.map((t) => [t.cardId, t.count, t.reversedCount])).toEqual([
      ["cups2", 2, 1], // same count as tower, seen more recently
      ["tower", 2, 1],
      ["fool", 1, 0],
    ]);
  });
});

describe("toPercentages", () => {
  it("adds up to exactly 100", () => {
    expect(toPercentages({ a: 1, b: 1, c: 1 })).toEqual({ a: 34, b: 33, c: 33 });
    expect(toPercentages({ a: 2, b: 1 })).toEqual({ a: 67, b: 33 });
    // Equal remainders go to the first key, deterministically
    expect(toPercentages({ a: 1, b: 4, c: 1 })).toEqual({ a: 17, b: 67, c: 16 });
  });

  it("adds up to 100 for any mix of counts", () => {
    for (let run = 0; run < 200; run++) {
      const counts = {
        MAJOR: Math.floor(Math.random() * 40),
        WANDS: Math.floor(Math.random() * 40),
        CUPS: Math.floor(Math.random() * 40),
        SWORDS: Math.floor(Math.random() * 40),
        PENTACLES: Math.floor(Math.random() * 40) + 1,
      };
      const percentages = toPercentages(counts);
      expect(Object.values(percentages).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it("gives all zeros when there is no data", () => {
    expect(toPercentages({ a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
  });
});

describe("computeInsights", () => {
  const readings = [
    // November (current month)
    reading("2026-11-03T10:00:00Z", [card("tower", true), card("cups2"), card("wands3")]),
    reading("2026-11-01T10:00:00Z", [card("tower"), card("swords9", true), card("pent5")]),
    // October
    reading("2026-10-20T10:00:00Z", [card("cups2"), card("cups7"), card("fool", true)]),
    reading("2026-10-02T10:00:00Z", [card("wands1"), card("cups2"), card("tower")]),
    // More than 90 days ago (July): counts per month, not in top cards or suits
    reading("2026-07-15T10:00:00Z", [card("fool"), card("fool"), card("fool")]),
    // Older than 12 months: ignored
    reading("2025-10-15T10:00:00Z", [card("pent5")]),
  ];

  const insights = computeInsights({
    totalReadings: 9,
    readings,
    cards: catalog,
    resonance: { count: 2, average: 4.5 },
    now: NOW,
  });

  it("covers the last 12 months, oldest first", () => {
    expect(insights.byMonth).toHaveLength(12);
    expect(insights.byMonth[0]).toEqual({ year: 2025, month: 12, count: 0 });
    expect(insights.byMonth[11]).toEqual({ year: 2026, month: 11, count: 2 });
    expect(insights.byMonth.find((m) => m.month === 10 && m.year === 2026)!.count).toBe(2);
    expect(insights.byMonth.find((m) => m.month === 7)!.count).toBe(1);
    expect(insights.byMonth.reduce((sum, m) => sum + m.count, 0)).toBe(5);
  });

  it("sorts the top cards of the last 90 days by count", () => {
    expect(insights.topCards.length).toBeLessThanOrEqual(6);
    // Same count and same last reading: the id breaks the tie
    expect(insights.topCards[0]).toMatchObject({ cardId: "cups2", count: 3, reversedCount: 0, nameEs: "cups2-es" });
    expect(insights.topCards[1]).toMatchObject({ cardId: "tower", count: 3, reversedCount: 1 });
    const counts = insights.topCards.map((c) => c.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    // The three Fools from July are outside the window
    expect(insights.topCards.find((c) => c.cardId === "fool")?.count ?? 1).toBe(1);
  });

  it("gives suit percentages that add up to 100, with majors as MAJOR", () => {
    // 12 cards in the window: MAJOR 4 (tower×3, fool), CUPS 4, WANDS 2, SWORDS 1, PENTACLES 1.
    // 33.3/33.3/16.7/8.3/8.3 → the two missing points go to the largest remainders (WANDS, then MAJOR).
    expect(insights.suits).toEqual({ MAJOR: 34, CUPS: 33, WANDS: 17, SWORDS: 8, PENTACLES: 8 });
    expect(Object.values(insights.suits).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("computes the reversed rate of the last 90 days", () => {
    // 3 reversed of 12
    expect(insights.reversedRate).toBe(25);
  });

  it("picks the card of the current month", () => {
    expect(insights.cardOfTheMonth).toMatchObject({ cardId: "tower", count: 2 });
  });

  it("passes totals and resonance through", () => {
    expect(insights.totalReadings).toBe(9);
    expect(insights.resonance).toEqual({ count: 2, average: 4.5 });
  });

  it("handles a person without recent readings", () => {
    const empty = computeInsights({
      totalReadings: 0,
      readings: [],
      cards: new Map(),
      resonance: { count: 0, average: null },
      now: NOW,
    });

    expect(empty.topCards).toEqual([]);
    expect(empty.suits).toEqual({ MAJOR: 0, WANDS: 0, CUPS: 0, SWORDS: 0, PENTACLES: 0 });
    expect(empty.reversedRate).toBe(0);
    expect(empty.cardOfTheMonth).toBeNull();
  });
});

describe("getMonthStreak", () => {
  const months = (counts: number[]) => counts.map((count, i) => ({ year: 2026, month: i + 1, count }));

  it("counts consecutive months back from the current one", () => {
    expect(getMonthStreak(months([1, 0, 2, 1, 3]))).toBe(3);
  });

  it("doesn't break the streak while the current month is still empty", () => {
    expect(getMonthStreak(months([0, 2, 1, 0]))).toBe(2);
  });

  it("is zero without readings", () => {
    expect(getMonthStreak(months([0, 0, 0]))).toBe(0);
  });
});

describe("getUserInsights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries the person's readings of the last 12 months and only the cards it needs", async () => {
    (prisma.reading.count as jest.Mock).mockResolvedValue(5);
    (prisma.reading.findMany as jest.Mock).mockResolvedValue([
      reading("2026-11-03T10:00:00Z", [card("tower")]),
      reading("2026-03-03T10:00:00Z", [card("fool")]),
    ]);
    (prisma.reading.aggregate as jest.Mock).mockResolvedValue({
      _avg: { resonance: 4.3333 },
      _count: { resonance: 3 },
    });
    (prisma.card.findMany as jest.Mock).mockResolvedValue([catalog.get("tower")]);

    const insights = await getUserInsights("user-1", NOW);

    expect(prisma.reading.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect((prisma.reading.findMany as jest.Mock).mock.calls[0][0].where).toEqual({
      userId: "user-1",
      createdAt: { gte: new Date("2025-12-01T00:00:00Z") },
    });
    // The Fool from March is outside the 90-day window: no need to load it
    expect((prisma.card.findMany as jest.Mock).mock.calls[0][0].where).toEqual({ id: { in: ["tower"] } });
    expect(insights.resonance).toEqual({ count: 3, average: 4.3 });
    expect(insights.totalReadings).toBe(5);
    expect(insights.cardOfTheMonth?.cardId).toBe("tower");
  });

  it("reports no average without rated readings", async () => {
    (prisma.reading.count as jest.Mock).mockResolvedValue(0);
    (prisma.reading.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.reading.aggregate as jest.Mock).mockResolvedValue({ _avg: { resonance: null }, _count: { resonance: 0 } });

    const insights = await getUserInsights("user-1", NOW);

    expect(insights.resonance).toEqual({ count: 0, average: null });
    expect(prisma.card.findMany).not.toHaveBeenCalled();
  });
});

describe("getCardOfTheMonth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns nothing (and loads no cards) when the month has no readings", async () => {
    (prisma.reading.findMany as jest.Mock).mockResolvedValue([]);

    await expect(getCardOfTheMonth("user-1", NOW)).resolves.toEqual({ card: null, monthReadings: 0 });
    expect((prisma.reading.findMany as jest.Mock).mock.calls[0][0].where).toEqual({
      userId: "user-1",
      createdAt: { gte: new Date("2026-11-01T00:00:00Z") },
    });
    expect(prisma.card.findMany).not.toHaveBeenCalled();
  });

  it("returns the most frequent card of the month with its count", async () => {
    (prisma.reading.findMany as jest.Mock).mockResolvedValue([
      reading("2026-11-01T10:00:00Z", [card("cups2"), card("tower")]),
      reading("2026-11-03T10:00:00Z", [card("cups2", true)]),
    ]);
    (prisma.card.findMany as jest.Mock).mockResolvedValue([catalog.get("cups2"), catalog.get("tower")]);

    const result = await getCardOfTheMonth("user-1", NOW);

    expect(result.monthReadings).toBe(2);
    expect(result.card).toMatchObject({ cardId: "cups2", count: 2, reversedCount: 1, imageUrl: "/cards/cups2.jpg" });
  });
});
