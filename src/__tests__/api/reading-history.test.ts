/**
 * @jest-environment node
 *
 * F-50: POST /api/reading passes the reading memory to the interpretation,
 * and reads without memory when building it fails.
 */
import { POST } from "@/app/api/reading/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 9, resetIn: 60000 }),
  rateLimitResponse: jest.fn(),
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    spreadType: { findUnique: jest.fn() },
    card: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/anthropic", () => ({
  generateTarotInterpretation: jest.fn().mockResolvedValue("Test interpretation"),
}));
jest.mock("@/lib/reading-memory", () => ({
  buildHistoryContext: jest.fn(),
}));
jest.mock("@/lib/streak", () => ({
  updateStreak: jest.fn().mockResolvedValue({ currentStreak: 1, longestStreak: 1, reward: null }),
}));
jest.mock("@/lib/golden-cards", () => ({
  rollForGoldenCard: jest.fn().mockReturnValue(false),
  processGoldenCards: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/collection", () => ({ discoverCardsFromReading: jest.fn().mockResolvedValue([]) }));
jest.mock("@/lib/achievements", () => ({ checkAndUnlockAchievements: jest.fn().mockResolvedValue([]) }));
jest.mock("@/lib/xp", () => ({
  addXP: jest.fn().mockResolvedValue({ xpAdded: 10, totalXP: 10, currentLevel: 1, levelUp: null }),
}));
jest.mock("@/lib/challenges", () => ({ updateChallengeProgress: jest.fn().mockResolvedValue([]) }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTarotInterpretation } from "@/lib/anthropic";
import { buildHistoryContext } from "@/lib/reading-memory";

const mockAuth = auth as jest.Mock;
const mockGenerate = generateTarotInterpretation as jest.Mock;
const mockHistory = buildHistoryContext as jest.Mock;

const spread = {
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

const deck = ["c1", "c2", "c3"].map((id) => ({
  id,
  name: id,
  nameEs: id,
  keywords: [],
  arcana: "MAJOR",
  suit: null,
  imageUrl: `/cards/${id}.jpg`,
  meaningUpright: "",
  meaningReversed: "",
}));

function givenUser(freeReadingsLeft = 3, credits = 0) {
  mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-123", freeReadingsLeft, credits });
  (prisma.spreadType.findUnique as jest.Mock).mockResolvedValue(spread);
  (prisma.card.findMany as jest.Mock).mockResolvedValue(deck);
  (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
    callback({
      reading: {
        create: jest.fn().mockResolvedValue({
          id: "reading-1",
          intention: "What should I focus on today?",
          interpretation: "Test interpretation",
          createdAt: new Date(),
          spreadType: { name: spread.name, nameEs: spread.nameEs },
        }),
      },
      user: { update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      creditTransaction: { create: jest.fn() },
    })
  );
}

const request = (body: object) =>
  new NextRequest("http://localhost:3000/api/reading", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

describe("POST /api/reading with reading memory (F-50)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerate.mockResolvedValue("Test interpretation");
  });

  it("builds the memory for the user and locale and passes it as `history`", async () => {
    givenUser();
    mockHistory.mockResolvedValue("Lecturas recientes (de la más nueva a la más antigua):\n- 12 oct · …");

    const response = await POST(
      request({ spreadTypeId: "test-spread", intention: "What should I focus on today?", locale: "en" })
    );

    expect(response.status).toBe(200);
    expect(mockHistory).toHaveBeenCalledWith("user-123", "en");
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        history: "Lecturas recientes (de la más nueva a la más antigua):\n- 12 oct · …",
      })
    );
  });

  it("reads without memory when building it fails", async () => {
    givenUser();
    mockHistory.mockRejectedValue(new Error("db timeout"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request({ spreadTypeId: "test-spread", intention: "What should I focus on today?" }));

    expect(response.status).toBe(200);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate.mock.calls[0][0].history).toBeUndefined();
    expect(prisma.$transaction).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("passes no history for someone without previous readings", async () => {
    givenUser();
    mockHistory.mockResolvedValue(undefined);

    const response = await POST(request({ spreadTypeId: "test-spread", intention: "What should I focus on today?" }));

    expect(response.status).toBe(200);
    expect(mockHistory).toHaveBeenCalledWith("user-123", "es");
    expect(mockGenerate.mock.calls[0][0].history).toBeUndefined();
  });

  it("doesn't build the memory when the person can't pay for the reading", async () => {
    givenUser(0, 0);

    const response = await POST(request({ spreadTypeId: "test-spread", intention: "What should I focus on today?" }));

    expect(response.status).toBe(403);
    expect(mockHistory).not.toHaveBeenCalled();
  });
});
