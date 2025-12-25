import { NextRequest } from "next/server";

// Simple in-memory rate limiter
// For production with multiple instances, use Redis
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.lastReset > 300000) {
        rateLimitMap.delete(key);
      }
    }
  }, 300000);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

export function rateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  if (!record || now - record.lastReset > windowMs) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return { success: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: windowMs - (now - record.lastReset),
    };
  }

  record.count++;
  return {
    success: true,
    remaining: limit - record.count,
    resetIn: windowMs - (now - record.lastReset),
  };
}

// Helper for API responses
export function rateLimitResponse(resetIn: number) {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(resetIn / 1000)),
      },
    }
  );
}
