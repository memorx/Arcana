/**
 * @jest-environment node
 */
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/insights", () => ({
  ...jest.requireActual("@/lib/insights"),
  getUserInsights: jest.fn(),
}));

import { GET } from "@/app/api/insights/route";
import { auth } from "@/lib/auth";
import { getUserInsights } from "@/lib/insights";

const mockAuth = auth as jest.Mock;
const mockInsights = getUserInsights as jest.Mock;

describe("GET /api/insights (F-53)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockInsights).not.toHaveBeenCalled();
  });

  it("returns the insights of the signed-in person, uncached", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const insights = {
      totalReadings: 4,
      byMonth: [],
      topCards: [],
      suits: { MAJOR: 50, WANDS: 25, CUPS: 25, SWORDS: 0, PENTACLES: 0 },
      reversedRate: 20,
      resonance: { count: 1, average: 4 },
      cardOfTheMonth: null,
    };
    mockInsights.mockResolvedValue(insights);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mockInsights).toHaveBeenCalledWith("user-1");
    expect(await response.json()).toEqual(insights);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns 500 when the query fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockInsights.mockRejectedValue(new Error("db down"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(500);
    consoleError.mockRestore();
  });
});
