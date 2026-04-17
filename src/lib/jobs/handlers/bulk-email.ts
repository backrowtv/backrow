/**
 * Worker body for the `bulk-email` topic.
 *
 * Sends one chunk of notification emails. Each recipient gets its own dedup
 * claim so retries of the chunk don't re-send to recipients who already got
 * a copy. Uses sendNotificationEmail (the single-recipient variant) so
 * preference filtering happens per user.
 */

import { claimJob, dedupKey } from "../dedup";
import type { BulkEmailPayload } from "../types";
import { createServiceClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";

export async function handleBulkEmail(payload: BulkEmailPayload): Promise<void> {
  const chunkClaim = await claimJob(payload.dedupId, "bulk-email");
  if (!chunkClaim.claimed) {
    console.info(`[jobs/bulk-email] skip chunk — already processed ${payload.dedupId}`);
    return;
  }

  const supabase = createServiceClient();
  const userIds = payload.recipients.map((r) => r.userId);
  const { data: profiles } = await supabase
    .from("users")
    .select("id, social_links")
    .in("id", userIds);

  const socialMap = new Map<string, Record<string, unknown> | null>();
  for (const profile of profiles ?? []) {
    socialMap.set(profile.id, profile.social_links as Record<string, unknown> | null);
  }

  for (const recipient of payload.recipients) {
    if (!recipient.email) continue;
    const perRecipientKey = dedupKey(
      "email-recipient",
      payload.dedupId,
      recipient.userId,
      payload.type
    );
    const claim = await claimJob(perRecipientKey, "bulk-email-recipient");
    if (!claim.claimed) continue;

    await sendNotificationEmail({
      email: recipient.email,
      displayName: recipient.displayName ?? undefined,
      socialLinks: socialMap.get(recipient.userId) ?? null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      clubId: payload.clubId,
    });
  }
}
