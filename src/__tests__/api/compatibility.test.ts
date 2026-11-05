/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/compatibility/route";
import { GET as GET_ONE } from "@/app/api/compatibility/[id]/route";
import { AIRefusalError, AIUnavailableError, AI_MODELS } from "@/lib/ai/config";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 2, resetIn: 60000 }),
  rateLimitResponse: jest.fn(() => new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })),
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), updateMany: jest.fn() },
    card: { findMany: jest.fn() },
    creditTransaction: { create: jest.fn() },
    compatibilityReading: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Keep the real error classes and models; only the network call is mocked.
jest.mock("@/lib/ai/config", () => {
  const actual = jest.requireActual("@/lib/ai/config");
  return { ...actual, complete: jest.fn() };
});

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/ai/config";
import { rateLimit } from "@/lib/rate-limit";

const mockAuth = auth as jest.Mock;
const mockComplete = complete as jest.Mock;
const mockRateLimit = rateLimit as jest.Mock;
const db = prisma as unknown as {
  user: { findUnique: jest.Mock; updateMany: jest.Mock };
  card: { findMany: jest.Mock };
  creditTransaction: { create: jest.Mock };
  compatibilityReading: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
  $transaction: jest.Mock;
};

const AI_TEXT = "Cómo se encuentran\n\nAna y tú se encuentran en un lugar de calma.";

const deck = [
  { id: "major_1", name: "The Magician", nameEs: "El Mago", imageUrl: "/cards/magician.jpg", arcana: "MAJOR", suit: null, number: 1 },
  { id: "major_2", name: "The High Priestess", nameEs: "La Sacerdotisa", imageUrl: "/cards/priestess.jpg", arcana: "MAJOR", suit: null, number: 2 },
  { id: "major_6", name: "The Lovers", nameEs: "Los Enamorados", imageUrl: "/cards/lovers.jpg", arcana: "MAJOR", suit: null, number: 6 },
  { id: "cups_2", name: "Two of Cups", nameEs: "Dos de Copas", imageUrl: "/cards/cups-2.jpg", arcana: "MINOR", suit: "CUPS", number: 2 },
];

const PROFILE = { birthDate: new Date(Date.UTC(1990, 6, 15)), fullName: "John Smith", locale: "es" };

const givenUser = (credits: number, profile: typeof PROFILE | null = PROFILE) => {
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  db.user.findUnique.mockResolvedValue({ id: "user-1", credits, profile });
  db.card.findMany.mockResolvedValue(deck);
};

/** Transaction client whose conditional debit returns `debitCount`. */
const givenTransaction = (debitCount: number) => {
  const tx = {
    user: { updateMany: jest.fn().mockResolvedValue({ count: debitCount }) },
    creditTransaction: { create: jest.fn().mockResolvedValue({}) },
    compatibilityReading: {
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: "compat-1",
        partnerName: data.partnerName,
        partnerBirthDate: data.partnerBirthDate,
        locale: data.locale,
        createdAt: new Date("2026-11-05T12:00:00Z"),
      })),
    },
  };
  db.$transaction.mockImplementation(async (callback: (t: typeof tx) => unknown) => callback(tx));
  return tx;
};

const post = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/compatibility", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const validBody = { partnerName: "Ana", partnerBirthDate: "1992-03-03", partnerFullName: "Ana Sofía Pérez", locale: "es" };

beforeEach(() => {
  jest.clearAllMocks();
  mockRateLimit.mockReturnValue({ success: true, remaining: 2, resetIn: 60000 });
  mockComplete.mockResolvedValue(AI_TEXT);
});

