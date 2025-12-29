/**
 * @jest-environment node
 */
import { GET } from "@/app/api/user/credits/route";

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("GET /api/user/credits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 if session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 if user not found in database", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });

  it("returns user credits and free readings", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      credits: 15,
      freeReadingsLeft: 2,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.credits).toBe(15);
    expect(body.freeReadingsLeft).toBe(2);
  });

  it("returns zero values when user has no credits", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      credits: 0,
      freeReadingsLeft: 0,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.credits).toBe(0);
    expect(body.freeReadingsLeft).toBe(0);
  });

  it("queries database with correct user id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "specific-user-id" } });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      credits: 5,
      freeReadingsLeft: 1,
    });

    await GET();

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "specific-user-id" },
      select: { credits: true, freeReadingsLeft: true },
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Error fetching credits");
  });
});
