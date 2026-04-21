import { env } from "@/lib/config/env";

export const SITE_URL = (env.NEXT_PUBLIC_APP_URL ?? "https://backrow.tv").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

// Mirrors isValidRedirect() in src/lib/auth/redirect.ts — kept inline so this
// module stays free of server-only imports (next/headers) and is safe to use
// from any runtime.
function isSameOriginPath(path: string): boolean {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

/**
 * Canonical `/auth/callback` URL for Supabase `emailRedirectTo` / `redirectTo`.
 * Pass `next` to round-trip a same-origin destination through the confirmation
 * email — the callback route reads it back and redirects there after exchange.
 * Invalid or off-origin `next` values are silently dropped.
 */
export function authCallbackUrl(next?: string | null): string {
  const base = `${SITE_URL}/auth/callback`;
  if (next && isSameOriginPath(next)) {
    return `${base}?next=${encodeURIComponent(next)}`;
  }
  return base;
}

/**
 * Canonical `/reset-password` URL for `supabase.auth.resetPasswordForEmail`.
 */
export function passwordResetUrl(): string {
  return `${SITE_URL}/reset-password`;
}
