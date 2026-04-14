import { handleCallback } from "@vercel/queue";
import { handleAccountHardDelete } from "@/lib/jobs/handlers/account-hard-delete";
import type { AccountHardDeletePayload } from "@/lib/jobs/types";

const MAX_DELIVERIES = 3;

export const POST = handleCallback<AccountHardDeletePayload>(
  async (message, metadata) => {
    try {
      await handleAccountHardDelete(message);
    } catch (err) {
      console.error(
        `[jobs/account-hard-delete] delivery=${metadata.deliveryCount} messageId=${metadata.messageId} failed`,
        err
      );
      throw err;
    }
  },
  {
    retry: (_err, metadata) => {
      if (metadata.deliveryCount > MAX_DELIVERIES) {
        console.error(
          `[jobs/account-hard-delete] poison message — acknowledging after ${metadata.deliveryCount} deliveries: ${metadata.messageId}`
        );
        return { acknowledge: true };
      }
      const backoff = Math.min(600, 2 ** metadata.deliveryCount * 10);
      return { afterSeconds: backoff };
    },
  }
);
