/**
 * Environment variable validation (Zod).
 *
 * Import the typed `env` object instead of reading `process.env.*` directly —
 * any new var MUST be declared here AND in `.env.example` in the same PR.
 *
 * Validation runs at module load. Missing required vars throw on import so the
 * failure surfaces at boot, not at the first request that happens to need the var.
 * Test-factory scripts (scripts/test-factory/*) load `.env.local` via dotenv on
 * their own and are exempt — see docs/development.md#env-schema.
 */

import { z } from "zod";

/** Public vars — exposed to the browser bundle. */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required",
  }),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_ENABLE_TEST_AUTH: z.enum(["true", "false"]).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal("")),
});

/** Server-only vars — never sent to the client. */
const serverEnvSchema = z.object({
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),

  // Third-party APIs
  TMDB_API_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_AUDIENCE_ID: z.string().min(1).optional(),
  CONTACT_NOTIFY_EMAIL: z.string().email().optional(),

  // Web push
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).optional(),

  // Upstash / Vercel KV (either naming accepted — see src/lib/redis.ts)
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Background jobs
  CRON_SECRET: z.string().min(1).optional(),
  QUEUE_SERVICE_URL: z.string().url().optional(),

  // Access gating
  SITE_PASSWORD: z.string().min(1).optional(),

  // Sentry (optional — error monitoring)
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

  // Runtime
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const envSchema = publicEnvSchema.merge(serverEnvSchema);

export type Env = z.infer<typeof envSchema>;

/**
 * Coerces NEXT_PUBLIC_SITE_URL (legacy name) into NEXT_PUBLIC_APP_URL when
 * only the legacy name is set, so downstream code reads a single canonical
 * value. Callers that hard-coded process.env.NEXT_PUBLIC_SITE_URL have been
 * migrated to `authCallbackUrl()` / `absoluteUrl()`.
 */
function normalizeAppUrl(src: NodeJS.ProcessEnv | Record<string, string | undefined>): void {
  if (!src.NEXT_PUBLIC_APP_URL && src.NEXT_PUBLIC_SITE_URL) {
    src.NEXT_PUBLIC_APP_URL = src.NEXT_PUBLIC_SITE_URL;
  }
}

function validateEnv(): Env {
  // Browser: only public vars are available. Server-only fields remain undefined.
  if (typeof window !== "undefined") {
    const publicEnv: Record<string, string | undefined> = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      NEXT_PUBLIC_ENABLE_TEST_AUTH: process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    };
    normalizeAppUrl(publicEnv);
    const result = publicEnvSchema.safeParse(publicEnv);
    if (!result.success) {
      console.error("Invalid public environment variables:", result.error.format());
      throw new Error("Invalid environment variables. Check the console for details.");
    }
    return result.data as Env;
  }

  normalizeAppUrl(process.env);

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment variables. Check the console for details.");
  }

  // NEXT_PUBLIC_APP_URL is required in production (Vercel preview + prod both
  // set NODE_ENV=production). Missing it means the Supabase `emailRedirectTo`
  // helper falls back to the `https://backrow.tv` default — which is wrong for
  // preview deploys and was the root cause of the "confirmation email links
  // point to localhost" bug when the legacy NEXT_PUBLIC_SITE_URL was stale.
  if (result.data.NODE_ENV === "production" && !result.data.NEXT_PUBLIC_APP_URL) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL (or legacy NEXT_PUBLIC_SITE_URL) must be set in production. " +
        "See docs/development.md#env-schema."
    );
  }

  return result.data;
}

/** Validated env — import this, not `process.env.*`. */
export const env = validateEnv();

/** True when the key is set to a non-empty value. */
export function hasEnvVar(key: keyof Env): boolean {
  const value = env[key];
  return value !== undefined && value !== "";
}

export function getSupabaseUrl(): string {
  return env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}

export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}
