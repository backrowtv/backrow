/**
 * Dev-only fallback: run a job's handler inline when Queues isn't configured.
 * Production never reaches this code (enqueue.ts throws instead).
 *
 * Kept in a standalone module so enqueue.ts can dynamic-import it without
 * pulling handler code into every producer bundle.
 */

import { JOB_TOPICS, type JobPayload, type JobTopic } from "./types";

export async function runInline<T extends JobTopic>(
  topic: T,
  payload: JobPayload<T>
): Promise<void> {
  switch (topic) {
    case JOB_TOPICS.notificationFanout: {
      const { handleNotificationFanout } = await import("./handlers/notification-fanout");
      await handleNotificationFanout(payload as JobPayload<typeof JOB_TOPICS.notificationFanout>);
      return;
    }
    case JOB_TOPICS.bulkEmail: {
      const { handleBulkEmail } = await import("./handlers/bulk-email");
      await handleBulkEmail(payload as JobPayload<typeof JOB_TOPICS.bulkEmail>);
      return;
    }
    case JOB_TOPICS.imageProcessing: {
      const { handleImageProcessing } = await import("./handlers/image-processing");
      await handleImageProcessing(payload as JobPayload<typeof JOB_TOPICS.imageProcessing>);
      return;
    }
    case JOB_TOPICS.accountExport: {
      const { handleAccountExport } = await import("./handlers/account-export");
      await handleAccountExport(payload as JobPayload<typeof JOB_TOPICS.accountExport>);
      return;
    }
    case JOB_TOPICS.accountHardDelete: {
      const { handleAccountHardDelete } = await import("./handlers/account-hard-delete");
      await handleAccountHardDelete(payload as JobPayload<typeof JOB_TOPICS.accountHardDelete>);
      return;
    }
    default: {
      const exhaustive: never = topic;
      throw new Error(`[jobs/inline-runner] unknown topic: ${String(exhaustive)}`);
    }
  }
}
