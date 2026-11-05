/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/email", () => ({
  sendSubscriptionExpiredEmail: jest.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/cron/renew-credit-subscriptions/route";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionExpiredEmail } from "@/lib/email";

const mockPrisma = prisma as unknown as {
  subscription: { findMany: jest.Mock; updateMany: jest.Mock };
  $transaction: jest.Mock;
};

const SECRET = "cron-test-secret";
const periodEnd = new Date("2026-11-05T00:00:00.000Z");

const request = (authorization = `Bearer ${SECRET}`) =>
  new NextRequest("http://localhost:3000/api/cron/renew-credit-subscriptions", {
    headers: { authorization },
  });

const subscription = (credits: number) => ({
  id: "sub-1",
  userId: "user-1",
  plan: "daily_oracle", // 10 credits/month
  creditsCostPerMonth: 10,
  status: "active",
  paymentMethod: "credits",
  currentPeriodStart: new Date("2026-10-05T00:00:00.000Z"),
  currentPeriodEnd: periodEnd,
  user: {
    id: "user-1",
    credits,
    email: "ana@example.com",
    name: "Ana",
    profile: { fullName: "Ana López", locale: "es" },
  },
});

type SubscriptionUpdate = {
  where: { id: string; status: string; currentPeriodEnd: Date };
  data: { currentPeriodEnd: Date };
};
type CreditDebit = {
  where: { id: string; credits: { gte: number } };
  data: { credits: { decrement: number } };
};

/**
 * A tiny in-memory database for one subscription and one balance, so two cron runs
 * that read the same snapshot behave like they would against Postgres.
 */
const fakeDatabase = (credits: number) => {
  const state = { currentPeriodEnd: periodEnd, status: "active", credits };
  const tx = {
    subscription: {
      updateMany: jest.fn(async ({ where, data }: SubscriptionUpdate) => {
        const matches =
          where.id === "sub-1" &&
          where.status === state.status &&
          where.currentPeriodEnd.getTime() === state.currentPeriodEnd.getTime();
        if (!matches) return { count: 0 };
        state.currentPeriodEnd = data.currentPeriodEnd;
        return { count: 1 };
      }),
    },
    user: {
      updateMany: jest.fn(async ({ where, data }: CreditDebit) => {
        if (state.credits < where.credits.gte) return { count: 0 };
        state.credits -= data.credits.decrement;
        return { count: 1 };
      }),
    },
    creditTransaction: { create: jest.fn().mockResolvedValue({}) },
  };
  mockPrisma.$transaction.mockImplementation(async (callback) => {
    const snapshot = { ...state };
    try {
      return await callback(tx);
    } catch (error) {
      Object.assign(state, snapshot); // rollback
      throw error;
    }
  });
  return { state, tx };
};

describe("GET /api/cron/renew-credit-subscriptions", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("returns 401 with a wrong secret", async () => {
    const response = await GET(request("Bearer wrong"));

    expect(response.status).toBe(401);
    expect(mockPrisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request("Bearer undefined"));

    expect(response.status).toBe(500);
    expect(mockPrisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it("does not combine select and include on the user (Prisma rejects it)", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await GET(request());

    const userArgs = mockPrisma.subscription.findMany.mock.calls[0][0].include.user;
    expect(userArgs).not.toHaveProperty("include");
    expect(userArgs.select.profile).toEqual({ select: { fullName: true, locale: true } });
  });

  it("renews once: charges the plan cost and moves the period forward", async () => {
    const { state, tx } = fakeDatabase(15);
    mockPrisma.subscription.findMany.mockResolvedValue([subscription(15)]);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ checked: 1, renewed: 1, expired: 0, skipped: 0 });
    expect(state.credits).toBe(5);
    expect(state.currentPeriodEnd.toISOString()).toBe("2026-12-05T00:00:00.000Z");
    expect(tx.creditTransaction.create).toHaveBeenCalledTimes(1);
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: "user-1", amount: -10, type: "SUBSCRIPTION" },
    });
  });

  it("a second run with the same currentPeriodEnd doesn't charge again (F-11)", async () => {
    const { state, tx } = fakeDatabase(30);
    // Both runs read the same snapshot (Vercel retry / overlapping invocations)
    mockPrisma.subscription.findMany.mockResolvedValue([subscription(30)]);

    await GET(request());
    const second = await GET(request());
    const body = await second.json();

    expect(body).toMatchObject({ renewed: 0, skipped: 1, expired: 0 });
    expect(state.credits).toBe(20); // charged once
    expect(state.currentPeriodEnd.toISOString()).toBe("2026-12-05T00:00:00.000Z"); // moved once
    expect(tx.creditTransaction.create).toHaveBeenCalledTimes(1);
    expect(sendSubscriptionExpiredEmail).not.toHaveBeenCalled();
  });

  it("expires the subscription and emails when credits aren't enough", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([subscription(3)]);

    const response = await GET(request());
    const body = await response.json();

    expect(body).toMatchObject({ renewed: 0, expired: 1 });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: "sub-1", status: "active", currentPeriodEnd: periodEnd },
      data: { status: "credits_exhausted" },
    });
    expect(sendSubscriptionExpiredEmail).toHaveBeenCalledWith({
      to: "ana@example.com",
      userName: "Ana",
      locale: "es",
    });
  });

  it("rolls back the period change when the balance dropped before the debit", async () => {
    // The snapshot says 15 credits, but the user spent them in the meantime
    const { state, tx } = fakeDatabase(4);
    mockPrisma.subscription.findMany.mockResolvedValue([subscription(15)]);

    const response = await GET(request());
    const body = await response.json();

    expect(body).toMatchObject({ renewed: 0, expired: 1 });
    expect(state.currentPeriodEnd).toEqual(periodEnd);
    expect(state.credits).toBe(4);
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    expect(sendSubscriptionExpiredEmail).toHaveBeenCalledTimes(1);
  });

  it("doesn't email twice when another run already expired the subscription", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([subscription(3)]);
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });

    const response = await GET(request());
    const body = await response.json();

    expect(body).toMatchObject({ expired: 0, skipped: 1 });
    expect(sendSubscriptionExpiredEmail).not.toHaveBeenCalled();
  });
});
