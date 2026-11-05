/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 2, resetIn: 60000 }),
  rateLimitResponse: jest.fn(),
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    monthlyRecap: { findUnique: jest.fn(), upsert: jest.fn() },
    reading: { findMany: jest.fn() },
    card: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/ai/config", () => ({
  ...jest.requireActual("@/lib/ai/config"),
  complete: jest.fn(),
}));

import { POST } from "@/app/api/insights/recap/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AI_MODELS, AIRefusalError, AIUnavailableError, complete } from "@/lib/ai/config";

const mockAuth = auth as jest.Mock;
const findRecap = prisma.monthlyRecap.findUnique as jest.Mock;
const upsertRecap = prisma.monthlyRecap.upsert as jest.Mock;
const findReadings = prisma.reading.findMany as jest.Mock;
const findCards = prisma.card.findMany as jest.Mock;
const mockComplete = complete as jest.Mock;

// Months relative to the real clock, so the test doesn't need fake timers.
const now = new Date();
const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
const previousDate = new Date(Date.UTC(current.year, current.month - 2, 1));
const previous = { year: previousDate.getUTCFullYear(), month: previousDate.getUTCMonth() + 1 };
const nextDate = new Date(Date.UTC(current.year, current.month, 1));
const next = { year: nextDate.getUTCFullYear(), month: nextDate.getUTCMonth() + 1 };

const spread = {
  name: "Three Cards",
  nameEs: "Tres Cartas",
  positions: [
    { position: 1, name: "Past", nameEs: "Pasado" },
    { position: 2, name: "Present", nameEs: "Presente" },
    { position: 3, name: "Future", nameEs: "Futuro" },
  ],
};

const monthReading = (day: number, intention: string, resonance: number | null = null) => ({
  createdAt: new Date(Date.UTC(previous.year, previous.month - 1, day, 12)),
  intention,
  cards: [
    { position: 1, cardId: "tower", isReversed: true, isGolden: false },
    { position: 2, cardId: "star", isReversed: false, isGolden: false },
  ],
  resonance,
  resonanceNote: resonance ? "Me hizo sentido" : null,
  spreadType: spread,
});

const threeReadings = [
  monthReading(2, "¿Qué necesito soltar?"),
  monthReading(9, "¿Cómo cuido mi energía en el trabajo?", 5),
  monthReading(20, "¿Qué me pide esta relación?"),
];

const storedRecap = (overrides: object = {}) => ({
  id: "recap-1",
  userId: "user-1",
  year: previous.year,
  month: previous.month,
  locale: "es",
  content: "Un mes de soltar.",
  readingCount: 3,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  ...overrides,
});

