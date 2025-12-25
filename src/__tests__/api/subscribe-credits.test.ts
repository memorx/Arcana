/**
 * @jest-environment node
 */
import { POST } from "@/app/api/subscribe/credits/route";
import { NextRequest } from "next/server";

// Mock rate limit
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 9, resetIn: 60000 }),
  rateLimitResponse: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("POST /api/subscribe/credits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/subscribe/credits", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 if already subscribed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      status: "active",
    });

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 if no profile", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 if not enough credits", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue({ id: "profile-1" });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ credits: 5 }); // Need 10

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("credits");
  });

  it("creates subscription successfully with credits", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue({ id: "profile-1" });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ credits: 15 });
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("returns 400 if invalid plan", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const request = createRequest({ planId: "invalid_plan" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
