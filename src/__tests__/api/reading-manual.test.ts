/**
 * @jest-environment node
 */
import { POST } from "@/app/api/reading/manual/route";
import { NextRequest } from "next/server";
import { AIRefusalError, AIUnavailableError } from "@/lib/ai/config";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 4, resetIn: 60000 }),
  rateLimitResponse: jest.fn().mockReturnValue(new Response(null, { status: 429 })),
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

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

jest.mock("@/lib/anthropic", () => ({
  generateTarotInterpretation: jest.fn().mockResolvedValue("Manual interpretation"),
}));

jest.mock("@/lib/streak", () => ({
  updateStreak: jest.fn().mockResolvedValue({ currentStreak: 1, longestStreak: 1, reward: null }),
}));
jest.mock("@/lib/golden-cards", () => ({
  rollForGoldenCard: jest.fn().mockReturnValue(true), // would make every drawn card golden
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
import { rateLimit } from "@/lib/rate-limit";
import { processGoldenCards } from "@/lib/golden-cards";
import { discoverCardsFromReading } from "@/lib/collection";
import { updateStreak } from "@/lib/streak";
import { addXP } from "@/lib/xp";
import { updateChallengeProgress } from "@/lib/challenges";

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
  { id: "card-4", name: "The Empress", nameEs: "La Emperatriz", keywords: [], arcana: "MAJOR", suit: null, imageUrl: "/cards/empress.jpg", meaningUpright: "Abundance", meaningReversed: "Dependence" },
];

const chosenCards = [
  { position: 1, cardId: "card-4", isReversed: true },
  { position: 2, cardId: "card-2", isReversed: false },
  { position: 3, cardId: "card-1" },
];

const validBody = {
  spreadTypeId: "test-spread",
  intention: "What should I focus on today?",
  locale: "en",
  cards: chosenCards,
};

/** Transaction client whose conditional updates return the given counts, in call order. */
const mockTransaction = (updateManyCounts: number[]) => {
  const tx = {
    reading: {
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: "reading-manual-1",
        intention: data.intention,
        interpretation: data.interpretation,
        source: data.source,
        createdAt: new Date(),
        spreadType: threeCardSpread,
      })),
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

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/reading/manual", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

describe("POST /api/reading/manual (F-62)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockReturnValue({ success: true, remaining: 4, resetIn: 60000 });
    mockGenerate.mockResolvedValue("Manual interpretation");
    (discoverCardsFromReading as jest.Mock).mockResolvedValue([]);
  });

  it("returns 429 when rate limited", async () => {
    (rateLimit as jest.Mock).mockReturnValueOnce({ success: false, remaining: 0, resetIn: 30000 });

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith(expect.anything(), 5, 60000);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(401);
  });

  describe("validation (400)", () => {
    beforeEach(() => givenUser(3, 0));

    it.each([
      ["intention shorter than 10 characters", { ...validBody, intention: "  short   " }],
      ["missing spreadTypeId", { ...validBody, spreadTypeId: undefined }],
      ["cards missing", { ...validBody, cards: undefined }],
      ["cards empty", { ...validBody, cards: [] }],
      ["position not an integer", { ...validBody, cards: [{ position: "1", cardId: "card-1" }, ...chosenCards.slice(1)] }],
      ["isReversed not a boolean", { ...validBody, cards: [{ ...chosenCards[0], isReversed: "yes" }, ...chosenCards.slice(1)] }],
      ["fewer cards than the spread", { ...validBody, cards: chosenCards.slice(0, 2) }],
      ["more cards than the spread", { ...validBody, cards: [...chosenCards, { position: 4, cardId: "card-3" }] }],
      ["a gap in the positions", { ...validBody, cards: [chosenCards[0], chosenCards[1], { position: 4, cardId: "card-3" }] }],
      ["a repeated position", { ...validBody, cards: [chosenCards[0], chosenCards[1], { position: 2, cardId: "card-3" }] }],
      ["position 0", { ...validBody, cards: [{ position: 0, cardId: "card-3" }, chosenCards[1], chosenCards[2]] }],
      ["a repeated card", { ...validBody, cards: [chosenCards[0], chosenCards[1], { position: 3, cardId: "card-4" }] }],
      ["an unknown card", { ...validBody, cards: [chosenCards[0], chosenCards[1], { position: 3, cardId: "nope" }] }],
    ])("rejects %s without calling the AI or charging", async (_label, body) => {
      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
      expect(mockGenerate).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects a body that isn't JSON", async () => {
      const response = await POST(createRequest("not json"));

      expect(response.status).toBe(400);
    });

    it.each([
      ["null", "null"],
      ["an array", "[]"],
      ["a string", '"hola"'],
    ])("rejects a JSON body that is %s with invalid_body", async (_label, body) => {
      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_body" });
      expect(mockGenerate).not.toHaveBeenCalled();
    });
  });

  it("returns 404 if the spread type doesn't exist", async () => {
    givenUser(3, 0);
    (mockPrisma.spreadType.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(404);
  });

  it("returns 403 without calling the AI when the user can't pay", async () => {
    givenUser(0, 0);

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(403);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("interprets the chosen cards as a manual reading and saves them as chosen", async () => {
    givenUser(3, 0);
    const tx = mockTransaction([1]); // the free reading is taken

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith({
      spreadName: "Three Cards",
      intention: "What should I focus on today?",
      locale: "en",
      source: "manual",
      cards: [
        { position: 1, positionName: "Past", positionDescription: "Past", cardName: "The Empress", isReversed: true },
        { position: 2, positionName: "Present", positionDescription: "Present", cardName: "The Magician", isReversed: false },
        { position: 3, positionName: "Future", positionDescription: "Future", cardName: "The Fool", isReversed: false },
      ],
    });

    expect(tx.reading.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          spreadTypeId: "test-spread",
          source: "manual",
          interpretation: "Manual interpretation",
          cards: [
            { position: 1, cardId: "card-4", isReversed: true, isGolden: false },
            { position: 2, cardId: "card-2", isReversed: false, isGolden: false },
            { position: 3, cardId: "card-1", isReversed: false, isGolden: false },
          ],
        }),
      })
    );
    expect(data.usedFreeReading).toBe(true);
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("sorts the cards by position even if they arrive out of order", async () => {
    givenUser(3, 0);
    const tx = mockTransaction([1]);

    await POST(createRequest({ ...validBody, cards: [chosenCards[2], chosenCards[0], chosenCards[1]] }));

    const saved = tx.reading.create.mock.calls[0][0].data.cards;
    expect(saved.map((c: { position: number }) => c.position)).toEqual([1, 2, 3]);
  });

  it("uses Spanish names when the locale is es", async () => {
    givenUser(3, 0);
    mockTransaction([1]);

    await POST(createRequest({ ...validBody, locale: "es" }));

    const call = mockGenerate.mock.calls[0][0];
    expect(call.spreadName).toBe("Tres Cartas");
    expect(call.cards[0]).toEqual(expect.objectContaining({ positionName: "Pasado", cardName: "La Emperatriz" }));
  });

  it("never marks a card golden, even when the golden roll would hit", async () => {
    givenUser(3, 0);
    mockTransaction([1]);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(data.cards.every((c: { isGolden: boolean }) => c.isGolden === false)).toBe(true);
    expect(processGoldenCards).not.toHaveBeenCalled();
    expect(data.goldenCards).toEqual([]);
  });

  it("saves isGolden false even if the body claims a golden card", async () => {
    givenUser(3, 0);
    const tx = mockTransaction([1]);

    const response = await POST(
      createRequest({
        ...validBody,
        cards: chosenCards.map((c) => ({ ...c, isGolden: true })),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    const saved = tx.reading.create.mock.calls[0][0].data.cards;
    expect(saved.every((c: { isGolden: boolean }) => c.isGolden === false)).toBe(true);
    expect(data.cards.every((c: { isGolden: boolean }) => c.isGolden === false)).toBe(true);
    expect(processGoldenCards).not.toHaveBeenCalled();
  });

  it("doesn't discover collection cards or count cards_discovered, but keeps streak, XP and reading challenges", async () => {
    givenUser(3, 0);
    mockTransaction([1]);
    // Would discover every card it's given
    (discoverCardsFromReading as jest.Mock).mockImplementation(async (_userId: string, ids: string[]) =>
      ids.map((id) => ({ id, name: id, nameEs: id, imageUrl: "", arcana: "MAJOR", suit: null }))
    );

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    const discoverCalls = (discoverCardsFromReading as jest.Mock).mock.calls;
    expect(discoverCalls.every(([, ids]) => Array.isArray(ids) && ids.length === 0)).toBe(true);
    expect(data.newlyDiscoveredCards).toEqual([]);
    expect(updateChallengeProgress).not.toHaveBeenCalledWith("user-123", "cards_discovered", expect.anything());

    expect(updateStreak).toHaveBeenCalledWith("user-123");
    expect(updateChallengeProgress).toHaveBeenCalledWith("user-123", "reading_completed");
    expect(updateChallengeProgress).toHaveBeenCalledWith("user-123", "spread_used", expect.objectContaining({ spreadTypeId: "test-spread" }));
    // Base XP for a 3-card reading, nothing for new cards
    expect(addXP).toHaveBeenCalledWith("user-123", expect.any(Number), "reading_completion");
    // The response still has the three chosen cards
    expect(data.cards.map((c: { cardId: string }) => c.cardId)).toEqual(["card-4", "card-2", "card-1"]);
  });

  it("returns the same response shape as POST /api/reading", async () => {
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
    expect(data.reading.id).toBe("reading-manual-1");
    expect(data.reading.interpretation).toBe("Manual interpretation");
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
    expect(data.cards[0].card.name).toBe("The Empress");
    expect(data.cards[0].isReversed).toBe(true);
    expect(data.streak).toEqual({ currentStreak: 1, longestStreak: 1, reward: null });
    expect(data.levelUp).toBeNull();
    expect(data.completedChallenges).toEqual([]);
  });

  it("charges credits with a conditional debit when there are no free readings", async () => {
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
      data: { userId: "user-123", amount: -1, type: "READING", readingId: "reading-manual-1" },
    });
  });

  it("returns 403 and records no transaction when the debit doesn't go through", async () => {
    givenUser(0, 5);
    const tx = mockTransaction([0, 0]);

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(403);
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  describe("when the AI fails", () => {
    it("returns 503 and neither saves the reading nor charges", async () => {
      givenUser(0, 5);
      const tx = mockTransaction([1, 1]);
      mockGenerate.mockRejectedValueOnce(new AIUnavailableError("529 Overloaded"));

      const response = await POST(createRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({ error: "interpretation_unavailable", retry: true });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(tx.reading.create).not.toHaveBeenCalled();
      expect(tx.user.updateMany).not.toHaveBeenCalled();
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
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
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    });
  });
});
