import { handleCallback } from "@vercel/queue";
import { handleAccountExport } from "@/lib/jobs/handlers/account-export";
import type { AccountExportPayload } from "@/lib/jobs/types";

const MAX_DELIVERIES = 5;

// Wrapped in a typed POST function because @vercel/queue's handleCallback
// returns `(req: CallbackRequestInput) => Promise<Response>` and Next's
// webpack route-type check rejects the union. At runtime handleCallback
// accepts a plain Request, so forwarding is safe.
const _handler = handleCallback<AccountExportPayload>(
  async (message, metadata) => {
    try {
      await handleAccountExport(message);
    } catch (err) {
      console.error(
        `[jobs/account-export] delivery=${metadata.deliveryCount} messageId=${metadata.messageId} failed`,
        err
      );
      throw err;
    }
  },
  {
    retry: (_err, metadata) => {
      if (metadata.deliveryCount > MAX_DELIVERIES) {
        console.error(
          `[jobs/account-export] poison message — acknowledging after ${metadata.deliveryCount} deliveries: ${metadata.messageId}`
        );
        return { acknowledge: true };
      }
      const backoff = Math.min(300, 2 ** metadata.deliveryCount * 5);
      return { afterSeconds: backoff };
    },
  }
);

export async function POST(request: Request): Promise<Response> {
  return _handler(request);
}
