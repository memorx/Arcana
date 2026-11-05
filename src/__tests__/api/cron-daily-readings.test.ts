/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findMany: jest.fn() },
    card: { findMany: jest.fn() },
    dailyReading: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/anthropic", () => ({
  generateDailyInterpretation: jest.fn(),
}));

jest.mock("@/lib/email", () => ({
  sendDailyReadingEmail: jest.fn(),
}));

import { GET } from "@/app/api/cron/daily-readings/route";
import { prisma } from "@/lib/prisma";
import { generateDailyInterpretation } from "@/lib/anthropic";
import { sendDailyReadingEmail } from "@/lib/email";

const mockPrisma = prisma as unknown as {
  subscription: { findMany: jest.Mock };
  card: { findMany: jest.Mock };
  dailyReading: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
};
const mockGenerate = generateDailyInterpretation as jest.Mock;
const mockSendEmail = sendDailyReadingEmail as jest.Mock;

const SECRET = "cron-test-secret";

const request = (authorization = `Bearer ${SECRET}`) =>
  new NextRequest("http://localhost:3000/api/cron/daily-readings", {
    headers: { authorization },
  });

const subscriber = {
  id: "sub-1",
  status: "active",
  user: {
    id: "user-1",
    email: "ana@example.com",
    profile: {
      fullName: "Ana López",
      zodiacSign: "Leo",
      focusArea: "career",
      emailTime: "08:00",
      locale: "es",
    },
  },
};

const theSun = {
  id: "card-sun",
  name: "The Sun",
  nameEs: "El Sol",
  imageUrl: "/cards/sun.jpg",
  keywords: ["joy", "success"],
};

describe("GET /api/cron/daily-readings", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockPrisma.subscription.findMany.mockResolvedValue([subscriber]);
    mockPrisma.card.findMany.mockResolvedValue([theSun]);
    mockPrisma.dailyReading.findUnique.mockResolvedValue(null);
    mockPrisma.dailyReading.findMany.mockResolvedValue([]);
    mockPrisma.dailyReading.upsert.mockResolvedValue({ id: "daily-1" });
    mockGenerate.mockResolvedValue("Buenos días, Ana. El Sol te acompaña hoy.");
    mockSendEmail.mockResolvedValue(undefined);
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
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request("Bearer undefined"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "CRON_SECRET not configured" });
    expect(mockPrisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it("generates, saves and emails the daily card", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, processed: 1, sent: 1, errors: 0 });

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        cardName: "The Sun",
        cardNameEs: "El Sol",
        zodiacSign: "Leo",
        focusArea: "career",
        userName: "Ana",
        locale: "es",
      })
    );

    expect(mockPrisma.dailyReading.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user-1",
          cardId: "card-sun",
          interpretation: "Buenos días, Ana. El Sol te acompaña hoy.",
          sentAt: expect.any(Date),
        }),
      })
    );

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@example.com",
        userName: "Ana",
        cardName: "The Sun",
        cardNameEs: "El Sol",
        cardImage: "/cards/sun.jpg",
        interpretation: "Buenos días, Ana. El Sol te acompaña hoy.",
        locale: "es",
        zodiacSign: "Leo",
        keywords: ["joy", "success"],
      })
    );
  });

  it("doesn't send again when today's card was already sent", async () => {
    mockPrisma.dailyReading.findUnique.mockResolvedValue({ id: "daily-1", sentAt: new Date() });

    const response = await GET(request());
    const body = await response.json();

    expect(body).toMatchObject({ processed: 1, sent: 0, errors: 0 });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockPrisma.dailyReading.upsert).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts an AI failure as an error and keeps going", async () => {
    mockGenerate.mockRejectedValue(new Error("529 Overloaded"));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ sent: 0, errors: 1 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
