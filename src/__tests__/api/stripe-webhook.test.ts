/**
 * @jest-environment node
 */
import { POST } from "@/app/api/stripe/webhook/route";
import { NextRequest } from "next/server";

// Mock Stripe
const mockConstructEvent = jest.fn();
jest.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      user: { update: jest.fn() },
      creditTransaction: { create: jest.fn() },
    })),
  },
}));

// Mock pricing
jest.mock("@/lib/pricing", () => ({
  getSubscriptionPlanById: jest.fn().mockReturnValue({
    freeReadingsPerMonth: 1,
  }),
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const createRequest = (body: string, signature?: string) => {
  const headers = new Headers();
  if (signature) {
    headers.set("stripe-signature", signature);
  }
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  });
};

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signature validation", () => {
    it("returns 400 if stripe-signature header is missing", async () => {
      const request = createRequest("{}", undefined);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Missing stripe-signature header");
    });

    it("returns 400 if signature verification fails", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = createRequest("{}", "invalid-signature");

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Webhook signature verification failed");
    });
  });

  describe("checkout.session.completed (credit purchase)", () => {
    it("adds credits to user on successful purchase", async () => {
      const mockTransaction = jest.fn();
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return fn({
          user: { update: mockTransaction },
          creditTransaction: { create: jest.fn() },
        });
      });

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            mode: "payment",
            metadata: {
              userId: "user-123",
              credits: "15",
            },
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockTransaction).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { credits: { increment: 15 } },
      });
    });

    it("ignores checkout session without metadata", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            mode: "payment",
            metadata: {},
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("ignores subscription mode checkout sessions", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            mode: "subscription", // Not "payment"
            metadata: {
              userId: "user-123",
              credits: "15",
            },
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.created", () => {
    it("creates subscription record", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            status: "active",
            metadata: { userId: "user-123", planId: "daily_oracle" },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancel_at_period_end: false,
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-123" },
          create: expect.objectContaining({
            userId: "user-123",
            stripeSubscriptionId: "sub_123",
            status: "active",
          }),
        })
      );
    });

    it("ignores subscription without userId", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_123",
            metadata: {}, // No userId
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("marks subscription as canceled", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: { status: "canceled" },
      });
    });
  });

  describe("invoice.payment_failed", () => {
    it("marks subscription as past_due", async () => {
      mockConstructEvent.mockReturnValue({
        type: "invoice.payment_failed",
        data: {
          object: {
            subscription: "sub_123",
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: { status: "past_due" },
      });
    });

    it("ignores invoice without subscription", async () => {
      mockConstructEvent.mockReturnValue({
        type: "invoice.payment_failed",
        data: {
          object: {
            subscription: null,
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("invoice.payment_succeeded (renewal)", () => {
    it("resets free readings on subscription renewal", async () => {
      mockConstructEvent.mockReturnValue({
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_123",
            billing_reason: "subscription_cycle",
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: expect.objectContaining({
          freeReadingsUsed: 0,
          status: "active",
        }),
      });
    });

    it("ignores first payment (not a renewal)", async () => {
      mockConstructEvent.mockReturnValue({
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_123",
            billing_reason: "subscription_create", // Not renewal
          },
        },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns 500 on database error", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.deleted",
        data: {
          object: { id: "sub_123" },
        },
      });

      (mockPrisma.subscription.updateMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("handles unknown event types gracefully", async () => {
      mockConstructEvent.mockReturnValue({
        type: "unknown.event.type",
        data: { object: {} },
      });

      const request = createRequest("{}", "valid-signature");
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(true);
    });
  });
});
