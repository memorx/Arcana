/**
 * @jest-environment node
 */
import { GET } from "@/app/api/daily-reading/route";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    dailyReading: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("GET /api/daily-reading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns today reading and recent readings", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const mockCard = {
      id: "card-1",
      name: "The Fool",
      nameEs: "El Loco",
      arcana: "MAJOR",
      suit: null,
      imageUrl: "/cards/fool.jpg",
    };

    (mockPrisma.dailyReading.findUnique as jest.Mock).mockResolvedValue({
      id: "reading-1",
      date: new Date(),
      cardId: "card-1",
      isReversed: false,
      interpretation: "Today's message",
      card: mockCard,
    });

    (mockPrisma.dailyReading.findMany as jest.Mock).mockResolvedValue([
      {
        id: "reading-2",
        date: new Date(Date.now() - 86400000),
        cardId: "card-2",
        isReversed: true,
        card: { ...mockCard, id: "card-2", name: "The Magician" },
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.today).toBeDefined();
    expect(data.recent).toBeDefined();
    expect(data.recent).toHaveLength(1);
  });

  it("returns null today if no reading exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.dailyReading.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.dailyReading.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.today).toBeNull();
    expect(data.recent).toEqual([]);
  });

  it("queries for last 7 days of readings", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.dailyReading.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.dailyReading.findMany as jest.Mock).mockResolvedValue([]);

    await GET();

    expect(mockPrisma.dailyReading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          date: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
        orderBy: { date: "desc" },
      })
    );
  });
});
