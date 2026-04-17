/**
 * Typed producers for each job topic. These are the public API server actions
 * should use — call these instead of touching @vercel/queue directly. Each
 * producer computes a stable idempotency key for producer-side dedup; workers
 * still re-check via claimJob() because at-least-once can redeliver outside
 * the idempotency window.
 */

import { dedupKey } from "./dedup";
import { enqueue } from "./enqueue";
import {
  JOB_TOPICS,
  type BulkEmailPayload,
  type ImageProcessingPayload,
  type NotificationFanoutPayload,
} from "./types";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export async function enqueueNotificationFanout(
  payload: Omit<NotificationFanoutPayload, "dedupId"> & { dedupId?: string }
): Promise<void> {
  const dedupId =
    payload.dedupId ??
    dedupKey("notify-fanout", payload.type, payload.title, ...payload.userIds.slice(0, 3));
  await enqueue(
    JOB_TOPICS.notificationFanout,
    { ...payload, dedupId },
    { idempotencyKey: dedupId }
  );
}

export async function enqueueBulkEmail(
  payload: Omit<BulkEmailPayload, "dedupId"> & { dedupId?: string }
): Promise<void> {
  const dedupId =
    payload.dedupId ??
    dedupKey(
      "bulk-email",
      payload.type,
      payload.title,
      ...payload.recipients.map((r) => r.userId).slice(0, 5)
    );
  await enqueue(JOB_TOPICS.bulkEmail, { ...payload, dedupId }, { idempotencyKey: dedupId });
}

export async function enqueueImageProcessing(
  payload: Omit<ImageProcessingPayload, "dedupId"> & { dedupId?: string }
): Promise<void> {
  const dedupId = payload.dedupId ?? dedupKey("image", payload.bucket, payload.rawPath);
  await enqueue(JOB_TOPICS.imageProcessing, { ...payload, dedupId }, { idempotencyKey: dedupId });
}

export async function enqueueAccountExport(userId: string): Promise<void> {
  // Timestamp-scoped dedup key so a second export request the same minute is a
  // no-op, but the user can request a fresh one the next minute.
  const minuteBucket = Math.floor(Date.now() / 60_000);
  const dedupId = dedupKey("account-export", userId, String(minuteBucket));
  await enqueue(JOB_TOPICS.accountExport, { dedupId, userId }, { idempotencyKey: dedupId });
}

export async function enqueueAccountHardDelete(
  userId: string,
  options?: { delaySeconds?: number }
): Promise<void> {
  const dedupId = dedupKey("account-hard-delete", userId);
  await enqueue(
    JOB_TOPICS.accountHardDelete,
    { dedupId, userId },
    {
      idempotencyKey: dedupId,
      delaySeconds: options?.delaySeconds ?? THIRTY_DAYS_SECONDS,
    }
  );
}
