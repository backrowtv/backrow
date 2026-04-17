/**
 * Payload schemas for async job topics. Producers and workers share these
 * types; if you add a new job, add its topic + payload here, a producer in
 * producers.ts, a handler in handlers/, and wire the route + vercel.json.
 */

import type { NotificationType } from "@/app/actions/notifications.types";

export const JOB_TOPICS = {
  notificationFanout: "notification-fanout",
  bulkEmail: "bulk-email",
  imageProcessing: "image-processing",
} as const;

export type JobTopic = (typeof JOB_TOPICS)[keyof typeof JOB_TOPICS];

export interface NotificationFanoutPayload {
  /** Stable across retries; used in the idempotency key. */
  dedupId: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  clubId?: string;
  festivalId?: string;
  relatedUserId?: string;
}

export interface BulkEmailRecipient {
  userId: string;
  email: string;
  displayName?: string | null;
}

export interface BulkEmailPayload {
  /** Stable across retries; used in the idempotency key. */
  dedupId: string;
  recipients: BulkEmailRecipient[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  clubId?: string;
}

export type ImageProcessingVariant = "user-avatar" | "club-picture";

export interface ImageProcessingPayload {
  /** Stable across retries; used in the idempotency key. */
  dedupId: string;
  variant: ImageProcessingVariant;
  /** Storage bucket (e.g. "avatars", "club-pictures"). */
  bucket: string;
  /** Path inside the bucket to the RAW upload that needs resizing. */
  rawPath: string;
  /** Row id whose avatar/picture URL should be refreshed on completion. */
  ownerId: string;
}

export type JobPayload<T extends JobTopic> = T extends typeof JOB_TOPICS.notificationFanout
  ? NotificationFanoutPayload
  : T extends typeof JOB_TOPICS.bulkEmail
    ? BulkEmailPayload
    : T extends typeof JOB_TOPICS.imageProcessing
      ? ImageProcessingPayload
      : never;