function call(body: unknown) {
  return POST(
    new NextRequest("http://localhost:3000/api/insights/recap", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );
}

describe("POST /api/insights/recap (F-53)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    findRecap.mockResolvedValue(null);
    findReadings.mockResolvedValue(threeReadings);
    findCards.mockResolvedValue([
      { id: "tower", name: "The Tower", nameEs: "La Torre" },
      { id: "star", name: "The Star", nameEs: "La Estrella" },
    ]);
    mockComplete.mockResolvedValue("Este mes tus cartas hablaron de soltar.");
    upsertRecap.mockImplementation(async ({ create }) => ({ id: "recap-new", createdAt: new Date(), ...create }));
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await call(previous);

    expect(response.status).toBe(401);
  });

  it.each([
    { year: 2026, month: 13 },
    { year: 2026, month: 0 },
    { year: 2026, month: "11" },
    { year: 2026.5, month: 3 },
    { month: 3 },
  ])("returns 400 for an invalid month %p", async (body) => {
    const response = await call(body);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_month");
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it("returns 400 for a month that hasn't started", async () => {
    const response = await call(next);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("future_month");
    expect(findRecap).not.toHaveBeenCalled();
  });

  it("returns the saved recap of a closed month without calling the AI", async () => {
    findRecap.mockResolvedValue(storedRecap());

    const response = await call(previous);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(data.recap).toMatchObject({ ...previous, content: "Un mes de soltar.", readingCount: 3 });
    expect(findRecap).toHaveBeenCalledWith({
      where: { userId_year_month: { userId: "user-1", ...previous } },
    });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(upsertRecap).not.toHaveBeenCalled();
  });

  it("returns 400 with fewer than 3 readings in the month, without calling the AI", async () => {
    findReadings.mockResolvedValue(threeReadings.slice(0, 2));

    const response = await call(previous);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "not_enough_readings", required: 3, count: 2 });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(upsertRecap).not.toHaveBeenCalled();
  });

  it("only reads the person's readings of that UTC month", async () => {
    await call(previous);

    expect(findReadings.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      createdAt: {
        gte: new Date(Date.UTC(previous.year, previous.month - 1, 1)),
        lt: new Date(Date.UTC(previous.year, previous.month, 1)),
      },
    });
  });

  it("writes the recap with the synthesis model and saves it", async () => {
    const response = await call({ ...previous, locale: "es" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.recap.content).toBe("Este mes tus cartas hablaron de soltar.");

    expect(mockComplete).toHaveBeenCalledTimes(1);
    const options = mockComplete.mock.calls[0][0];
    expect(options).toMatchObject({ model: AI_MODELS.synthesis, effort: "medium", maxTokens: 2000 });
    expect(options.user).toContain("«¿Cómo cuido mi energía en el trabajo?»");
    expect(options.user).toContain("Pasado: La Torre (invertida); Presente: La Estrella");
    expect(options.user).toContain("Resonancia: 5/5 — «Me hizo sentido»");

    expect(upsertRecap).toHaveBeenCalledWith({
      where: { userId_year_month: { userId: "user-1", ...previous } },
      create: {
        userId: "user-1",
        ...previous,
        locale: "es",
        content: "Este mes tus cartas hablaron de soltar.",
        readingCount: 3,
      },
      update: { locale: "es", content: "Este mes tus cartas hablaron de soltar.", readingCount: 3 },
    });
  });

  it("writes in English when asked", async () => {
    await call({ ...previous, locale: "en" });

    expect(mockComplete.mock.calls[0][0].user).toContain("Past: The Tower (reversed); Present: The Star");
    expect(upsertRecap.mock.calls[0][0].create.locale).toBe("en");
  });

  it("returns 503 and saves nothing when the AI is unavailable", async () => {
    mockComplete.mockRejectedValue(new AIUnavailableError("529 Overloaded"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await call(previous);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "recap_unavailable", retry: true });
    expect(upsertRecap).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns 422 and saves nothing when the model refuses", async () => {
    mockComplete.mockRejectedValue(new AIRefusalError(undefined, "general_harms"));
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const response = await call(previous);

    expect(response.status).toBe(422);
    expect(upsertRecap).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  describe("current month", () => {
    const currentReadings = threeReadings.map((r, i) => ({
      ...r,
      createdAt: new Date(Date.UTC(current.year, current.month - 1, 1, i)),
    }));

    it("returns the saved recap while there are no new readings", async () => {
      findRecap.mockResolvedValue(storedRecap({ ...current, readingCount: 3 }));
      findReadings.mockResolvedValue(currentReadings);

      const response = await call(current);

      expect((await response.json()).cached).toBe(true);
      expect(mockComplete).not.toHaveBeenCalled();
    });

    it("rewrites it when the month has new readings", async () => {
      findRecap.mockResolvedValue(storedRecap({ ...current, readingCount: 2 }));
      findReadings.mockResolvedValue(currentReadings);

      const response = await call(current);
      const data = await response.json();

      expect(data.cached).toBe(false);
      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(upsertRecap.mock.calls[0][0].update.readingCount).toBe(3);
    });

    it("can be written once it has 3 readings", async () => {
      findReadings.mockResolvedValue(currentReadings);

      const response = await call(current);

      expect(response.status).toBe(200);
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });
  });
});
