/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/readings/[id]/followup/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 4, resetIn: 60000 }),
  rateLimitResponse: jest.fn().mockReturnValue(new Response(null, { status: 429 })),
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    reading: { findUnique: jest.fn() },
    readingFollowUp: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    card: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Keep the real error classes and AI_MODELS; only the network call is mocked.
jest.mock("@/lib/ai/config", () => ({
  ...jest.requireActual("@/lib/ai/config"),
  complete: jest.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { AI_MODELS, AIRefusalError, AIUnavailableError, complete } from "@/lib/ai/config";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  reading: { findUnique: jest.Mock };
  readingFollowUp: { findMany: jest.Mock };
  user: { findUnique: jest.Mock };
  card: { findMany: jest.Mock };
  $transaction: jest.Mock;
};
const mockComplete = complete as jest.Mock;

const READING_ID = "reading-1";

const reading = (followUpCount: number, userId = "user-1") => ({
  id: READING_ID,
  userId,
  intention: "¿Debo cambiar de trabajo este año?",
  interpretation: "La Torre invertida habla de un cambio que ya empezó.",
  cards: [
    { position: 1, cardId: "major_16", isReversed: true, isGolden: false },
    { position: 2, cardId: "major_9", isReversed: false, isGolden: false },
  ],
  spreadType: {
    name: "Two Cards",
    nameEs: "Dos Cartas",
    positions: [
      { position: 1, name: "Past", nameEs: "Pasado", description: "" },
      { position: 2, name: "Present", nameEs: "Presente", description: "" },
    ],
  },
  followUps: Array.from({ length: followUpCount }, (_, i) => ({
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
  })),
});

/**
 * In-memory transaction: `existing` follow-ups already saved and a balance of `credits`.
 * The conditional debit behaves like the real UPDATE … WHERE credits >= amount.
 */
const mockTransaction = (existing: number, credits: number) => {
  const state = { credits, followUps: existing };
  const tx = {
    reading: { update: jest.fn().mockResolvedValue({ id: READING_ID }) },
    readingFollowUp: {
      count: jest.fn(async () => state.followUps),
      create: jest.fn(async ({ data }) => {
        state.followUps += 1;
        return {
          id: `fu-${state.followUps}`,
          question: data.question,
          answer: data.answer,
          creditsCharged: data.creditsCharged,
          createdAt: new Date("2026-11-05T12:00:00Z"),
        };
      }),
    },
    user: {
      updateMany: jest.fn(async ({ where, data }) => {
        if (state.credits < where.credits.gte) return { count: 0 };
        state.credits -= data.credits.decrement;
        return { count: 1 };
      }),
    },
    creditTransaction: { create: jest.fn().mockResolvedValue({}) },
  };
  mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));
  return { tx, state };
};

const givenReading = (followUpCount: number, credits: number, owner = "user-1") => {
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  mockPrisma.reading.findUnique.mockResolvedValue(reading(followUpCount, owner));
  mockPrisma.user.findUnique.mockResolvedValue({ credits });
  mockPrisma.card.findMany.mockResolvedValue([
    { id: "major_16", name: "The Tower", nameEs: "La Torre" },
    { id: "major_9", name: "The Hermit", nameEs: "El Ermitaño" },
  ]);
  return mockTransaction(followUpCount, credits);
};

const params = { params: Promise.resolve({ id: READING_ID }) };

const postRequest = (body: unknown) =>
  new NextRequest(`http://localhost:3000/api/readings/${READING_ID}/followup`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const getRequest = () => new NextRequest(`http://localhost:3000/api/readings/${READING_ID}/followup`);

describe("GET /api/readings/[id]/followup (F-63)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);

    expect((await GET(getRequest(), params)).status).toBe(401);
  });

  it("returns 404 for a reading that doesn't exist and 403 for someone else's", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockPrisma.reading.findUnique.mockResolvedValueOnce(null);
    expect((await GET(getRequest(), params)).status).toBe(404);

    mockPrisma.reading.findUnique.mockResolvedValueOnce({ userId: "someone-else" });
    expect((await GET(getRequest(), params)).status).toBe(403);
    expect(mockPrisma.readingFollowUp.findMany).not.toHaveBeenCalled();
  });

  it("lists the follow-ups oldest first with what's left", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockPrisma.reading.findUnique.mockResolvedValue({ userId: "user-1" });
    mockPrisma.readingFollowUp.findMany.mockResolvedValue([
      { id: "fu-1", question: "Q1", answer: "A1", creditsCharged: 0, createdAt: new Date() },
      { id: "fu-2", question: "Q2", answer: "A2", creditsCharged: 1, createdAt: new Date() },
    ]);

    const response = await GET(getRequest(), params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.readingFollowUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { readingId: READING_ID }, orderBy: { createdAt: "asc" } })
    );
    expect(data.followUps.map((f: { id: string }) => f.id)).toEqual(["fu-1", "fu-2"]);
    expect(data).toEqual(expect.objectContaining({ limit: 5, remaining: 3, nextCost: 1 }));
  });
});

