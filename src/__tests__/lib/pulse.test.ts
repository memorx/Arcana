/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    dailyReading: { groupBy: jest.fn() },
    reading: { findMany: jest.fn() },
    card: { findMany: jest.fn() },
  },
}));

// unstable_cache needs Next's incremental cache; here it just runs the function
// and records how it was called.
jest.mock("next/cache", () => ({
  unstable_cache: jest.fn((fn: () => unknown) => fn),
}));

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  computeCollectivePulse,
  getCollectivePulse,
  PULSE_MIN_READINGS,
  PULSE_REVALIDATE_SECONDS,
} from "@/lib/pulse";

const mockPrisma = prisma as unknown as {
  dailyReading: { groupBy: jest.Mock };
  reading: { findMany: jest.Mock };
  card: { findMany: jest.Mock };
};
const mockCache = unstable_cache as unknown as jest.Mock;

const TODAY = new Date(Date.UTC(2026, 10, 4));
const NOW = new Date("2026-11-04T15:30:00.000Z");

const CARDS = {
  sun: { id: "card-sun", name: "The Sun", nameEs: "El Sol", imageUrl: "/sun.jpg" },
  moon: { id: "card-moon", name: "The Moon", nameEs: "La Luna", imageUrl: "/moon.jpg" },
  star: { id: "card-star", name: "The Star", nameEs: "La Estrella", imageUrl: "/star.jpg" },
  fool: { id: "card-fool", name: "The Fool", nameEs: "El Loco", imageUrl: "/fool.jpg" },
};

const spread = (...ids: string[]) => ({
  cards: ids.map((cardId, i) => ({ position: i + 1, cardId, isReversed: false, isGolden: false })),
});

describe("computeCollectivePulse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.dailyReading.groupBy.mockResolvedValue([]);
    mockPrisma.reading.findMany.mockResolvedValue([]);
    mockPrisma.card.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      Object.values(CARDS).filter((c) => where.id.in.includes(c.id))
    );
  });

  it("queries today's daily cards and the spreads of the last 24 hours, counts only", async () => {
    await computeCollectivePulse(TODAY, NOW);

    expect(mockPrisma.dailyReading.groupBy).toHaveBeenCalledWith({
      by: ["cardId"],
      where: { date: TODAY },
      _count: true,
    });
    expect(mockPrisma.reading.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: new Date("2026-11-03T15:30:00.000Z") } },
      select: { cards: true },
    });
  });

  it(`says "not enough" below ${PULSE_MIN_READINGS} readings and doesn't look up cards`, async () => {
    mockPrisma.dailyReading.groupBy.mockResolvedValue([{ cardId: "card-sun", _count: 2 }]);
    mockPrisma.reading.findMany.mockResolvedValue([spread("card-sun", "card-moon"), spread("card-star")]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse).toEqual({ enough: false });
    expect(mockPrisma.card.findMany).not.toHaveBeenCalled();
  });

  it("shows the pulse from exactly 5 readings", async () => {
    mockPrisma.dailyReading.groupBy.mockResolvedValue([{ cardId: "card-sun", _count: 3 }]);
    mockPrisma.reading.findMany.mockResolvedValue([spread("card-sun", "card-moon"), spread("card-star")]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse.enough).toBe(true);
    if (!pulse.enough) return;
    expect(pulse.totalReadings).toBe(5);
    expect(pulse.date).toBe("2026-11-04");
  });

  it("adds daily cards and spread cards, ranks the top 3 and computes the share of readings", async () => {
    mockPrisma.dailyReading.groupBy.mockResolvedValue([
      { cardId: "card-moon", _count: 2 },
      { cardId: "card-sun", _count: 1 },
    ]);
    mockPrisma.reading.findMany.mockResolvedValue([
      spread("card-sun", "card-moon", "card-star"),
      spread("card-sun", "card-fool"),
      spread("card-sun"),
      spread("card-star"),
    ]);
    // sun: 1 daily + 3 spreads = 4 · moon: 2 + 1 = 3 · star: 2 · fool: 1 · total readings: 3 + 4 = 7

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse).toEqual({
      enough: true,
      date: "2026-11-04",
      totalReadings: 7,
      top: [
        { ...pick(CARDS.sun), count: 4, percentage: 57 },
        { ...pick(CARDS.moon), count: 3, percentage: 43 },
        { ...pick(CARDS.star), count: 2, percentage: 29 },
      ],
    });
    expect(mockPrisma.card.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["card-sun", "card-moon", "card-star"] } },
      select: { id: true, name: true, nameEs: true, imageUrl: true },
    });
  });

  it("breaks ties by card id so the order is stable", async () => {
    mockPrisma.dailyReading.groupBy.mockResolvedValue([
      { cardId: "card-star", _count: 2 },
      { cardId: "card-fool", _count: 2 },
      { cardId: "card-moon", _count: 2 },
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse.enough && pulse.top.map((c) => c.cardId)).toEqual(["card-fool", "card-moon", "card-star"]);
  });

  it("counts a card once per reading and skips malformed card JSON", async () => {
    mockPrisma.reading.findMany.mockResolvedValue([
      spread("card-sun", "card-sun"),
      { cards: null },
      { cards: "not an array" },
      { cards: [{ position: 1 }, null, { cardId: 42 }] },
      spread("card-moon"),
      spread("card-moon"),
      spread("card-moon"),
      spread("card-star"),
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse.enough).toBe(true);
    if (!pulse.enough) return;
    // Only the 5 readings with valid cards count
    expect(pulse.totalReadings).toBe(5);
    // The repeated Sun counts once: it ties with the Star and goes after it
    expect(pulse.top.map((c) => [c.cardId, c.count, c.percentage])).toEqual([
      ["card-moon", 3, 60],
      ["card-star", 1, 20],
      ["card-sun", 1, 20],
    ]);
  });

  it("drops card ids that no longer exist", async () => {
    mockPrisma.dailyReading.groupBy.mockResolvedValue([
      { cardId: "card-gone", _count: 4 },
      { cardId: "card-sun", _count: 1 },
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse.enough && pulse.top.map((c) => c.cardId)).toEqual(["card-sun"]);
  });

  it("returns only counts and card data, nothing about who read", async () => {
    mockPrisma.dailyReading.groupBy.mockResolvedValue([{ cardId: "card-sun", _count: 5 }]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(JSON.stringify(pulse)).not.toMatch(/user|intention|email/i);
  });
});

describe("getCollectivePulse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.dailyReading.groupBy.mockResolvedValue([{ cardId: "card-sun", _count: 6 }]);
    mockPrisma.reading.findMany.mockResolvedValue([]);
    mockPrisma.card.findMany.mockResolvedValue([CARDS.sun]);
  });

  it("caches for 10 minutes with the UTC day in the key", async () => {
    const pulse = await getCollectivePulse(TODAY);

    expect(PULSE_REVALIDATE_SECONDS).toBe(600);
    expect(mockCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["collective-pulse", "2026-11-04"],
      expect.objectContaining({ revalidate: 600 })
    );
    expect(pulse).toMatchObject({ enough: true, date: "2026-11-04", totalReadings: 6 });
    expect(mockPrisma.dailyReading.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { date: TODAY } })
    );
  });

  it("uses a different key on a different day", async () => {
    await getCollectivePulse(new Date(Date.UTC(2026, 10, 5)));

    expect(mockCache.mock.calls[0][1]).toEqual(["collective-pulse", "2026-11-05"]);
  });
});

function pick(card: { id: string; name: string; nameEs: string; imageUrl: string }) {
  return { cardId: card.id, name: card.name, nameEs: card.nameEs, imageUrl: card.imageUrl };
}
