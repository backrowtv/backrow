import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let client: Redis | null = null;

if (url && token) {
  client = new Redis({ url, token });
} else if (process.env.NODE_ENV === "production") {
  console.error(
    "[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. Rate limiting is disabled."
  );
} else {
  console.warn("[redis] Upstash creds missing. Local dev will skip Redis-backed rate limits.");
}

export const redis = client;