describe("POST /api/readings/[id]/followup (F-63)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockReturnValue({ success: true, remaining: 4, resetIn: 60000 });
    mockComplete.mockResolvedValue("Una respuesta en dos párrafos.");
  });

  it("is rate limited to 5 per minute", async () => {
    (rateLimit as jest.Mock).mockReturnValueOnce({ success: false, remaining: 0, resetIn: 1000 });

    const response = await POST(postRequest({ question: "¿Y ahora?" }), params);

    expect(response.status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith(expect.anything(), 5, 60000);
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);

    expect((await POST(postRequest({ question: "¿Y ahora?" }), params)).status).toBe(401);
  });

  it.each([
    ["an empty question", { question: "   " }],
    ["a missing question", {}],
    ["a question over 500 characters", { question: "a".repeat(501) }],
  ])("returns 400 for %s without calling the AI", async (_label, body) => {
    givenReading(0, 0);

    const response = await POST(postRequest(body), params);

    expect(response.status).toBe(400);
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it("returns 403 on someone else's reading", async () => {
    givenReading(0, 5, "someone-else");

    const response = await POST(postRequest({ question: "¿Y ahora?" }), params);

    expect(response.status).toBe(403);
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it("answers the first question for free", async () => {
    const { tx, state } = givenReading(0, 0);

    const response = await POST(postRequest({ question: "  ¿Cómo sé si estoy lista?  " }), params);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.followUp).toEqual(
      expect.objectContaining({ question: "¿Cómo sé si estoy lista?", answer: "Una respuesta en dos párrafos.", creditsCharged: 0 })
    );
    expect(data).toEqual(expect.objectContaining({ limit: 5, remaining: 4, nextCost: 1 }));
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    expect(tx.readingFollowUp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          readingId: READING_ID,
          userId: "user-1",
          question: "¿Cómo sé si estoy lista?",
          answer: "Una respuesta en dos párrafos.",
          creditsCharged: 0,
        },
      })
    );
    expect(state.credits).toBe(0);
  });

  it("calls the AI with the reading model, low effort, 1200 tokens and the reading's context", async () => {
    givenReading(1, 3);

    await POST(postRequest({ question: "¿Qué me pide El Ermitaño?", locale: "es" }), params);

    expect(mockComplete).toHaveBeenCalledTimes(1);
    const call = mockComplete.mock.calls[0][0];
    expect(call).toEqual(
      expect.objectContaining({ model: AI_MODELS.reading, effort: "low", maxTokens: 1200 })
    );
    expect(call.user).toContain("¿Debo cambiar de trabajo este año?");
    expect(call.user).toContain("Posición 1 · Pasado: La Torre (invertida)");
    expect(call.user).toContain("Posición 2 · Presente: El Ermitaño");
    expect(call.user).toContain("La Torre invertida habla de un cambio que ya empezó.");
    expect(call.user).toContain("Pregunta: Pregunta 1");
    expect(call.user).toContain("¿Qué me pide El Ermitaño?");
    expect(call.system).toContain("No sacas cartas nuevas");
  });

  it("charges 1 credit from the second question on, with a conditional debit", async () => {
    const { tx, state } = givenReading(1, 3);

    const response = await POST(postRequest({ question: "¿Y en el trabajo?" }), params);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.followUp.creditsCharged).toBe(1);
    expect(data).toEqual(expect.objectContaining({ remaining: 3, nextCost: 1 }));
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", credits: { gte: 1 } },
      data: { credits: { decrement: 1 } },
    });
    // No readingId: the reading's own READING transaction already holds that unique link
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: "user-1", amount: -1, type: "FOLLOWUP" },
    });
    expect(state.credits).toBe(2);
    // The reading row is locked before counting, so concurrent questions are counted in order
    expect(tx.reading.update.mock.invocationCallOrder[0]).toBeLessThan(
      tx.readingFollowUp.count.mock.invocationCallOrder[0]
    );
  });

  it("returns 409 on the sixth question without calling the AI or charging", async () => {
    const { tx } = givenReading(5, 10);

    const response = await POST(postRequest({ question: "¿Una más?" }), params);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "followup_limit" });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(tx.readingFollowUp.create).not.toHaveBeenCalled();
  });

  it("returns 409 if another question took the last slot while the AI was answering", async () => {
    const { tx, state } = givenReading(4, 10);
    state.followUps = 5; // a concurrent request saved the fifth one first

    const response = await POST(postRequest({ question: "¿Una más?" }), params);

    expect(response.status).toBe(409);
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.readingFollowUp.create).not.toHaveBeenCalled();
  });

  it("returns 403 insufficient_credits without credits for a paid question, and saves nothing", async () => {
    const { tx } = givenReading(1, 0);

    const response = await POST(postRequest({ question: "¿Y en el amor?" }), params);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "insufficient_credits" });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(tx.readingFollowUp.create).not.toHaveBeenCalled();
  });

  it("returns 403 and saves nothing if the balance ran out before the debit", async () => {
    const { tx, state } = givenReading(1, 1);
    state.credits = 0; // spent elsewhere while the AI was answering

    const response = await POST(postRequest({ question: "¿Y en el amor?" }), params);

    expect(response.status).toBe(403);
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    expect(tx.readingFollowUp.create).not.toHaveBeenCalled();
  });

  it("returns 503 and neither charges nor saves when the AI fails", async () => {
    const { tx, state } = givenReading(1, 3);
    mockComplete.mockRejectedValueOnce(new AIUnavailableError("529 Overloaded"));

    const response = await POST(postRequest({ question: "¿Y en el amor?" }), params);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "interpretation_unavailable", retry: true });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(tx.readingFollowUp.create).not.toHaveBeenCalled();
    expect(state.credits).toBe(3);
  });

  it("returns 422 when the model declines, without charging", async () => {
    givenReading(1, 3);
    mockComplete.mockRejectedValueOnce(new AIRefusalError(undefined, "general_harms"));

    const response = await POST(postRequest({ question: "¿Y en el amor?" }), params);

    expect(response.status).toBe(422);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
