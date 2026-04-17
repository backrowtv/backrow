/**
 * Distributed Rate Limiter for API routes.
 *
 * Backed by Upstash Redis (@upstash/ratelimit) when UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN are set. Falls back to an in-memory Map for local
 * dev without credentials. API unchanged from the prior in-memory version.
 *
 * @example
 * import { rateLimit, getRateLimitResponse } from '@/lib/security/rate-limit'
 *
 * export async function GET(request: NextRequest) {
 *   const { success, remaining, reset } = await rateLimit(request)
 *   if (!success) return getRateLimitResponse(reset)
 *   // ... handle request
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowMs: 60 * 1000,
};

// ---- Fallback in-memory store (local dev without Redis) ----
const fallbackStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupFallback(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of fallbackStore.entries()) {
    if (now > entry.resetTime) fallbackStore.delete(key);
  }
}

function fallbackCheck(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupFallback();
  const now = Date.now();
  const entry = fallbackStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    fallbackStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: config.limit - 1, reset: resetTime };
  }

  entry.count++;
  if (entry.count > config.limit) {
    return { success: false, remaining: 0, reset: entry.resetTime };
  }
  return { success: true, remaining: config.limit - entry.count, reset: entry.resetTime };
}

// ---- Upstash limiter cache (one instance per window config) ----
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redis) return null;
  const key = `api:${config.limit}:${config.windowMs}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs} ms`),
      prefix: "br:rl:api",
      analytics: false,
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) return vercelForwardedFor.split(",")[0].trim();

  return "unknown";
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = ip;

  const limiter = getLimiter(config);
  if (limiter) {
    try {
      const res = await limiter.limit(key);
      return { success: res.success, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.error("[rate-limit] Upstash error, falling back to in-memory", err);
    }
  }
  return fallbackCheck(key, config);
}

export function getRateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again later.", retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(reset),
      },
    }
  );
}

export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): void {
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
}
