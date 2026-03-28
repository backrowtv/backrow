import type { NotificationType } from "@/app/actions/notifications.types";
import {
  EMAIL_ELIGIBLE_TYPES,
  getEmailCTALabel,
  getEmailSubjectPrefix,
} from "./email-eligible-types";
import { notificationEmailHtml } from "./templates/render";
import { sendEmail } from "./resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://backrow.tv";
const UNSUBSCRIBE_URL = `${APP_URL}/profile/settings/notifications`;

interface NotificationEmailParams {
  email: string;
  displayName?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  clubId?: string;
  socialLinks: Record<string, unknown> | null;
}

/**
 * Map notification type → global email preference key in notification_preferences.
 */
const EMAIL_PREF_KEY_MAP: Partial<Record<NotificationType, string>> = {
  // Festival
  festival_started: "email_festival_updates",
  festival_phase_changed: "email_festival_updates",
  nomination_added: "email_new_festivals",
  new_festival: "email_new_festivals",
  results_revealed: "email_results_revealed",
  deadline_changed: "email_deadline_changes",
  // Endless
  endless_movie_added: "email_endless_festival",
  endless_movie_completed: "email_endless_festival",
  // Club
  club_invite: "email_club_invites",
  club_name_changed: "email_club_updates",
  club_archived: "email_club_updates",
  club_deleted: "email_club_updates",
  announcement: "email_announcements",
  // Events
  new_event: "email_events",
  event_cancelled: "email_events",
  event_modified: "email_events",
  // Polls
  new_poll: "email_polls",
  // Seasons
  season_started: "email_seasons",
  season_ended: "email_seasons",
  season_date_changed: "email_seasons",
  season_name_changed: "email_seasons",
  // Social
  mention: "email_mentions",
  new_message: "email_new_messages",
  discussion_reply: "email_mentions",
  discussion_thread_created: "email_mentions",
  discussion_comment_reply: "email_mentions",
  vote_received: "email_mentions",
  badge_earned: "email_badges",
  // Admin
  feedback_submitted: "email_badges", // not actually emailed (not in EMAIL_ELIGIBLE_TYPES)
};

/**
 * Map notification type → per-club email preference key in club_notification_preferences.
 */
const CLUB_EMAIL_PREF_KEY_MAP: Partial<Record<NotificationType, string>> = {
  festival_started: "email_festival_updates",
  festival_phase_changed: "email_phase_changes",
  nomination_added: "email_new_nominations",
  new_festival: "email_new_festivals",
  results_revealed: "email_results_revealed",
  deadline_changed: "email_deadline_changes",
  endless_movie_added: "email_endless_festival",
  endless_movie_completed: "email_endless_festival",
  club_name_changed: "email_club_updates",
  club_archived: "email_club_updates",
  club_deleted: "email_club_updates",
  announcement: "email_announcements",
  new_event: "email_events",
  event_cancelled: "email_events",
  event_modified: "email_events",
  new_poll: "email_polls",
  season_started: "email_seasons",
  season_ended: "email_seasons",
  season_date_changed: "email_seasons",
  season_name_changed: "email_seasons",
  mention: "email_mentions",
  new_message: "email_new_messages",
  discussion_reply: "email_mentions",
  discussion_thread_created: "email_mentions",
  discussion_comment_reply: "email_mentions",
  vote_received: "email_mentions",
};

/**
 * Check if a user has email notifications enabled for a given type (opt-in, default OFF).
 * Checks: global master → global per-category → per-club enabled → per-club per-category.
 */
function isEmailEnabled(
  socialLinks: Record<string, unknown> | null,
  type: NotificationType,
  clubId?: string
): boolean {
  if (!socialLinks) return false;
  const prefs = (socialLinks.notification_preferences as Record<string, unknown>) || {};

  // Global master toggles
  if (prefs.all_notifications === false) return false;
  if (prefs.all_email_notifications !== true) return false;

  // Global per-category check
  const globalKey = EMAIL_PREF_KEY_MAP[type];
  if (globalKey && prefs[globalKey] !== true) return false;

  // Per-club checks
  if (clubId) {
    const clubPrefsAll =
      (socialLinks.club_notification_preferences as Record<string, Record<string, unknown>>) || {};
    const clubPrefs = clubPrefsAll[clubId] || {};

    // Club must be email-enabled
    if (clubPrefs.email_enabled !== true) return false;

    // Per-club per-category check
    const clubKey = CLUB_EMAIL_PREF_KEY_MAP[type];
    if (clubKey && clubPrefs[clubKey] !== true) return false;
  }

  return true;
}

/**
 * Build the email subject line for a notification.
 */
function buildSubject(type: NotificationType, title: string): string {
  const prefix = getEmailSubjectPrefix(type);
  return prefix ? `${prefix}: ${title}` : title;
}

/**
 * Build the full link URL from a relative notification link.
 */
function buildFullLink(link?: string): string | undefined {
  if (!link) return undefined;
  if (link.startsWith("http")) return link;
  return `${APP_URL}${link.startsWith("/") ? "" : "/"}${link}`;
}

/**
 * Send an email notification for a single user.
 * Fire-and-forget — logs errors, never throws.
 */
export async function sendNotificationEmail(params: NotificationEmailParams): Promise<void> {
  try {
    if (!EMAIL_ELIGIBLE_TYPES.has(params.type)) return;
    if (!isEmailEnabled(params.socialLinks, params.type, params.clubId)) return;
    if (!params.email) return;

    const fullLink = buildFullLink(params.link);

    const html = await notificationEmailHtml({
      userName: params.displayName || undefined,
      title: params.title,
      message: params.message,
      link: fullLink,
      ctaLabel: fullLink ? getEmailCTALabel(params.type) : undefined,
      unsubscribeUrl: UNSUBSCRIBE_URL,
    });

    await sendEmail({
      to: params.email,
      subject: buildSubject(params.type, params.title),
      html,
      headers: {
        "List-Unsubscribe": `<${UNSUBSCRIBE_URL}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (err) {
    console.error("Email notification failed:", err);
  }
}

interface BatchEmailUser {
  email: string;
  displayName?: string;
  socialLinks: Record<string, unknown> | null;
}

interface BatchNotificationEmailParams {
  users: BatchEmailUser[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  clubId?: string;
}

/**
 * Send email notifications to multiple users.
 * Fire-and-forget — logs errors, never throws.
 */
export async function sendNotificationEmailBatch(
  params: BatchNotificationEmailParams
): Promise<void> {
  try {
    if (!EMAIL_ELIGIBLE_TYPES.has(params.type)) return;

    const eligibleUsers = params.users.filter(
      (u) => u.email && isEmailEnabled(u.socialLinks, params.type, params.clubId)
    );

    if (eligibleUsers.length === 0) return;

    const fullLink = buildFullLink(params.link);
    const subject = buildSubject(params.type, params.title);
    const ctaLabel = fullLink ? getEmailCTALabel(params.type) : undefined;

    const results = await Promise.allSettled(
      eligibleUsers.map(async (user) => {
        const html = await notificationEmailHtml({
          userName: user.displayName || undefined,
          title: params.title,
          message: params.message,
          link: fullLink,
          ctaLabel,
          unsubscribeUrl: UNSUBSCRIBE_URL,
        });

        return sendEmail({
          to: user.email,
          subject,
          html,
          headers: {
            "List-Unsubscribe": `<${UNSUBSCRIBE_URL}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
      })
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      console.error(
        `Batch email: ${failed}/${eligibleUsers.length} failed for type ${params.type}`
      );
    }
  } catch (err) {
    console.error("Batch email notification failed:", err);
  }
}
