/**
 * Simple In-Memory Rate Limiter
 *
 * Provides basic rate limiting for API routes using a sliding window approach.
 * Uses IP address as the identifier for rate limiting.
 *
 * Note: For production at scale, consider using Redis or Vercel's rate limiting.
 * This in-memory implementation is suitable for single-instance deployments
 * and moderate traffic.
 *
 * @example
 * import { rateLimit, getRateLimitResponse } from '@/lib/security/rate-limit'
 *
 * export async function GET(request: NextRequest) {
 *   const { success, remaining, reset } = rateLimit(request)
 *   if (!success) {
 *     return getRateLimitResponse(reset)
 *   }
 *   // ... handle request
 * }
 */

import { NextRequest, NextResponse } from "next/server";

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
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// In-memory store for rate limiting
// Key: IP address, Value: { count, resetTime }
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configuration: 60 requests per minute
const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
};

// Cleanup interval to prevent memory leaks (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Only cleanup every 5 minutes
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Extract client IP from request
 * Handles various proxy headers and falls back to 'unknown'
 */
function getClientIp(request: NextRequest): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0].trim();
  }

  // Fallback for local development or unknown
  return "unknown";
}

/**
 * Check rate limit for a request
 *
 * @param request - The incoming NextRequest
 * @param config - Optional rate limit configuration
 * @returns Rate limit result with success status, remaining requests, and reset time
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  // Cleanup expired entries periodically
  cleanupExpiredEntries();

  const ip = getClientIp(request);
  const now = Date.now();
  const key = ip;

  const entry = rateLimitStore.get(key);

  // No existing entry or entry has expired - create new window
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.limit - 1,
      reset: resetTime,
    };
  }

  // Within existing window - increment count
  entry.count++;

  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Generate a 429 Too Many Requests response
 *
 * @param reset - The timestamp when the rate limit resets
 * @returns NextResponse with 429 status and appropriate headers
 */
export function getRateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter,
    },
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

/**
 * Add rate limit headers to a successful response
 *
 * @param response - The response to add headers to
 * @param result - The rate limit result
 */
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): void {
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
}
