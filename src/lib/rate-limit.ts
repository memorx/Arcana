// Simple in-memory rate limiter (for production, use Redis with @upstash/ratelimit)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const configs: Record<string, RateLimitConfig> = {
  reading: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  register: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
};

export function rateLimit(
  identifier: string,
  type: keyof typeof configs = "api"
): { success: boolean; remaining: number; resetAt: number } {
  const config = configs[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Helper to get client IP from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

// Middleware helper for rate limiting
export function checkRateLimit(
  request: Request,
  type: keyof typeof configs = "api"
) {
  const ip = getClientIP(request);
  const result = rateLimit(ip, type);

  if (!result.success) {
    return {
      limited: true,
      headers: {
        "X-RateLimit-Limit": configs[type].maxRequests.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetAt.toString(),
        "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
      },
    };
  }

  return {
    limited: false,
    headers: {
      "X-RateLimit-Limit": configs[type].maxRequests.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.resetAt.toString(),
    },
  };
}
