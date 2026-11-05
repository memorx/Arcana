/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/golden-cards", () => ({
  rollForGoldenCard: jest.fn().mockReturnValue(true),
  processGoldenCards: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/streak", () => ({
  updateStreak: jest.fn(),
}));
jest.mock("@/lib/collection", () => ({
  discoverCardsFromReading: jest.fn(),
}));
jest.mock("@/lib/achievements", () => ({
  checkAndUnlockAchievements: jest.fn(),
}));
jest.mock("@/lib/xp", () => ({
  addXP: jest.fn(),
}));
jest.mock("@/lib/challenges", () => ({
  updateChallengeProgress: jest.fn(),
}));

import type { Reading, SpreadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { InsufficientCreditsError } from "@/lib/credits";
import {
  buildReadingResponse,
  chargeAndCreateReading,
  drawCards,
  finalizeReading,
  type SpreadPosition,
} from "@/lib/reading-pipeline";
import { updateStreak } from "@/lib/streak";
import { discoverCardsFromReading } from "@/lib/collection";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { addXP } from "@/lib/xp";
import { updateChallengeProgress } from "@/lib/challenges";
import { processGoldenCards } from "@/lib/golden-cards";
import { getXPForReading, XP_REWARDS } from "@/lib/levels";

const deck = Array.from({ length: 78 }, (_, i) => ({ id: `card-${i}` }));

describe("drawCards", () => {
  it("draws exactly `count` cards with positions 1..count", () => {
    const draw = drawCards(deck, 10);

    expect(draw).toHaveLength(10);
    expect(draw.map((c) => c.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("never repeats a card", () => {
    for (let run = 0; run < 50; run++) {
      const draw = drawCards(deck, 10);
      expect(new Set(draw.map((c) => c.cardId)).size).toBe(10);
    }
  });

  it("can draw the whole deck", () => {
    const draw = drawCards(deck, 78);
    expect(new Set(draw.map((c) => c.cardId)).size).toBe(78);
  });

  it("only uses cards from the deck", () => {
    const ids = new Set(deck.map((c) => c.id));
    for (const card of drawCards(deck, 5)) {
      expect(ids.has(card.cardId)).toBe(true);
    }
  });

  it("rolls golden cards by default", () => {
    // rollForGoldenCard is mocked to always return true
    expect(drawCards(deck, 3).every((c) => c.isGolden)).toBe(true);
  });

  it("never returns golden cards with allowGolden: false", () => {
    expect(drawCards(deck, 3, { allowGolden: false }).some((c) => c.isGolden)).toBe(false);
  });

  it("throws when asked for more cards than the deck has", () => {
    expect(() => drawCards(deck.slice(0, 2), 3)).toThrow(RangeError);
  });
});

const spreadType = {
  id: "spread-1",
  name: "Three Cards",
  nameEs: "Tres Cartas",
  creditCost: 2,
  cardCount: 3,
} as unknown as SpreadType;

const readingCards = [
  { position: 1, cardId: "card-1", isReversed: false, isGolden: false },
  { position: 2, cardId: "card-2", isReversed: true, isGolden: false },
];

const mockTx = (updateManyCounts: number[]) => {
  const tx = {
    user: { updateMany: jest.fn() },
    reading: { create: jest.fn().mockResolvedValue({ id: "reading-1", spreadType }) },
    creditTransaction: { create: jest.fn().mockResolvedValue({}) },
  };
  for (const count of updateManyCounts) tx.user.updateMany.mockResolvedValueOnce({ count });
  (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(tx));
  return tx;
};

describe("buildReadingResponse", () => {
  const spreadType = { id: "three", name: "Three Cards", nameEs: "Tres Cartas" } as unknown as SpreadType;
  const reading = {
    id: "reading-1",
    intention: "¿Qué necesito ver?",
    interpretation: "Una lectura.",
    createdAt: new Date("2026-11-04T12:00:00Z"),
    spreadType,
  } as unknown as Reading & { spreadType: SpreadType };
  const card = (id: string) => ({
    id,
    name: id,
    nameEs: id,
    arcana: "MAJOR",
    suit: null,
    keywords: [],
    meaningUpright: "",
    meaningReversed: "",
    imageUrl: `/cards/${id}.jpg`,
  });
  const extras = {
    streak: null,
    goldenCards: [],
    newlyDiscoveredCards: [],
    unlockedAchievements: [],
    levelUp: null,
    completedChallenges: [],
  };

  it("matches each card to its position even when the spread JSON stores it as a string", () => {
    // SpreadType.positions is untyped JSON: nothing guarantees "position" is a number
    const positions = [
      { position: "1", name: "Past", nameEs: "Pasado", description: "Lo que fue" },
      { position: "2", name: "Present", nameEs: "Presente", description: "Lo que es" },
    ] as unknown as SpreadPosition[];

    const response = buildReadingResponse({
      reading,
      readingCards: [
        { position: 1, cardId: "tower", isReversed: false, isGolden: false },
        { position: 2, cardId: "star", isReversed: true, isGolden: false },
      ],
      cards: [card("tower"), card("star")] as Parameters<typeof buildReadingResponse>[0]["cards"],
      positions,
      usedFreeReading: false,
      extras,
    });

    expect(response.cards.map((c) => c.positionInfo?.nameEs)).toEqual(["Pasado", "Presente"]);
    expect(response.cards[1]).toMatchObject({ position: 2, cardId: "star", card: { id: "star" } });
  });
});

describe("chargeAndCreateReading", () => {
  const base = {
    userId: "user-1",
    spreadType,
    intention: "What should I focus on?",
    readingCards,
    interpretation: "Interpretation",
  };

  it("uses a free reading when one is left and charges no credits", async () => {
    const tx = mockTx([1]);

    const result = await chargeAndCreateReading(base);

    expect(result.usedFreeReading).toBe(true);
    expect(result.reading.id).toBe("reading-1");
    expect(tx.user.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("charges the spread cost when there are no free readings", async () => {
    const tx = mockTx([0, 1]);

    const result = await chargeAndCreateReading(base);

    expect(result.usedFreeReading).toBe(false);
    expect(tx.user.updateMany).toHaveBeenLastCalledWith({
      where: { id: "user-1", credits: { gte: 2 } },
      data: { credits: { decrement: 2 } },
    });
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: "user-1", amount: -2, type: "READING", readingId: "reading-1" },
    });
  });

  it("throws InsufficientCreditsError (rolling back) when the debit doesn't go through", async () => {
    const tx = mockTx([0, 0]);

    await expect(chargeAndCreateReading(base)).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("stores the reading with its source", async () => {
    const tx = mockTx([1]);

    await chargeAndCreateReading({ ...base, source: "manual" });

    expect(tx.reading.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        spreadTypeId: "spread-1",
        intention: base.intention,
        cards: readingCards,
        interpretation: "Interpretation",
        source: "manual",
      },
      include: { spreadType: true },
    });
  });

  it("defaults the source to app", async () => {
    const tx = mockTx([1]);

    await chargeAndCreateReading(base);

    expect(tx.reading.create.mock.calls[0][0].data.source).toBe("app");
  });
});

describe("finalizeReading", () => {
  const opts = {
    userId: "user-1",
    readingId: "reading-1",
    readingCards: [
      { position: 1, cardId: "card-1", isReversed: true, isGolden: true },
      { position: 2, cardId: "card-2", isReversed: false, isGolden: false },
    ],
    spreadType,
  };

  beforeEach(() => {
    (updateStreak as jest.Mock).mockResolvedValue({ currentStreak: 1, longestStreak: 1, reward: null });
    (processGoldenCards as jest.Mock).mockResolvedValue([{ id: "card-1", isNew: true, creditsAwarded: 3 }]);
    (discoverCardsFromReading as jest.Mock).mockResolvedValue([{ id: "card-1", name: "The Fool" }]);
    (checkAndUnlockAchievements as jest.Mock).mockResolvedValue([]);
    (addXP as jest.Mock).mockResolvedValue({
      levelUp: {
        leveledUp: true,
        newLevel: 2,
        levelDefinition: { name: "Seeker", nameEs: "Buscador", icon: "🔮" },
        creditsAwarded: 1,
      },
    });
    (updateChallengeProgress as jest.Mock).mockResolvedValue([]);
  });

  it("returns streak, golden cards, discovered cards, level up and challenges", async () => {
    const extras = await finalizeReading(opts);

    expect(extras.streak).toEqual({ currentStreak: 1, longestStreak: 1, reward: null });
    expect(processGoldenCards).toHaveBeenCalledWith("user-1", ["card-1"], "reading-1");
    expect(extras.newlyDiscoveredCards).toEqual([{ id: "card-1", name: "The Fool", isReversed: true }]);
    expect(extras.levelUp).toEqual({
      newLevel: 2,
      levelName: "Seeker",
      levelNameEs: "Buscador",
      levelIcon: "🔮",
      creditsAwarded: 1,
    });
    expect(extras.completedChallenges).toEqual([]);
  });

  it("keeps going when a step fails", async () => {
    (updateStreak as jest.Mock).mockRejectedValue(new Error("db down"));
    (processGoldenCards as jest.Mock).mockRejectedValue(new Error("db down"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const extras = await finalizeReading(opts);

    expect(extras.streak).toBeNull();
    expect(extras.goldenCards).toEqual([]);
    expect(extras.newlyDiscoveredCards).toHaveLength(1);
    expect(extras.levelUp).not.toBeNull();
    errorSpy.mockRestore();
  });

  describe("streak-day XP (F-87)", () => {
    // updateStreak writes lastReadingDate = now; simulate that so the test fails if the
    // pipeline reads the date after the streak update (the original bug).
    const givenStreak = (lastReadingDate: Date | null, currentStreak: number) => {
      const findUnique = prisma.user.findUnique as jest.Mock;
      findUnique.mockReset();
      findUnique.mockResolvedValue({ lastReadingDate });
      (updateStreak as jest.Mock).mockImplementation(async () => {
        findUnique.mockResolvedValue({ lastReadingDate: new Date() });
        return { currentStreak, longestStreak: currentStreak, reward: null };
      });
    };
    // spreadType has 3 cards; one card is discovered, no achievements.
    const base = getXPForReading(spreadType.cardCount) + XP_REWARDS.NEW_CARD;

    it("adds STREAK_DAY when the last reading was yesterday and the streak is now 2", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      givenStreak(yesterday, 2);

      await finalizeReading(opts);

      expect(addXP).toHaveBeenCalledWith("user-1", base + XP_REWARDS.STREAK_DAY, "reading_completion");
    });

    it("does not add STREAK_DAY for a second reading on the same day", async () => {
      givenStreak(new Date(), 2);

      await finalizeReading(opts);

      expect(addXP).toHaveBeenCalledWith("user-1", base, "reading_completion");
    });

    it("does not add STREAK_DAY on day one of a streak", async () => {
      givenStreak(null, 1);

      await finalizeReading(opts);

      expect(addXP).toHaveBeenCalledWith("user-1", base, "reading_completion");
    });
  });

  it("removes duplicated completed challenges", async () => {
    const challenge = { id: "c1", key: "weekly", name: "W", nameEs: "S", icon: "⭐", creditReward: 1 };
    (updateChallengeProgress as jest.Mock).mockResolvedValue([challenge]);

    const extras = await finalizeReading(opts);

    expect(extras.completedChallenges).toEqual([challenge]);
  });
});
