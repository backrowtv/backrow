/**
 * Consumer-side deduplication for Vercel Queues workers.
 *
 * At-least-once delivery means every worker may fire 2–3 times for the same
 * payload. Before doing real work (sending an email, resizing an image),
 * workers call `claimJob(key, type)`. Only the first caller that inserts the
 * key succeeds; subsequent retries see `{ claimed: false }` and skip.
 *
 * Two layers:
 *  1. Redis NX lock (hot path; avoids a DB round-trip on the common case).
 *  2. Postgres `job_dedup` table (durable; auditable; survives Redis eviction).
 *     Rows TTL'd to 7 days by /api/cron/cleanup-job-dedup.
 *
 * Redis may be absent in local dev — the helper degrades gracefully to
 * Postgres-only.
 */

import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import { createServiceClient } from "@/lib/supabase/server";

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function dedupKey(...parts: (string | number)[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export async function claimJob(key: string, jobType: string): Promise<{ claimed: boolean }> {
  if (redis) {
    try {
      const ok = await redis.set(`br:job:dedup:${key}`, jobType, {
        nx: true,
        ex: TTL_SECONDS,
      });
      if (!ok) {
        return { claimed: false };
      }
    } catch (err) {
      console.error("[jobs/dedup] redis claim failed, falling through to DB", err);
    }
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("job_dedup").insert({ key, job_type: jobType });

  if (error) {
    // 23505 = unique_violation → another worker already claimed it.
    if (error.code === "23505") return { claimed: false };
    console.error("[jobs/dedup] db claim failed", error);
    // Fail open: return claimed so the worker still runs rather than
    // silently dropping the message. Duplicate sends are worse than
    // a dedup-store outage, but we still log.
    return { claimed: true };
  }

  return { claimed: true };
}
