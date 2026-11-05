/**
 * @jest-environment node
 */
jest.mock("@/lib/pulse", () => ({
  getCollectivePulse: jest.fn(),
}));

import { GET } from "@/app/api/pulse/route";
import { getCollectivePulse } from "@/lib/pulse";

const mockPulse = getCollectivePulse as jest.Mock;

describe("GET /api/pulse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("is public and cacheable on the CDN for 10 minutes", async () => {
    const pulse = {
      enough: true,
      date: "2026-11-04",
      totalReadings: 12,
      top: [
        { cardId: "card-sun", name: "The Sun", nameEs: "El Sol", imageUrl: "/sun.jpg", count: 5, percentage: 42 },
      ],
    };
    mockPulse.mockResolvedValue(pulse);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=600, stale-while-revalidate=60"
    );
    expect(await response.json()).toEqual(pulse);
  });

  it("passes along 'not enough' as is", async () => {
    mockPulse.mockResolvedValue({ enough: false });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enough: false });
  });

  it("answers 500 without caching when the pulse fails", async () => {
    mockPulse.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "pulse_unavailable" });
  });
});
