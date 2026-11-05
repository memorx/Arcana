/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    dailyReading: { findMany: jest.fn() },
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
  PULSE_MIN_PEOPLE,
  PULSE_REVALIDATE_SECONDS,
} from "@/lib/pulse";

const mockPrisma = prisma as unknown as {
  dailyReading: { findMany: jest.Mock };
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

const daily = (userId: string, cardId: string) => ({ userId, cardId });
const spread = (userId: string, ...ids: string[]) => ({
  userId,
  cards: ids.map((cardId, i) => ({ position: i + 1, cardId, isReversed: false, isGolden: false })),
});
const publicCard = (card: (typeof CARDS)[keyof typeof CARDS], percent: number) => ({
  name: card.name,
  nameEs: card.nameEs,
  imageUrl: card.imageUrl,
  percent,
});

describe("computeCollectivePulse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.dailyReading.findMany.mockResolvedValue([]);
    mockPrisma.reading.findMany.mockResolvedValue([]);
    mockPrisma.card.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      Object.values(CARDS).filter((c) => where.id.in.includes(c.id))
    );
  });

  it("reads today's daily cards and the app's spreads of the last 24 hours", async () => {
    await computeCollectivePulse(TODAY, NOW);

    expect(mockPrisma.dailyReading.findMany).toHaveBeenCalledWith({
      where: { date: TODAY },
      select: { userId: true, cardId: true },
    });
    expect(mockPrisma.reading.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: new Date("2026-11-03T15:30:00.000Z") }, source: "app" },
      select: { userId: true, cards: true },
    });
  });

  it("leaves manual spreads (drawn with a physical deck) out of the threshold and the shares", async () => {
    type Row = ReturnType<typeof spread> & { source: string };
    const rows: Row[] = [
      { ...spread("u1", "card-sun"), source: "app" },
      { ...spread("u2", "card-sun"), source: "app" },
      { ...spread("u3", "card-moon"), source: "app" },
      { ...spread("u4", "card-moon"), source: "app" },
      { ...spread("u5", "card-star", "card-moon"), source: "manual" },
    ];
    // Fake table: applies the source filter the way the database would
    mockPrisma.reading.findMany.mockImplementation(
      async ({ where }: { where: { source?: string; NOT?: { source?: string } } }) =>
        rows.filter(
          (r) => (where.source === undefined || r.source === where.source) && r.source !== where.NOT?.source
        )
    );

    // Four people in the app plus one manual spread: still not enough
    expect(await computeCollectivePulse(TODAY, NOW)).toEqual({ enough: false });

    // A fifth person in the app: the manual spread still adds nothing to the shares
    rows.push({ ...spread("u6", "card-sun"), source: "app" });
    expect(await computeCollectivePulse(TODAY, NOW)).toEqual({
      enough: true,
      date: "2026-11-04",
      cards: [publicCard(CARDS.sun, 60), publicCard(CARDS.moon, 40)],
    });
  });

  it(`needs ${PULSE_MIN_PEOPLE} different people, not ${PULSE_MIN_PEOPLE} readings`, async () => {
    // 8 readings, but only 4 people
    mockPrisma.dailyReading.findMany.mockResolvedValue([
      daily("u1", "card-sun"),
      daily("u2", "card-sun"),
      daily("u3", "card-moon"),
    ]);
    mockPrisma.reading.findMany.mockResolvedValue([
      spread("u1", "card-sun"),
      spread("u1", "card-star"),
      spread("u2", "card-moon"),
      spread("u4", "card-fool"),
      spread("u4", "card-sun"),
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse).toEqual({ enough: false });
    expect(mockPrisma.card.findMany).not.toHaveBeenCalled();
  });

  it("counts people across both sources and shows the pulse from 5", async () => {
    mockPrisma.dailyReading.findMany.mockResolvedValue([daily("u1", "card-sun"), daily("u2", "card-sun")]);
    mockPrisma.reading.findMany.mockResolvedValue([
      spread("u3", "card-moon"),
      spread("u4", "card-star"),
      spread("u5", "card-sun"),
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse).toMatchObject({ enough: true, date: "2026-11-04" });
  });

  it("ranks the top 3 and gives each one's share of the readings, without counts", async () => {
    mockPrisma.dailyReading.findMany.mockResolvedValue([
      daily("u1", "card-moon"),
      daily("u2", "card-moon"),
      daily("u3", "card-sun"),
    ]);
    mockPrisma.reading.findMany.mockResolvedValue([
      spread("u4", "card-sun", "card-moon", "card-star"),
      spread("u5", "card-sun", "card-fool"),
      spread("u5", "card-sun"),
      spread("u1", "card-star"),
    ]);
    // sun: 1 daily + 3 spreads = 4 · moon: 2 + 1 = 3 · star: 2 · fool: 1 · 7 readings

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse).toEqual({
      enough: true,
      date: "2026-11-04",
      cards: [publicCard(CARDS.sun, 57), publicCard(CARDS.moon, 43), publicCard(CARDS.star, 29)],
    });
    expect(mockPrisma.card.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["card-sun", "card-moon", "card-star"] } },
      select: { id: true, name: true, nameEs: true, imageUrl: true },
    });
  });

  it("returns no ids, counts, totals or anything about who read", async () => {
    mockPrisma.dailyReading.findMany.mockResolvedValue(
      ["u1", "u2", "u3", "u4", "u5"].map((u) => daily(u, "card-sun"))
    );

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse.enough).toBe(true);
    if (!pulse.enough) return;
    expect(Object.keys(pulse).sort()).toEqual(["cards", "date", "enough"]);
    expect(Object.keys(pulse.cards[0]).sort()).toEqual(["imageUrl", "name", "nameEs", "percent"]);
    expect(JSON.stringify(pulse)).not.toMatch(/user|u1|count|total|card-sun/i);
  });

  it("breaks ties by card id so the order is stable", async () => {
    mockPrisma.dailyReading.findMany.mockResolvedValue([
      daily("u1", "card-star"),
      daily("u2", "card-fool"),
      daily("u3", "card-moon"),
      daily("u4", "card-star"),
      daily("u5", "card-fool"),
      daily("u6", "card-moon"),
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse.enough && pulse.cards.map((c) => c.name)).toEqual(["The Fool", "The Moon", "The Star"]);
  });

  it("counts a card once per reading and skips readings with malformed card JSON", async () => {
    mockPrisma.reading.findMany.mockResolvedValue([
      spread("u1", "card-sun", "card-sun"),
      { userId: "u9", cards: null },
      { userId: "u9", cards: "not an array" },
      { userId: "u9", cards: [{ position: 1 }, null, { cardId: 42 }] },
      spread("u2", "card-moon"),
      spread("u3", "card-moon"),
      spread("u4", "card-moon"),
      spread("u5", "card-star"),
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    // u9 only had broken readings: 5 people, 5 readings
    expect(pulse.enough).toBe(true);
    if (!pulse.enough) return;
    // The repeated Sun counts once: it ties with the Star and goes after it
    expect(pulse.cards.map((c) => [c.name, c.percent])).toEqual([
      ["The Moon", 60],
      ["The Star", 20],
      ["The Sun", 20],
    ]);
  });

  it("doesn't count people whose only readings are broken", async () => {
    mockPrisma.reading.findMany.mockResolvedValue([
      spread("u1", "card-sun"),
      spread("u2", "card-sun"),
      spread("u3", "card-sun"),
      spread("u4", "card-sun"),
      { userId: "u5", cards: [] },
    ]);

    expect(await computeCollectivePulse(TODAY, NOW)).toEqual({ enough: false });
  });

  it("drops card ids that no longer exist", async () => {
    mockPrisma.dailyReading.findMany.mockResolvedValue([
      daily("u1", "card-gone"),
      daily("u2", "card-gone"),
      daily("u3", "card-gone"),
      daily("u4", "card-gone"),
      daily("u5", "card-sun"),
    ]);

    const pulse = await computeCollectivePulse(TODAY, NOW);

    expect(pulse.enough && pulse.cards.map((c) => c.name)).toEqual(["The Sun"]);
  });
});

describe("getCollectivePulse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.dailyReading.findMany.mockResolvedValue(
      ["u1", "u2", "u3", "u4", "u5", "u6"].map((u) => daily(u, "card-sun"))
    );
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
    expect(pulse).toEqual({ enough: true, date: "2026-11-04", cards: [publicCard(CARDS.sun, 100)] });
    expect(mockPrisma.dailyReading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { date: TODAY } })
    );
  });

  it("uses a different key on a different day", async () => {
    await getCollectivePulse(new Date(Date.UTC(2026, 10, 5)));

    expect(mockCache.mock.calls[0][1]).toEqual(["collective-pulse", "2026-11-05"]);
  });
});
