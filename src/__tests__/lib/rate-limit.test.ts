/**
 * @jest-environment node
 */
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

describe("rateLimit", () => {
  const createRequest = (path: string, ip?: string) => {
    const headers = new Headers();
    if (ip) {
      headers.set("x-forwarded-for", ip);
    }
    return new NextRequest(`http://localhost:3000${path}`, {
      method: "POST",
      headers,
    });
  };

  it("allows first request within limit", () => {
    const request = createRequest("/api/test", "192.168.1.1");
    const result = rateLimit(request, 5, 60000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("decrements remaining count on each request", () => {
    const request = createRequest("/api/test-decrement", "192.168.1.2");

    const result1 = rateLimit(request, 5, 60000);
    expect(result1.remaining).toBe(4);

    const result2 = rateLimit(request, 5, 60000);
    expect(result2.remaining).toBe(3);

    const result3 = rateLimit(request, 5, 60000);
    expect(result3.remaining).toBe(2);
  });

  it("blocks requests when limit exceeded", () => {
    const request = createRequest("/api/test-block", "192.168.1.3");

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      rateLimit(request, 3, 60000);
    }

    // This should be blocked
    const result = rateLimit(request, 3, 60000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("uses anonymous when no IP provided", () => {
    const request = createRequest("/api/test-anon");
    const result = rateLimit(request, 5, 60000);

    expect(result.success).toBe(true);
  });

  it("tracks different paths separately", () => {
    const request1 = createRequest("/api/path1", "192.168.1.5");
    const request2 = createRequest("/api/path2", "192.168.1.5");

    // Exhaust limit on path1
    for (let i = 0; i < 2; i++) {
      rateLimit(request1, 2, 60000);
    }

    // Should be blocked on path1
    expect(rateLimit(request1, 2, 60000).success).toBe(false);

    // Should still work on path2
    expect(rateLimit(request2, 2, 60000).success).toBe(true);
  });

  it("tracks different IPs separately", () => {
    const request1 = createRequest("/api/test-ip", "192.168.1.10");
    const request2 = createRequest("/api/test-ip", "192.168.1.11");

    // Exhaust limit for IP 1
    for (let i = 0; i < 2; i++) {
      rateLimit(request1, 2, 60000);
    }

    // Should be blocked for IP 1
    expect(rateLimit(request1, 2, 60000).success).toBe(false);

    // Should still work for IP 2
    expect(rateLimit(request2, 2, 60000).success).toBe(true);
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 status", () => {
    const response = rateLimitResponse(30000);
    expect(response.status).toBe(429);
  });

  it("includes Retry-After header", () => {
    const response = rateLimitResponse(30000);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  it("includes error message in body", async () => {
    const response = rateLimitResponse(30000);
    const body = await response.json();

    expect(body.error).toContain("Too many requests");
    expect(body.retryAfter).toBe(30);
  });
});
