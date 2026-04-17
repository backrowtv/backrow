import { handleCallback } from "@vercel/queue";
import { handleBulkEmail } from "@/lib/jobs/handlers/bulk-email";
import type { BulkEmailPayload } from "@/lib/jobs/types";

const MAX_DELIVERIES = 8;

export const POST = handleCallback<BulkEmailPayload>(
  async (message, metadata) => {
    try {
      await handleBulkEmail(message);
    } catch (err) {
      console.error(
        `[jobs/bulk-email] delivery=${metadata.deliveryCount} messageId=${metadata.messageId} failed`,
        err
      );
      throw err;
    }
  },
  {
    retry: (_err, metadata) => {
      if (metadata.deliveryCount > MAX_DELIVERIES) {
        console.error(
          `[jobs/bulk-email] poison message — acknowledging after ${metadata.deliveryCount} deliveries: ${metadata.messageId}`
        );
        return { acknowledge: true };
      }
      const backoff = Math.min(300, 2 ** metadata.deliveryCount * 5);
      return { afterSeconds: backoff };
    },
  }
);
