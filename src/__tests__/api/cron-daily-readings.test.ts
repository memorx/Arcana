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

// Real isBirthdayToday; the gift itself is tested in src/__tests__/lib/birthday.test.ts
jest.mock("@/lib/birthday", () => ({
  ...jest.requireActual("@/lib/birthday"),
  claimBirthdayGift: jest.fn(),
}));

import { GET } from "@/app/api/cron/daily-readings/route";
import { prisma } from "@/lib/prisma";
import { generateDailyInterpretation } from "@/lib/anthropic";
import { sendDailyReadingEmail } from "@/lib/email";
import { claimBirthdayGift } from "@/lib/birthday";
import { describeDayEnergies, getDayEnergies } from "@/lib/systems";

const mockPrisma = prisma as unknown as {
  subscription: { findMany: jest.Mock };
  card: { findMany: jest.Mock };
  dailyReading: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
};
const mockGenerate = generateDailyInterpretation as jest.Mock;
const mockSendEmail = sendDailyReadingEmail as jest.Mock;
const mockClaimGift = claimBirthdayGift as jest.Mock;

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
        timeoutMs: 15_000, // F-90: one slow answer can't eat the whole cron run
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

  describe("day energies and birthday (F-42, F-43)", () => {
    // 2026-11-04 08:00 UTC: 13 Miquiztli in the tonalpohualli
    const NOW = new Date("2026-11-04T08:00:00.000Z");
    const TODAY = new Date(Date.UTC(2026, 10, 4));

    const withProfile = (profile: Record<string, unknown>) => ({
      ...subscriber,
      user: { ...subscriber.user, profile: { ...subscriber.user.profile, ...profile } },
    });

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW, doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
      mockClaimGift.mockResolvedValue({ granted: true, alreadyGranted: false, credits: 3, isBirthday: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("passes today's energies, with the personal day, to the AI and the email", async () => {
      const birthDate = new Date(Date.UTC(1990, 6, 15));
      mockPrisma.subscription.findMany.mockResolvedValue([withProfile({ birthDate })]);
      const expected = describeDayEnergies(getDayEnergies(TODAY, birthDate), "es");

      const response = await GET(request());

      expect(await response.json()).toMatchObject({ sent: 1, errors: 0 });
      expect(expected).toContain("13 Miquiztli");
      expect(expected).toContain("Día personal");
      expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ dayContext: expected }));
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ dayContext: expected, isBirthday: false, birthdayGiftCredits: undefined })
      );
      expect(mockClaimGift).not.toHaveBeenCalled();
    });

    it("writes the energies in the profile's language", async () => {
      const birthDate = new Date(Date.UTC(1990, 6, 15));
      mockPrisma.subscription.findMany.mockResolvedValue([withProfile({ birthDate, locale: "en" })]);

      await GET(request());

      const { dayContext } = mockGenerate.mock.calls[0][0];
      expect(dayContext).toBe(describeDayEnergies(getDayEnergies(TODAY, birthDate), "en"));
      expect(dayContext).toContain("Personal day");
    });

    it("leaves the personal day out without a birth date", async () => {
      await GET(request());

      const { dayContext } = mockGenerate.mock.calls[0][0];
      expect(dayContext).toBe(describeDayEnergies(getDayEnergies(TODAY, null), "es"));
      expect(dayContext).not.toContain("Día personal");
    });

    it("claims the birthday gift and greets in the email on the birthday", async () => {
      const birthDate = new Date(Date.UTC(1990, 10, 4));
      mockPrisma.subscription.findMany.mockResolvedValue([withProfile({ birthDate })]);

      const response = await GET(request());

      expect(await response.json()).toMatchObject({ sent: 1, errors: 0 });
      expect(mockClaimGift).toHaveBeenCalledTimes(1);
      expect(mockClaimGift).toHaveBeenCalledWith("user-1", { birthDate, today: TODAY });
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ isBirthday: true, birthdayGiftCredits: 3 })
      );
    });

    it("says happy birthday without announcing credits this run didn't add", async () => {
      const birthDate = new Date(Date.UTC(1990, 10, 4));
      mockPrisma.subscription.findMany.mockResolvedValue([withProfile({ birthDate })]);

      // Already claimed today from the dashboard
      mockClaimGift.mockResolvedValue({ granted: false, alreadyGranted: true, credits: 3, isBirthday: true });
      await GET(request());
      expect(mockSendEmail).toHaveBeenLastCalledWith(
        expect.objectContaining({ isBirthday: true, birthdayGiftCredits: undefined })
      );

      // Account too new for the gift
      mockClaimGift.mockResolvedValue({ granted: false, alreadyGranted: false, credits: 3, isBirthday: true });
      await GET(request());
      expect(mockSendEmail).toHaveBeenLastCalledWith(
        expect.objectContaining({ isBirthday: true, birthdayGiftCredits: undefined })
      );
    });

    it.each([["fr"], [""], [null]])(
      "treats any language other than English (%p) as Spanish everywhere",
      async (profileLocale) => {
        mockPrisma.subscription.findMany.mockResolvedValue([withProfile({ locale: profileLocale })]);

        await GET(request());

        const expected = describeDayEnergies(getDayEnergies(TODAY, null), "es");
        expect(mockGenerate).toHaveBeenCalledWith(
          expect.objectContaining({ locale: "es", dayContext: expected })
        );
        expect(mockSendEmail).toHaveBeenCalledWith(
          expect.objectContaining({ locale: "es", dayContext: expected })
        );
      }
    );

    it("sends the card even if the gift fails, without promising credits", async () => {
      const birthDate = new Date(Date.UTC(1990, 10, 4));
      mockPrisma.subscription.findMany.mockResolvedValue([withProfile({ birthDate })]);
      mockClaimGift.mockRejectedValue(new Error("db down"));

      const response = await GET(request());

      expect(await response.json()).toMatchObject({ sent: 1, errors: 0 });
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ isBirthday: true, birthdayGiftCredits: undefined })
      );
    });

    it("doesn't claim the gift again when today's card was already sent", async () => {
      const birthDate = new Date(Date.UTC(1990, 10, 4));
      mockPrisma.subscription.findMany.mockResolvedValue([withProfile({ birthDate })]);
      mockPrisma.dailyReading.findUnique.mockResolvedValue({ id: "daily-1", sentAt: new Date() });

      await GET(request());

      expect(mockClaimGift).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
