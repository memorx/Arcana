/**
 * @jest-environment node
 */
import { POST } from "@/app/api/reading/route";
import { NextRequest } from "next/server";

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

// Mock streak
jest.mock("@/lib/streak", () => ({
  updateStreak: jest.fn().mockResolvedValue({ current: 1, longest: 1, isNew: true }),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("POST /api/reading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/reading", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
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
  });

  it("creates reading successfully with free reading", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      freeReadingsLeft: 3,
      credits: 0,
    });

    (mockPrisma.spreadType.findUnique as jest.Mock).mockResolvedValue({
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
    });

    (mockPrisma.card.findMany as jest.Mock).mockResolvedValue([
      { id: "card-1", name: "The Fool", nameEs: "El Loco", keywords: [], arcana: "MAJOR", suit: null, imageUrl: "/cards/fool.jpg", meaningUpright: "New beginnings", meaningReversed: "Recklessness" },
      { id: "card-2", name: "The Magician", nameEs: "El Mago", keywords: [], arcana: "MAJOR", suit: null, imageUrl: "/cards/magician.jpg", meaningUpright: "Manifestation", meaningReversed: "Manipulation" },
      { id: "card-3", name: "High Priestess", nameEs: "La Sacerdotisa", keywords: [], arcana: "MAJOR", suit: null, imageUrl: "/cards/priestess.jpg", meaningUpright: "Intuition", meaningReversed: "Secrets" },
    ]);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
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
        },
      };
      return callback(tx);
    });

    const request = createRequest({
      spreadTypeId: "test-spread",
      intention: "What should I focus on today?",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reading).toBeDefined();
    expect(data.usedFreeReading).toBe(true);
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
});
