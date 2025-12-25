/**
 * @jest-environment node
 */
import { GET } from "@/app/api/subscription/route";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: jest.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("GET /api/subscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns null subscription if not subscribed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscription).toBeNull();
  });

  it("returns active subscription", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const mockSubscription = {
      id: "sub-1",
      userId: "user-123",
      status: "active",
      plan: "daily_oracle",
      paymentMethod: "stripe",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      freeReadingsPerMonth: 1,
      freeReadingsUsed: 0,
    };

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(mockSubscription);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscription).toBeDefined();
    expect(data.subscription.status).toBe("active");
    expect(data.subscription.plan).toBe("daily_oracle");
  });

  it("returns credits subscription", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const mockSubscription = {
      id: "sub-1",
      userId: "user-123",
      status: "active",
      plan: "daily_oracle",
      paymentMethod: "credits",
      creditsCostPerMonth: 10,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(mockSubscription);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscription.paymentMethod).toBe("credits");
    expect(data.subscription.creditsCostPerMonth).toBe(10);
  });

  it("returns credits_exhausted subscription", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const mockSubscription = {
      id: "sub-1",
      userId: "user-123",
      status: "credits_exhausted",
      plan: "daily_oracle",
      paymentMethod: "credits",
    };

    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(mockSubscription);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscription.status).toBe("credits_exhausted");
  });
});
