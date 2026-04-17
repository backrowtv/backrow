import { handleCallback } from "@vercel/queue";
import { handleNotificationFanout } from "@/lib/jobs/handlers/notification-fanout";
import type { NotificationFanoutPayload } from "@/lib/jobs/types";

export const POST = handleCallback<NotificationFanoutPayload>(async (message, metadata) => {
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