describe("POST /api/compatibility", () => {
  it("is limited to 3 requests per minute", async () => {
    mockRateLimit.mockReturnValueOnce({ success: false, remaining: 0, resetIn: 30000 });
    const response = await POST(post(validBody));
    expect(response.status).toBe(429);
    expect(mockRateLimit).toHaveBeenCalledWith(expect.anything(), 3, 60000);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await POST(post(validBody));
    expect(response.status).toBe(401);
  });

  it("returns 404 profile_required without a profile, before calling the AI", async () => {
    givenUser(10, null);
    const response = await POST(post(validBody));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "profile_required" });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 profile_required when the profile has no full name", async () => {
    givenUser(10, { ...PROFILE, fullName: "  " });
    const response = await POST(post(validBody));
    expect(response.status).toBe(404);
  });

  it.each([
    [{ ...validBody, partnerBirthDate: undefined }, "invalid_partner_birth_date"],
    [{ ...validBody, partnerBirthDate: "03/03/1992" }, "invalid_partner_birth_date"],
    [{ ...validBody, partnerBirthDate: "1992-02-30" }, "invalid_partner_birth_date"],
    [{ ...validBody, partnerBirthDate: "2999-01-01" }, "invalid_partner_birth_date"],
    [{ ...validBody, partnerName: "x".repeat(61) }, "invalid_partner_name"],
    [{ ...validBody, partnerName: 42 }, "invalid_partner_name"],
    [{ ...validBody, partnerFullName: "x".repeat(81) }, "invalid_partner_full_name"],
  ])("returns 400 for %j", async (body, error) => {
    givenUser(10);
    const response = await POST(post(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(error);
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that isn't JSON", async () => {
    givenUser(10);
    const response = await POST(post("not json"));
    expect(response.status).toBe(400);
  });

  it("returns 403 insufficient_credits with fewer than 2 credits, without calling the AI or saving", async () => {
    givenUser(1);
    const tx = givenTransaction(1);
    const response = await POST(post(validBody));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "insufficient_credits" });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(tx.compatibilityReading.create).not.toHaveBeenCalled();
  });

  it("returns 503 and charges nothing when the AI fails", async () => {
    givenUser(10);
    const tx = givenTransaction(1);
    mockComplete.mockRejectedValueOnce(new AIUnavailableError("529 Overloaded"));

    const response = await POST(post(validBody));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "interpretation_unavailable", retry: true });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.user.updateMany).not.toHaveBeenCalled();
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    expect(tx.compatibilityReading.create).not.toHaveBeenCalled();
  });

  it("returns 422 and charges nothing when the model refuses", async () => {
    givenUser(10);
    const tx = givenTransaction(1);
    mockComplete.mockRejectedValueOnce(new AIRefusalError(undefined, "general_harms"));

    const response = await POST(post(validBody));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "interpretation_refused" });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(tx.compatibilityReading.create).not.toHaveBeenCalled();
  });

  it("returns 403 and saves nothing when the conditional debit doesn't go through", async () => {
    // The early check sees 2 credits, but a concurrent request spent them first
    givenUser(2);
    const tx = givenTransaction(0);

    const response = await POST(post(validBody));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "insufficient_credits" });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", credits: { gte: 2 } },
      data: { credits: { decrement: 2 } },
    });
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    expect(tx.compatibilityReading.create).not.toHaveBeenCalled();
  });

  it("writes with the synthesis model, then charges 2 credits and saves the reading", async () => {
    givenUser(5);
    const tx = givenTransaction(1);

    const response = await POST(post(validBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.reading.id).toBe("compat-1");
    expect(data.reading.content).toBe(AI_TEXT);
    expect(data.reading.partnerBirthDate).toBe("1992-03-03");
    expect(data.creditsCharged).toBe(2);

    // AI call
    expect(mockComplete).toHaveBeenCalledTimes(1);
    const aiCall = mockComplete.mock.calls[0][0];
    expect(aiCall).toEqual(
      expect.objectContaining({ model: AI_MODELS.synthesis, effort: "medium", maxTokens: 2500 })
    );
    expect(aiCall.system).toContain("Responde siempre en español");
    expect(aiCall.user).toContain("John");
    expect(aiCall.user).toContain("Ana");
    expect(aiCall.user).not.toContain("Sofía Pérez");

    // Charge: 2 credits, conditional, typed COMPATIBILITY
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", credits: { gte: 2 } },
      data: { credits: { decrement: 2 } },
    });
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: "user-1", amount: -2, type: "COMPATIBILITY" },
    });

    // Saved reading
    expect(tx.compatibilityReading.create).toHaveBeenCalledTimes(1);
    const saved = tx.compatibilityReading.create.mock.calls[0][0].data;
    expect(saved).toEqual(
      expect.objectContaining({
        userId: "user-1",
        partnerName: "Ana",
        partnerBirthDate: new Date(Date.UTC(1992, 2, 3)),
        locale: "es",
        content: AI_TEXT,
      })
    );
    expect(Object.keys(saved).sort()).toEqual(
      ["userId", "partnerName", "partnerBirthDate", "locale", "content", "summary"].sort()
    );
    // The partner's full name is only used for the numerology; it is never stored
    expect(JSON.stringify(saved)).not.toContain("Sofía");

    // Summary: scores per system + the three cards with their roles
    const summary = saved.summary;
    expect(summary.version).toBe(1);
    expect(Object.keys(summary.scores).sort()).toEqual(["chinese", "numerology", "overall", "tonalli", "western"]);
    expect(summary.cards).toHaveLength(3);
    expect(summary.cards.map((c: { role: string }) => c.role)).toEqual(["me", "partner", "bond"]);
    expect(summary.cards.map((c: { roleLabel: { es: string } }) => c.roleLabel.es)).toEqual([
      "Tú",
      "La otra persona",
      "El vínculo",
    ]);
    expect(new Set(summary.cards.map((c: { cardId: string }) => c.cardId)).size).toBe(3);
    for (const card of summary.cards) {
      expect(Object.keys(card)).toEqual(
        expect.arrayContaining(["position", "cardId", "isReversed", "name", "nameEs", "imageUrl"])
      );
      expect(card).not.toHaveProperty("isGolden");
    }
    // Both full names given → name numerology is part of the bond
    expect(summary.systems.numerology.names).not.toBeNull();
  });

  it("without the partner's full name uses only the life paths", async () => {
    givenUser(5);
    const tx = givenTransaction(1);

    const response = await POST(post({ partnerBirthDate: "1992-03-03" }));

    expect(response.status).toBe(201);
    const saved = tx.compatibilityReading.create.mock.calls[0][0].data;
    expect(saved.partnerName).toBeNull();
    expect(saved.summary.systems.numerology.names).toBeNull();
    expect(mockComplete.mock.calls[0][0].user).toContain("la otra persona");
  });

  it("writes in English when the interface is in English", async () => {
    givenUser(5);
    givenTransaction(1);

    await POST(post({ ...validBody, locale: "en" }));

    const aiCall = mockComplete.mock.calls[0][0];
    expect(aiCall.system).toContain("Always respond in English");
    expect(aiCall.user).toContain("Reading for two");
    expect(aiCall.user).toContain("The Magician"); // card names in English
  });

  it("falls back to the profile language when the request has none", async () => {
    givenUser(5, { ...PROFILE, locale: "en" });
    const tx = givenTransaction(1);

    await POST(post({ partnerBirthDate: "1992-03-03" }));

    expect(tx.compatibilityReading.create.mock.calls[0][0].data.locale).toBe("en");
  });
});

