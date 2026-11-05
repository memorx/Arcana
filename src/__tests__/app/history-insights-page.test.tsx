/**
 * @jest-environment node
 *
 * N-10: /history/insights is private and only reads the signed-in person's data.
 */
jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "es",
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { monthlyRecap: { findMany: jest.fn() } },
}));
jest.mock("@/lib/insights", () => ({
  ...jest.requireActual("@/lib/insights"),
  getUserInsights: jest.fn(),
}));

import { redirect } from "next/navigation";
import InsightsPage from "@/app/(main)/history/insights/page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserInsights, type UserInsights } from "@/lib/insights";

const mockAuth = auth as jest.Mock;
const findRecaps = prisma.monthlyRecap.findMany as jest.Mock;
const mockInsights = getUserInsights as jest.Mock;

const insights = (totalReadings: number): UserInsights => ({
  totalReadings,
  byMonth: Array.from({ length: 12 }, (_, i) => ({ year: 2026, month: i + 1, count: i === 10 ? totalReadings : 0 })),
  topCards: [],
  suits: { MAJOR: 0, WANDS: 0, CUPS: 0, SWORDS: 0, PENTACLES: 0 },
  reversedRate: 0,
  resonance: { count: 0, average: null },
  cardOfTheMonth: null,
});

describe("/history/insights page (N-10)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findRecaps.mockResolvedValue([]);
  });

  it("sends a visitor without a session to the login and back", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(InsightsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?callbackUrl=/history/insights");
    expect(mockInsights).not.toHaveBeenCalled();
    expect(findRecaps).not.toHaveBeenCalled();
  });

  it("only reads the signed-in person's insights and recaps", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockInsights.mockResolvedValue(insights(5));

    const page = await InsightsPage();

    expect(page).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
    expect(mockInsights).toHaveBeenCalledWith("user-1");
    expect(findRecaps).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
  });

  it("also works for the empty state (fewer than 3 readings)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockInsights.mockResolvedValue(insights(1));

    const page = await InsightsPage();

    expect(page).toBeTruthy();
    expect(mockInsights).toHaveBeenCalledWith("user-1");
  });
});
