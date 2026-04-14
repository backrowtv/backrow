/**
 * Server Action Rate Limiter
 *
 * Adapts the existing rate-limit pattern for server actions, which don't
 * receive a NextRequest object. Uses headers() to extract the client IP.
 *
 * Keys are scoped per action name so different actions have independent limits.
 *
 * @example
 * import { actionRateLimit } from '@/lib/security/action-rate-limit'
 *
 * export async function signIn(prevState: unknown, formData: FormData) {
 *   const rateCheck = await actionRateLimit('signIn', { limit: 5, windowMs: 60_000 })
 *   if (!rateCheck.success) {
 *     return { error: rateCheck.error }
 *   }
 *   // ... handle action
 * }
 */

import { headers } from "next/headers";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface ActionRateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface ActionRateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  error: string;
}

// Shared in-memory store (same pattern as rate-limit.ts)
const actionRateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_CONFIG: ActionRateLimitConfig = {
  limit: 10,
  windowMs: 60 * 1000,
};

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of actionRateLimitStore.entries()) {
    if (now > entry.resetTime) {
      actionRateLimitStore.delete(key);
    }
  }
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

/**
 * Rate limit a server action by action name and client IP.
 *
 * @param actionName - Unique name for this action (used as part of the store key)
 * @param config - Optional rate limit configuration
 */
export async function actionRateLimit(
  actionName: string,
  config: ActionRateLimitConfig = DEFAULT_CONFIG
): Promise<ActionRateLimitResult> {
  cleanupExpiredEntries();

  const ip = await getClientIp();
  const key = `${actionName}:${ip}`;
  const now = Date.now();

  const entry = actionRateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    actionRateLimitStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: config.limit - 1, reset: resetTime, error: "" };
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
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
