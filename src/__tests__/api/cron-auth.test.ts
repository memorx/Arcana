/**
 * @jest-environment node
 */
jest.mock("node:crypto", () => {
  // Real crypto; timingSafeEqual wrapped so the test can see what it compares (F-91)
  const actual = jest.requireActual("node:crypto");
  return { ...actual, timingSafeEqual: jest.fn(actual.timingSafeEqual) };
});

import { timingSafeEqual } from "node:crypto";
import { verifyCronRequest } from "@/lib/cron-auth";

const mockTimingSafeEqual = timingSafeEqual as jest.Mock;

const request = (authorization?: string) =>
  new Request("http://localhost:3000/api/cron/daily-readings", {
    headers: authorization === undefined ? {} : { authorization },
  });

describe("verifyCronRequest", () => {
  const originalSecret = process.env.CRON_SECRET;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  describe("without CRON_SECRET", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
    });

    it("returns 500 instead of comparing against 'Bearer undefined'", async () => {
      const response = verifyCronRequest(request("Bearer undefined"));

      expect(response).not.toBeNull();
      expect(response!.status).toBe(500);
      expect(await response!.json()).toEqual({ error: "CRON_SECRET not configured" });
    });

    it("returns 500 even with no header", () => {
      expect(verifyCronRequest(request())!.status).toBe(500);
    });

    it("treats a blank secret as not configured", () => {
      process.env.CRON_SECRET = "   ";
      expect(verifyCronRequest(request("Bearer    "))!.status).toBe(500);
    });
  });

  describe("with CRON_SECRET", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = "s3cret-value";
    });

    it("accepts the right bearer token", () => {
      expect(verifyCronRequest(request("Bearer s3cret-value"))).toBeNull();
    });

    it("rejects a missing header with 401", async () => {
      const response = verifyCronRequest(request());

      expect(response!.status).toBe(401);
      expect(await response!.json()).toEqual({ error: "Unauthorized" });
    });

    it("rejects a wrong token of the same length", () => {
      expect(verifyCronRequest(request("Bearer s3cret-valuf"))!.status).toBe(401);
    });

    it("rejects a token of a different length", () => {
      expect(verifyCronRequest(request("Bearer s3cret"))!.status).toBe(401);
      expect(verifyCronRequest(request("Bearer s3cret-value-and-more"))!.status).toBe(401);
    });

    it("rejects the secret without the Bearer prefix", () => {
      expect(verifyCronRequest(request("s3cret-value"))!.status).toBe(401);
    });

    it("rejects 'Bearer undefined'", () => {
      expect(verifyCronRequest(request("Bearer undefined"))!.status).toBe(401);
    });

    it.each([
      ["the right token", "Bearer s3cret-value"],
      ["a shorter token", "Bearer s3cret"],
      ["a longer token", "Bearer s3cret-value-and-more"],
      ["no header", undefined],
    ])("compares %s with timingSafeEqual over two 32-byte buffers", (_label, authorization) => {
      mockTimingSafeEqual.mockClear();

      verifyCronRequest(request(authorization));

      expect(mockTimingSafeEqual).toHaveBeenCalledTimes(1);
      const [received, expected] = mockTimingSafeEqual.mock.calls[0];
      expect(Buffer.isBuffer(received)).toBe(true);
      expect(Buffer.isBuffer(expected)).toBe(true);
      expect(received).toHaveLength(32);
      expect(expected).toHaveLength(32);
    });
  });
});
