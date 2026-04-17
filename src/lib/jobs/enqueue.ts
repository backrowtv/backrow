/**
 * Queue producer helper. Wraps @vercel/queue's send() with a dev-only inline
 * fallback so `bun run dev` still runs fan-out code end-to-end when OIDC
 * tokens aren't present locally.
 *
 * On Vercel (VERCEL=1) or when VERCEL_OIDC_TOKEN is populated by
 * `vercel env pull`, send() publishes to the real queue and handleCallback()
 * routes fire — in both production and local dev, per @vercel/queue docs.
 */

import { send } from "@vercel/queue";
import type { JobPayload, JobTopic } from "./types";

const queueConfigured =
  process.env.VERCEL === "1" ||
  Boolean(process.env.VERCEL_OIDC_TOKEN) ||
  Boolean(process.env.QUEUE_SERVICE_URL);

export async function enqueue<T extends JobTopic>(
  topic: T,
  payload: JobPayload<T>,
  options: { idempotencyKey: string }
): Promise<void> {
  if (queueConfigured) {
    await send(topic, payload, options);
    return;
  }

  // Dev without queue credentials: invoke the handler inline so the feature
  // still works end-to-end in the dev loop. This path is never taken in prod.
  if (process.env.NODE_ENV === "production") {
    throw new Error("[jobs/enqueue] queue is not configured in production");
  }
  console.warn(
    `[jobs/${topic}] queue not configured; running inline (dev fallback). Run 'vercel env pull' to use the real queue.`
  );
  const { runInline } = await import("./inline-runner");
  void runInline(topic, payload);
}
