/**
 * Worker body for the `notification-fanout` topic.
 *
 * Invoked by the route handler (push) in production and by the inline runner
 * in dev. Claims a dedup key, resolves user preferences, inserts notification
 * rows in one batch, then enqueues per-chunk bulk-email jobs plus a push
 * dispatch. Never blocks the producer — the producer returned the moment its
 * message was accepted.
 */

import { claimJob, dedupKey } from "../dedup";
import { enqueueBulkEmail } from "../producers";
import type { NotificationFanoutPayload } from "../types";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getPreferenceKey,
  parseClubNotificationPrefs,
  parseNotificationPrefs,
} from "@/lib/notifications/prefs";
import { sendPushToUsers } from "@/lib/push";

const EMAIL_CHUNK_SIZE = 50;

export async function handleNotificationFanout(payload: NotificationFanoutPayload): Promise<void> {
  const claim = await claimJob(payload.dedupId, "notification-fanout");
  if (!claim.claimed) {
    console.info(`[jobs/notification-fanout] skip — already processed ${payload.dedupId}`);
    return;
  }

  if (payload.userIds.length === 0) return;

  const supabase = createServiceClient();
  const prefKey = getPreferenceKey(payload.type, payload.clubId);

  const { data: profiles } = await supabase
    .from("users")
    .select("id, social_links, email, display_name")
    .in("id", payload.userIds);

  const prefsMap = new Map<
    string,
    { socialLinks: Record<string, unknown> | null; email: string; displayName: string }
  >();
  for (const id of payload.userIds) {
    prefsMap.set(id, { socialLinks: null, email: "", displayName: "" });
  }
  for (const profile of profiles ?? []) {
    prefsMap.set(profile.id, {
      socialLinks: profile.social_links as Record<string, unknown> | null,
      email: profile.email ?? "",
      displayName: profile.display_name ?? "",
    });
  }

  const eligible: string[] = [];
  for (const id of payload.userIds) {
    const userData = prefsMap.get(id);
    const socialLinks = userData?.socialLinks ?? null;
    const userPrefs = parseNotificationPrefs(socialLinks);
    if (userPrefs[prefKey] === false) continue;
    if (payload.clubId) {
      const clubPrefs = parseClubNotificationPrefs(socialLinks, payload.clubId);
      if (clubPrefs[prefKey] === false) continue;
    }
    eligible.push(id);
  }

  if (eligible.length === 0) return;

  const notificationsToInsert = eligible.map((userId) => ({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link ?? null,
    club_id: payload.clubId ?? null,
    festival_id: payload.festivalId ?? null,
    related_user_id: payload.relatedUserId ?? null,
    read: false,
    archived: false,
  }));

  const { error: insertError } = await supabase.from("notifications").insert(notificationsToInsert);

  if (insertError) {
    console.error("[jobs/notification-fanout] notification insert failed", insertError);
    throw insertError;
  }

  for (let i = 0; i < eligible.length; i += EMAIL_CHUNK_SIZE) {
    const chunk = eligible.slice(i, i + EMAIL_CHUNK_SIZE);
    const recipients = chunk
      .map((id) => {
        const ud = prefsMap.get(id);
        return {
          userId: id,
          email: ud?.email ?? "",
          displayName: ud?.displayName ?? null,
        };
      })
      .filter((r) => r.email.length > 0);

    if (recipients.length === 0) continue;

    await enqueueBulkEmail({
      dedupId: dedupKey("bulk-email", payload.dedupId, String(i)),
      recipients,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      clubId: payload.clubId,
    });
  }

  const pushEligible = eligible.filter((id) => {
    const userData = prefsMap.get(id);
    const userPrefs = parseNotificationPrefs(userData?.socialLinks ?? null);
    return userPrefs.all_push_notifications !== false;
  });
  if (pushEligible.length > 0) {
    await sendPushToUsers(pushEligible, {
      title: payload.title,
      body: payload.message,
      url: payload.link ?? "/",
      type: payload.type,
      tag: payload.type,
    });
  }
}
