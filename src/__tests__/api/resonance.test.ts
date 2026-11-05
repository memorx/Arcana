/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 9, resetIn: 60000 }),
  rateLimitResponse: jest.fn(),
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    reading: { findUnique: jest.fn(), updateMany: jest.fn() },
  },
}));
jest.mock("@/lib/xp", () => ({
  addXP: jest.fn().mockResolvedValue({ xpAdded: 5, totalXP: 105, currentLevel: 2, levelUp: null }),
}));

import { POST } from "@/app/api/readings/[id]/resonance/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";

const mockAuth = auth as jest.Mock;
const findReading = prisma.reading.findUnique as jest.Mock;
const updateReadings = prisma.reading.updateMany as jest.Mock;
const mockAddXP = addXP as jest.Mock;

const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

function call(body: unknown, id = "reading-1") {
  const req = new NextRequest(`http://localhost:3000/api/readings/${id}/resonance`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

function givenReading(overrides: Partial<{ userId: string; createdAt: Date; resonance: number | null }> = {}) {
  findReading.mockResolvedValue({ userId: "user-1", createdAt: TWO_DAYS_AGO, resonance: null, ...overrides });
}

describe("POST /api/readings/[id]/resonance (F-51)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    updateReadings.mockResolvedValue({ count: 1 });
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await call({ score: 4 });

    expect(response.status).toBe(401);
    expect(findReading).not.toHaveBeenCalled();
  });

  it("returns 404 when the reading doesn't exist", async () => {
    findReading.mockResolvedValue(null);

    const response = await call({ score: 4 });

    expect(response.status).toBe(404);
  });

  it("returns 403 for someone else's reading and doesn't write", async () => {
    givenReading({ userId: "someone-else" });

    const response = await call({ score: 4 });

    expect(response.status).toBe(403);
    expect(updateReadings).not.toHaveBeenCalled();
    expect(mockAddXP).not.toHaveBeenCalled();
  });

  it.each([0, 6, 2.5, "5", null, undefined])("returns 400 for score %p", async (score) => {
    givenReading();

    const response = await call({ score });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("invalid_score");
    expect(updateReadings).not.toHaveBeenCalled();
  });

  it("returns 400 for a note longer than 500 characters", async () => {
    givenReading();

    const response = await call({ score: 3, note: "a".repeat(501) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("note_too_long");
    expect(updateReadings).not.toHaveBeenCalled();
  });

  it("returns 400 for a note that isn't text", async () => {
    givenReading();

    const response = await call({ score: 3, note: { text: "hola" } });

    expect(response.status).toBe(400);
  });

  it("returns 400 for a body that isn't JSON", async () => {
    const response = await call("not json");

    expect(response.status).toBe(400);
  });

  it("returns 400 for a reading younger than 24 hours", async () => {
    givenReading({ createdAt: new Date(Date.now() - 60 * 60 * 1000) });

    const response = await call({ score: 4 });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("too_soon");
    expect(updateReadings).not.toHaveBeenCalled();
  });

  it("returns 409 when the reading was already rated", async () => {
    givenReading({ resonance: 4 });

    const response = await call({ score: 5 });

    expect(response.status).toBe(409);
    expect(updateReadings).not.toHaveBeenCalled();
    expect(mockAddXP).not.toHaveBeenCalled();
  });

  it("returns 409 and gives no XP when a simultaneous request rated it first", async () => {
    givenReading();
    updateReadings.mockResolvedValue({ count: 0 });

    const response = await call({ score: 5 });

    expect(response.status).toBe(409);
    expect(mockAddXP).not.toHaveBeenCalled();
  });

  it("saves score, note and date once, and gives 5 XP", async () => {
    givenReading();

    const response = await call({ score: 5, note: "  Pasó justo lo que decía la Torre.  " });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(updateReadings).toHaveBeenCalledWith({
      where: { id: "reading-1", userId: "user-1", resonance: null },
      data: { resonance: 5, resonanceNote: "Pasó justo lo que decía la Torre.", resonanceAt: expect.any(Date) },
    });
    expect(mockAddXP).toHaveBeenCalledWith("user-1", 5, "resonance");
    expect(data).toEqual({
      resonance: 5,
      resonanceNote: "Pasó justo lo que decía la Torre.",
      resonanceAt: expect.any(String),
      xpAdded: 5,
      levelUp: null,
    });
  });

  it("stores an empty note as null", async () => {
    givenReading();

    await call({ score: 2, note: "   " });

    expect(updateReadings.mock.calls[0][0].data.resonanceNote).toBeNull();
  });

  it("keeps the rating when adding XP fails", async () => {
    givenReading();
    mockAddXP.mockRejectedValueOnce(new Error("db down"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await call({ score: 4 });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resonance).toBe(4);
    expect(data.xpAdded).toBe(0);
    consoleError.mockRestore();
  });
});