describe("GET /api/compatibility", () => {
  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("lists only my readings with their overall score", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    db.compatibilityReading.findMany.mockResolvedValue([
      {
        id: "c2",
        partnerName: "Ana",
        partnerBirthDate: new Date(Date.UTC(1992, 2, 3)),
        summary: { version: 1, scores: { overall: 4 } },
        createdAt: new Date("2026-11-05T12:00:00Z"),
      },
      {
        id: "c1",
        partnerName: null,
        partnerBirthDate: new Date(Date.UTC(1988, 7, 8)),
        summary: {},
        createdAt: new Date("2026-11-01T12:00:00Z"),
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.compatibilityReading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, orderBy: { createdAt: "desc" } })
    );
    expect(data.readings).toEqual([
      { id: "c2", partnerName: "Ana", partnerBirthDate: "1992-03-03", overall: 4, createdAt: "2026-11-05T12:00:00.000Z" },
      { id: "c1", partnerName: null, partnerBirthDate: "1988-08-08", overall: null, createdAt: "2026-11-01T12:00:00.000Z" },
    ]);
  });
});

describe("GET /api/compatibility/[id]", () => {
  const getOne = (id: string) =>
    GET_ONE(new NextRequest(`http://localhost:3000/api/compatibility/${id}`), {
      params: Promise.resolve({ id }),
    });

  const stored = {
    id: "compat-1",
    userId: "user-1",
    partnerName: "Ana",
    partnerBirthDate: new Date(Date.UTC(1992, 2, 3)),
    locale: "es",
    content: AI_TEXT,
    summary: { version: 1 },
    createdAt: new Date("2026-11-05T12:00:00Z"),
  };

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await getOne("compat-1")).status).toBe(401);
  });

  it("returns 404 when it doesn't exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    db.compatibilityReading.findUnique.mockResolvedValue(null);
    expect((await getOne("nope")).status).toBe(404);
  });

  it("returns 403 for someone else's reading", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    db.compatibilityReading.findUnique.mockResolvedValue(stored);
    const response = await getOne("compat-1");
    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain("Ana");
  });

  it("returns the reading to its owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    db.compatibilityReading.findUnique.mockResolvedValue(stored);
    const response = await getOne("compat-1");
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.reading).toEqual({
      id: "compat-1",
      partnerName: "Ana",
      partnerBirthDate: "1992-03-03",
      locale: "es",
      content: AI_TEXT,
      summary: { version: 1 },
      createdAt: "2026-11-05T12:00:00.000Z",
    });
    expect(data.reading).not.toHaveProperty("userId");
  });
});
