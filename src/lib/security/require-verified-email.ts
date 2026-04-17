import type { User } from "@supabase/supabase-js";

export type VerifiedEmailResult = { ok: true } | { ok: false; error: string };

export function requireVerifiedEmail(user: User): VerifiedEmailResult {
  if (!user.email_confirmed_at) {
    return {
      ok: false,
      error:
        "Please verify your email before continuing. Check your inbox for a confirmation link.",
    };
  }
  return { ok: true };
}
