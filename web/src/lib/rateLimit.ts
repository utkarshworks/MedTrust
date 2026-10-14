/**
 * MedTrust API Abuse Prevention & Rate Limiting Service
 *
 * Implements an in-memory sliding window rate limiter
 * to protect off-chain document storage and Solana RPC queries from flooding and abuse.
 */

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitTracker>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer && typeof timer.unref === "function") {
    timer.unref();
  }
}

export interface RateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): { allowed: boolean; remaining: number; resetMs: number } {
  const maxRequests = config.maxRequests ?? 60; // 60 requests
  const windowMs = config.windowMs ?? 60 * 1000; // per 1 minute
  const now = Date.now();

  const current = rateLimitStore.get(identifier);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetMs: windowMs,
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: current.resetAt - now,
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetMs: current.resetAt - now,
  };
}

