/**
 * @jest-environment node
 */
import { POST } from "@/app/api/reading/route";
import { NextRequest } from "next/server";
import { AIRefusalError, AIUnavailableError } from "@/lib/ai/config";

// Mock rate limit
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 9, resetIn: 60000 }),
  rateLimitResponse: jest.fn(),
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    spreadType: {
      findUnique: jest.fn(),
    },
    card: {
      findMany: jest.fn(),
    },
    reading: {
      create: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock Anthropic
jest.mock("@/lib/anthropic", () => ({
  generateTarotInterpretation: jest.fn().mockResolvedValue("Test interpretation"),
}));

// Mock reading memory (F-50; covered in reading-memory.test.ts and reading-history.test.ts)
jest.mock("@/lib/reading-memory", () => ({
  buildHistoryContext: jest.fn().mockResolvedValue(undefined),
}));

// Mock streak
jest.mock("@/lib/streak", () => ({
  updateStreak: jest.fn().mockResolvedValue({ currentStreak: 1, longestStreak: 1, reward: null }),
}));

// Mock the rest of the post-reading steps so the response is deterministic
jest.mock("@/lib/golden-cards", () => ({
  rollForGoldenCard: jest.fn().mockReturnValue(false),
  processGoldenCards: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/collection", () => ({
  discoverCardsFromReading: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/achievements", () => ({
  checkAndUnlockAchievements: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/xp", () => ({
  addXP: jest.fn().mockResolvedValue({ xpAdded: 10, totalXP: 10, currentLevel: 1, levelUp: null }),
}));
jest.mock("@/lib/challenges", () => ({
  updateChallengeProgress: jest.fn().mockResolvedValue([]),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTarotInterpretation } from "@/lib/anthropic";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGenerate = generateTarotInterpretation as jest.Mock;

const threeCardSpread = {
  id: "test-spread",
  name: "Three Cards",
  nameEs: "Tres Cartas",
  creditCost: 1,
  cardCount: 3,
  positions: [
    { position: 1, name: "Past", nameEs: "Pasado", description: "Past" },
    { position: 2, name: "Present", nameEs: "Presente", description: "Present" },
    { position: 3, name: "Future", nameEs: "Futuro", description: "Future" },
  ],
};

const deck = [
  { id: "card-1", name: "The Fool", nameEs: "El Loco", keywords: [], arcana: "MAJOR", suit: null, imageUrl: "/cards/fool.jpg", meaningUpright: "New beginnings", meaningReversed: "Recklessness" },
  { id: "card-2", name: "The Magician", nameEs: "El Mago", keywords: [], arcana: "MAJOR", suit: null, imageUrl: "/cards/magician.jpg", meaningUpright: "Manifestation", meaningReversed: "Manipulation" },
  { id: "card-3", name: "High Priestess", nameEs: "La Sacerdotisa", keywords: [], arcana: "MAJOR", suit: null, imageUrl: "/cards/priestess.jpg", meaningUpright: "Intuition", meaningReversed: "Secrets" },
];

/** Transaction client whose conditional updates return the given counts, in call order. */
const mockTransaction = (updateManyCounts: number[]) => {
  const tx = {
    reading: {
      create: jest.fn().mockResolvedValue({
        id: "reading-123",
        intention: "What should I focus on today?",
        interpretation: "Test interpretation",
        createdAt: new Date(),
        spreadType: { name: "Three Cards", nameEs: "Tres Cartas" },
      }),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
  for (const count of updateManyCounts) {
    tx.user.updateMany.mockResolvedValueOnce({ count });
  }
  tx.user.updateMany.mockResolvedValue({ count: 0 });

  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(tx));
  return tx;
};

describe("POST /api/reading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerate.mockResolvedValue("Test interpretation");
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/reading", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  const validBody = {
    spreadTypeId: "test-spread",
    intention: "What should I focus on today?",
  };

  const givenUser = (freeReadingsLeft: number, credits: number) => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      freeReadingsLeft,
      credits,
    });
    (mockPrisma.spreadType.findUnique as jest.Mock).mockResolvedValue(threeCardSpread);
    (mockPrisma.card.findMany as jest.Mock).mockResolvedValue(deck);
  };

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest({
      spreadTypeId: "test-spread",
      intention: "What should I focus on?",
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 if spreadTypeId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const request = createRequest({ intention: "What should I focus on?" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 if intention is too short", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const request = createRequest({
      spreadTypeId: "test-spread",
      intention: "Hi",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 403 if user has no credits", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      freeReadingsLeft: 0,
      credits: 0,
    });

    (mockPrisma.spreadType.findUnique as jest.Mock).mockResolvedValue({
      id: "test-spread",
      creditCost: 2,
      cardCount: 3,
      positions: [],
    });

    const request = createRequest({
      spreadTypeId: "test-spread",
      intention: "What should I focus on today?",
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("creates reading successfully with free reading", async () => {
    givenUser(3, 0);
    const tx = mockTransaction([1]); // the free reading is taken

    const request = createRequest(validBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reading).toBeDefined();
    expect(data.usedFreeReading).toBe(true);
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-123", freeReadingsLeft: { gt: 0 } },
      data: { freeReadingsLeft: { decrement: 1 } },
    });
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("returns 404 if spread type not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      freeReadingsLeft: 3,
      credits: 0,
    });

    (mockPrisma.spreadType.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest({
      spreadTypeId: "nonexistent-spread",
      intention: "What should I focus on today?",
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
  });

  it("returns the same response shape the reading page expects", async () => {
    givenUser(3, 0);
    mockTransaction([1]);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(Object.keys(data).sort()).toEqual(
      [
        "reading",
        "cards",
        "usedFreeReading",
        "streak",
        "newlyDiscoveredCards",
        "goldenCards",
        "unlockedAchievements",
        "levelUp",
        "completedChallenges",
      ].sort()
    );
    expect(Object.keys(data.reading).sort()).toEqual(
      ["id", "intention", "interpretation", "createdAt", "spreadType"].sort()
    );
    expect(data.reading.interpretation).toBe("Test interpretation");
    expect(data.cards).toHaveLength(3);
    for (const card of data.cards) {
      expect(Object.keys(card).sort()).toEqual(
        ["position", "cardId", "isReversed", "isGolden", "card", "positionInfo"].sort()
      );
      expect(Object.keys(card.card).sort()).toEqual(
        ["id", "name", "nameEs", "arcana", "suit", "keywords", "meaningUpright", "meaningReversed", "imageUrl"].sort()
      );
      expect(card.positionInfo.position).toBe(card.position);
    }
    expect(new Set(data.cards.map((c: { cardId: string }) => c.cardId)).size).toBe(3);
    expect(data.streak).toEqual({ currentStreak: 1, longestStreak: 1, reward: null });
    expect(data.levelUp).toBeNull();
    expect(data.goldenCards).toEqual([]);
    expect(data.completedChallenges).toEqual([]);
  });

  describe("when the AI fails (F-07)", () => {
    it("returns 503 and neither saves the reading nor charges", async () => {
      givenUser(0, 5);
      const tx = mockTransaction([1, 1]);
      mockGenerate.mockRejectedValueOnce(new AIUnavailableError("529 Overloaded"));

      const response = await POST(createRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({ error: "interpretation_unavailable", retry: true });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.reading.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
      expect(tx.reading.create).not.toHaveBeenCalled();
      expect(tx.user.updateMany).not.toHaveBeenCalled();
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    });

    it("returns 503 for any unexpected error from the interpretation", async () => {
      givenUser(3, 0);
      mockTransaction([1]);
      mockGenerate.mockRejectedValueOnce(new Error("socket hang up"));

      const response = await POST(createRequest(validBody));

      expect(response.status).toBe(503);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns 422 when the model refuses, without charging", async () => {
      givenUser(0, 5);
      const tx = mockTransaction([1, 1]);
      mockGenerate.mockRejectedValueOnce(new AIRefusalError(undefined, "general_harms"));

      const response = await POST(createRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data).toEqual({ error: "interpretation_refused" });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(tx.reading.create).not.toHaveBeenCalled();
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe("conditional charge (F-08)", () => {
    it("charges the spread cost with a conditional debit and records the transaction", async () => {
      givenUser(0, 5);
      const tx = mockTransaction([0, 1]); // no free reading left, debit succeeds

      const response = await POST(createRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.usedFreeReading).toBe(false);
      expect(tx.user.updateMany).toHaveBeenLastCalledWith({
        where: { id: "user-123", credits: { gte: 1 } },
        data: { credits: { decrement: 1 } },
      });
      expect(tx.creditTransaction.create).toHaveBeenCalledWith({
        data: { userId: "user-123", amount: -1, type: "READING", readingId: "reading-123" },
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it("returns 403 and records no transaction when the debit doesn't go through", async () => {
      // The early check sees 5 credits, but a concurrent request spent them first
      givenUser(0, 5);
      const tx = mockTransaction([0, 0]);

      const response = await POST(createRequest(validBody));

      expect(response.status).toBe(403);
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    });
  });
});
