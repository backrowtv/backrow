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
  accountExport: "account-export",
  accountHardDelete: "account-hard-delete",
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

export interface AccountExportPayload {
  /** Stable across retries; used in the idempotency key. */
  dedupId: string;
  /** The public.users.id whose data is being exported. */
  userId: string;
}

export interface AccountHardDeletePayload {
  /** Stable across retries; used in the idempotency key. */
  dedupId: string;
  /** The public.users.id to hard-delete (and its auth.users row via CASCADE). */
  userId: string;
}

export type JobPayload<T extends JobTopic> = T extends typeof JOB_TOPICS.notificationFanout
  ? NotificationFanoutPayload
  : T extends typeof JOB_TOPICS.bulkEmail
    ? BulkEmailPayload
    : T extends typeof JOB_TOPICS.imageProcessing
      ? ImageProcessingPayload
      : T extends typeof JOB_TOPICS.accountExport
        ? AccountExportPayload
        : T extends typeof JOB_TOPICS.accountHardDelete
          ? AccountHardDeletePayload
          : never;
