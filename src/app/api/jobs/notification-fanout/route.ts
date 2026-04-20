import { handleCallback } from "@vercel/queue";
import { handleNotificationFanout } from "@/lib/jobs/handlers/notification-fanout";
import type { NotificationFanoutPayload } from "@/lib/jobs/types";

const _handler = handleCallback<NotificationFanoutPayload>(async (message, metadata) => {
  try {
    await handleNotificationFanout(message);
  } catch (err) {
    console.error(
      `[jobs/notification-fanout] delivery=${metadata.deliveryCount} messageId=${metadata.messageId} failed`,
      err
    );
    throw err;
  }
});

export async function POST(request: Request): Promise<Response> {
  return _handler(request);
}
