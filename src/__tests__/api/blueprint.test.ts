/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/blueprint/route";
import { POST as POST_SYNTHESIS } from "@/app/api/blueprint/synthesis/route";
import { POST as POST_SHARE, DELETE as DELETE_SHARE } from "@/app/api/blueprint/share/route";
import { blueprintInputsHash } from "@/lib/ai/blueprint-synthesis";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 2, resetIn: 60000 }),
  rateLimitResponse: jest.fn(
    () => new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: jest.fn() },
    arcanaProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

// Keep the real error classes and AI_MODELS; only the network call is mocked.
jest.mock("@/lib/ai/config", () => {
  const actual = jest.requireActual("@/lib/ai/config");
  return { ...actual, complete: jest.fn() };
});

// nanoid 5 is ESM-only; the route only needs an id.
jest.mock("nanoid", () => ({ nanoid: jest.fn(() => "shr4Ab9xYz") }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { AI_MODELS, AIRefusalError, AIUnavailableError, complete } from "@/lib/ai/config";
import { nanoid } from "nanoid";

const mockAuth = auth as jest.Mock;
const mockRateLimit = rateLimit as jest.Mock;
const mockComplete = complete as jest.Mock;
const mockNanoid = nanoid as unknown as jest.Mock;
const userProfile = prisma.userProfile as unknown as { findUnique: jest.Mock };
const arcanaProfile = prisma.arcanaProfile as unknown as {
  findUnique: jest.Mock;
  upsert: jest.Mock;
  updateMany: jest.Mock;
};

const birthDate = new Date("1990-07-15T00:00:00.000Z");
const profile = { birthDate, fullName: "Ana Sofía López", locale: "es" };
const currentHash = blueprintInputsHash(birthDate, "Ana Sofía López", "es");

const request = (method: string, path: string) =>
  new NextRequest(`http://localhost:3000${path}`, { method });

describe("Arcana Map API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockReturnValue({ success: true, remaining: 2, resetIn: 60000 });
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "ana@example.com" } });
    userProfile.findUnique.mockResolvedValue(profile);
    arcanaProfile.findUnique.mockResolvedValue(null);
    mockComplete.mockResolvedValue("Retrato.\n\nConvergen.\n\nTensión.\n\n¿Uno?\n¿Dos?\n¿Tres?");
    arcanaProfile.upsert.mockImplementation(async ({ create }) => ({
      synthesis: create.synthesis,
      shareId: null,
    }));
  });

  describe("GET /api/blueprint", () => {
    it("401 without a session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET(request("GET", "/api/blueprint"));
      expect(res.status).toBe(401);
    });

    it("404 profile_required without a profile", async () => {
      userProfile.findUnique.mockResolvedValue(null);
      const res = await GET(request("GET", "/api/blueprint"));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "profile_required" });
    });

    it("returns the blueprint, the cached synthesis when the hash matches, and the shareId", async () => {
      arcanaProfile.findUnique.mockResolvedValue({
        synthesis: "Tu síntesis",
        inputsHash: currentHash,
        shareId: "abc123defg",
      });
      const res = await GET(request("GET", "/api/blueprint"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.synthesis).toBe("Tu síntesis");
      expect(data.shareId).toBe("abc123defg");
      expect(data.blueprint.birthDate).toBe("1990-07-15");
      expect(data.blueprint.western.key).toBe("Cancer");
      expect(data.blueprint.numerology.lifePath).toBe(5);
      expect(data.blueprint.birthCards.personality).toBe(5);
    });

    it("hides a synthesis written for other inputs (profile changed)", async () => {
      arcanaProfile.findUnique.mockResolvedValue({
        synthesis: "Old text",
        inputsHash: blueprintInputsHash(birthDate, "Ana", "es"),
        shareId: null,
      });
      const data = await (await GET(request("GET", "/api/blueprint"))).json();
      expect(data.synthesis).toBeNull();
      expect(data.shareId).toBeNull();
    });

    it("429 when rate limited, without touching the database", async () => {
      mockRateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 30000 });
      const res = await GET(request("GET", "/api/blueprint"));
      expect(res.status).toBe(429);
      expect(userProfile.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/blueprint/synthesis", () => {
    it("401 without a session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(401);
      expect(mockComplete).not.toHaveBeenCalled();
    });

    it("404 profile_required without a profile and no AI call", async () => {
      userProfile.findUnique.mockResolvedValue(null);
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "profile_required" });
      expect(mockComplete).not.toHaveBeenCalled();
    });

    it("returns the cached synthesis without calling the AI when the hash matches", async () => {
      arcanaProfile.findUnique.mockResolvedValue({
        synthesis: "Ya escrita",
        inputsHash: currentHash,
        shareId: "abc123defg",
      });
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ synthesis: "Ya escrita", shareId: "abc123defg", cached: true });
      expect(mockComplete).not.toHaveBeenCalled();
      expect(arcanaProfile.upsert).not.toHaveBeenCalled();
    });

    it("generates with the synthesis model (effort medium, 2500 tokens) and upserts with the hash", async () => {
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.cached).toBe(false);
      expect(data.synthesis).toContain("Retrato.");

      expect(mockComplete).toHaveBeenCalledTimes(1);
      const opts = mockComplete.mock.calls[0][0];
      expect(opts.model).toBe(AI_MODELS.synthesis);
      expect(opts.effort).toBe("medium");
      expect(opts.maxTokens).toBe(2500);
      expect(opts.user).toContain("Ana");
      expect(opts.system).toContain("Responde siempre en español");

      expect(arcanaProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          create: expect.objectContaining({ userId: "user-1", locale: "es", inputsHash: currentHash }),
          update: expect.objectContaining({ locale: "es", inputsHash: currentHash }),
        })
      );
    });

    it("regenerates when the cached synthesis belongs to other inputs", async () => {
      arcanaProfile.findUnique.mockResolvedValue({
        synthesis: "Old text",
        inputsHash: blueprintInputsHash(birthDate, "Ana Sofía López", "en"),
        shareId: "abc123defg",
      });
      arcanaProfile.upsert.mockResolvedValue({ synthesis: "Nueva", shareId: "abc123defg" });
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(200);
      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(await res.json()).toEqual({ synthesis: "Nueva", shareId: "abc123defg", cached: false });
    });

    it("writes in the profile's language", async () => {
      userProfile.findUnique.mockResolvedValue({ ...profile, locale: "en" });
      await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      const opts = mockComplete.mock.calls[0][0];
      expect(opts.system).toContain("Always respond in English");
      expect(arcanaProfile.upsert.mock.calls[0][0].create.inputsHash).toBe(
        blueprintInputsHash(birthDate, "Ana Sofía López", "en")
      );
    });

    it("503 synthesis_unavailable with retry when the AI fails, and saves nothing", async () => {
      mockComplete.mockRejectedValue(new AIUnavailableError("overloaded"));
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "synthesis_unavailable", retry: true });
      expect(arcanaProfile.upsert).not.toHaveBeenCalled();
    });

    it("503 on an unexpected AI error too", async () => {
      mockComplete.mockRejectedValue(new Error("boom"));
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(503);
      expect(arcanaProfile.upsert).not.toHaveBeenCalled();
    });

    it("422 synthesis_refused when the model declines, and saves nothing", async () => {
      mockComplete.mockRejectedValue(new AIRefusalError());
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "synthesis_refused" });
      expect(arcanaProfile.upsert).not.toHaveBeenCalled();
    });

    it("429 when rate limited, without calling the AI", async () => {
      mockRateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 30000 });
      const res = await POST_SYNTHESIS(request("POST", "/api/blueprint/synthesis"));
      expect(res.status).toBe(429);
      expect(mockComplete).not.toHaveBeenCalled();
      expect(mockRateLimit).toHaveBeenCalledWith(expect.anything(), 3, 60000);
    });
  });

  describe("POST/DELETE /api/blueprint/share", () => {
    it("401 without a session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await POST_SHARE(request("POST", "/api/blueprint/share"))).status).toBe(401);
      expect((await DELETE_SHARE(request("DELETE", "/api/blueprint/share"))).status).toBe(401);
    });

    it("409 synthesis_required when there is no saved synthesis", async () => {
      const res = await POST_SHARE(request("POST", "/api/blueprint/share"));
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "synthesis_required" });
      expect(arcanaProfile.updateMany).not.toHaveBeenCalled();
    });

    it("creates the share id once and returns the same one afterwards", async () => {
      // First call: no link yet.
      arcanaProfile.findUnique.mockResolvedValueOnce({ shareId: null });
      arcanaProfile.updateMany.mockResolvedValueOnce({ count: 1 });
      const first = await POST_SHARE(request("POST", "/api/blueprint/share"));
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({
        shareId: "shr4Ab9xYz",
        sharePath: "/share/blueprint/shr4Ab9xYz",
      });
      expect(mockNanoid).toHaveBeenCalledWith(10);
      expect(arcanaProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", shareId: null },
        data: { shareId: "shr4Ab9xYz" },
      });

      // Second call: the link exists, nothing new is created.
      arcanaProfile.findUnique.mockResolvedValueOnce({ shareId: "shr4Ab9xYz" });
      const second = await POST_SHARE(request("POST", "/api/blueprint/share"));
      expect(await second.json()).toEqual({
        shareId: "shr4Ab9xYz",
        sharePath: "/share/blueprint/shr4Ab9xYz",
      });
      expect(mockNanoid).toHaveBeenCalledTimes(1);
      expect(arcanaProfile.updateMany).toHaveBeenCalledTimes(1);
    });

    it("returns the link another request created in the meantime", async () => {
      arcanaProfile.findUnique
        .mockResolvedValueOnce({ shareId: null })
        .mockResolvedValueOnce({ shareId: "winner1234" });
      arcanaProfile.updateMany.mockResolvedValueOnce({ count: 0 });
      const res = await POST_SHARE(request("POST", "/api/blueprint/share"));
      expect(await res.json()).toEqual({ shareId: "winner1234", sharePath: "/share/blueprint/winner1234" });
    });

    it("DELETE removes the link", async () => {
      arcanaProfile.updateMany.mockResolvedValue({ count: 1 });
      const res = await DELETE_SHARE(request("DELETE", "/api/blueprint/share"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ shareId: null });
      expect(arcanaProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { shareId: null },
      });
    });

    it("429 when rate limited", async () => {
      mockRateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 30000 });
      expect((await POST_SHARE(request("POST", "/api/blueprint/share"))).status).toBe(429);
      expect(arcanaProfile.findUnique).not.toHaveBeenCalled();
    });
  });
});
