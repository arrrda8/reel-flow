/**
 * Simple in-memory rate limiter for API routes.
 *
 * For production with multiple instances behind a load balancer,
 * replace the in-memory Map with a Redis-backed implementation
 * (e.g. using the existing ioredis connection).
 *
 * Usage in an API route:
 *
 *   import { rateLimit } from "@/lib/rate-limit";
 *
 *   const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
 *   const { success, remaining } = rateLimit(`api:${ip}`, 30, 60_000);
 *   if (!success) {
 *     return Response.json({ error: "Too many requests" }, { status: 429 });
 *   }
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent memory leaks.
// Runs every 60 seconds and removes all entries whose window has elapsed.
const CLEANUP_INTERVAL_MS = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now >= entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
    // If the map is empty, stop the timer to avoid unnecessary work.
    if (rateLimitMap.size === 0 && cleanupTimer !== null) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow Node.js to exit even if the timer is active (server shutdown).
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Check and consume a rate limit token.
 *
 * @param key       Unique identifier (e.g. IP address, user ID, route name).
 * @param limit     Maximum number of requests allowed within the window.
 * @param windowMs  Time window in milliseconds.
 * @returns         `{ success, remaining, resetAt }` where `success` is false
 *                  when the limit has been exceeded.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number; resetAt: number } {
  ensureCleanupTimer();

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // First request or window expired — start a new window.
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  // Within the current window — check if we still have capacity.
  if (entry.count < limit) {
    entry.count += 1;
    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Limit exceeded.
  return { success: false, remaining: 0, resetAt: entry.resetAt };
}

/**
 * Build a rate-limiter scoped to a specific route / purpose.
 * Convenient when you want pre-configured defaults.
 *
 * Usage:
 *
 *   const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
 *
 *   export async function POST(request: Request) {
 *     const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
 *     const { success, remaining } = limiter.check(ip);
 *     if (!success) {
 *       return Response.json({ error: "Too many requests" }, {
 *         status: 429,
 *         headers: { "Retry-After": String(Math.ceil(remaining / 1000)) },
 *       });
 *     }
 *     // ... handle request
 *   }
 */
export function createRateLimiter(opts: {
  prefix?: string;
  limit: number;
  windowMs: number;
}) {
  const { prefix = "rl", limit, windowMs } = opts;
  return {
    check(identifier: string) {
      return rateLimit(`${prefix}:${identifier}`, limit, windowMs);
    },
  };
}
