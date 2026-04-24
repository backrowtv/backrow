import { Redis } from "@upstash/redis";
import { env, isProduction } from "@/lib/config/env";

// Upstash is provisioned via Vercel Marketplace, which populates KV_REST_API_*.
// Fall back to the canonical Upstash names if someone points at a direct Upstash account.
const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;

let client: Redis | null = null;

if (url && token) {
  client = new Redis({ url, token });
} else if (isProduction()) {
  console.error(
    "[redis] KV_REST_API_URL / KV_REST_API_TOKEN are not set. Rate limiting is disabled."
  );
} else {
  console.warn("[redis] Upstash creds missing. Local dev will skip Redis-backed rate limits.");
}

export const redis = client;
