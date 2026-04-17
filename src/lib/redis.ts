import { Redis } from "@upstash/redis";

// Upstash is provisioned via Vercel Marketplace, which populates KV_REST_API_*.
// Fall back to the canonical Upstash names if someone points at a direct Upstash account.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let client: Redis | null = null;

if (url && token) {
  client = new Redis({ url, token });
} else if (process.env.NODE_ENV === "production") {
  console.error(
    "[redis] KV_REST_API_URL / KV_REST_API_TOKEN are not set. Rate limiting is disabled."
  );
} else {
  console.warn("[redis] Upstash creds missing. Local dev will skip Redis-backed rate limits.");
}

export const redis = client;
