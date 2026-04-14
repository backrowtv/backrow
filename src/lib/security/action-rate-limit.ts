/**
 * Distributed Rate Limiter for server actions.
 *
 * Backed by Upstash Redis. Falls back to an in-memory Map locally when
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are unset.
 *
 * Return shape `{ success, remaining, reset, error }` is stable — do not
 * change; call sites depend on it.
 *
 * @example
 * const check = await actionRateLimit('createComment', { limit: 10, windowMs: 60_000 })
 * if (!check.success) return { error: check.error }
 */

import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface ActionRateLimitConfig {
  limit: number;
  windowMs: number;
}

interface ActionRateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  error: string;
}

const DEFAULT_CONFIG: ActionRateLimitConfig = {
  limit: 10,
  windowMs: 60 * 1000,
};

// Fallback store (dev without Redis)
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

function fallbackCheck(key: string, config: ActionRateLimitConfig): ActionRateLimitResult {
  cleanupFallback();
  const now = Date.now();
  const entry = fallbackStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    fallbackStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: config.limit - 1, reset: resetTime, error: "" };
  }

  entry.count++;
  if (entry.count > config.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
      error: `Too many attempts. Please try again in ${retryAfter} seconds.`,
    };
  }
  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
    error: "",
  };
}

// Limiter cache: one Ratelimit instance per (limit, windowMs).
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(config: ActionRateLimitConfig): Ratelimit | null {
  if (!redis) return null;
  const key = `action:${config.limit}:${config.windowMs}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs} ms`),
      prefix: "br:rl:act",
      analytics: false,
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = headerStore.get("x-real-ip");
  if (realIp) return realIp;
  const vercelForwardedFor = headerStore.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) return vercelForwardedFor.split(",")[0].trim();
  return "unknown";
}

async function runLimiter(
  key: string,
  config: ActionRateLimitConfig
): Promise<ActionRateLimitResult> {
  const limiter = getLimiter(config);
  if (limiter) {
    try {
      const res = await limiter.limit(key);
      if (!res.success) {
        const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
        return {
          success: false,
          remaining: res.remaining,
          reset: res.reset,
          error: `Too many attempts. Please try again in ${retryAfter} seconds.`,
        };
      }
      return { success: true, remaining: res.remaining, reset: res.reset, error: "" };
    } catch (err) {
      console.error("[action-rate-limit] Upstash error, falling back to in-memory", err);
    }
  }
  return fallbackCheck(key, config);
}

/**
 * Rate limit by action name and client IP.
 */
export async function actionRateLimit(
  actionName: string,
  config: ActionRateLimitConfig = DEFAULT_CONFIG
): Promise<ActionRateLimitResult> {
  const ip = await getClientIp();
  return runLimiter(`${actionName}:${ip}`, config);
}

/**
 * Rate limit by action name and authenticated user ID.
 * Use for per-user caps that should follow the user across networks
 * (e.g., daily invite-generation ceiling).
 */
export async function actionRateLimitByUser(
  actionName: string,
  userId: string,
  config: ActionRateLimitConfig
): Promise<ActionRateLimitResult> {
  return runLimiter(`${actionName}:user:${userId}`, config);
}
