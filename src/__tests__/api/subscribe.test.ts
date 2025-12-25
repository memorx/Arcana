/**
 * @jest-environment node
 */
import { POST } from "@/app/api/subscribe/route";
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
    },
    userProfile: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: jest.fn().mockResolvedValue({ id: "cus_test123" }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("POST /api/subscribe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/subscribe", {
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

  it("returns 400 if invalid plan", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123", email: "test@example.com" } });

    const request = createRequest({ planId: "invalid_plan" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 if already subscribed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123", email: "test@example.com" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      status: "active",
    });

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 if no profile", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123", email: "test@example.com" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("creates checkout session successfully", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123", email: "test@example.com" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "profile-1",
      fullName: "John Doe",
    });

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/test");
  });

  it("reuses existing stripe customer id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123", email: "test@example.com" } });

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      status: "canceled",
      stripeCustomerId: "cus_existing123",
    });
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "profile-1",
      fullName: "John Doe",
    });

    const request = createRequest({ planId: "daily_oracle" });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
