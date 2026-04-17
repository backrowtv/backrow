/**
 * Pure helpers for notification-preference parsing. Extracted from
 * src/app/actions/notifications.ts so that queue workers (which are not
 * "use server" modules) can reuse them without pulling in the action file.
 */

import type { NotificationType } from "@/app/actions/notifications.types";

export const DEFAULT_NOTIFICATION_PREFS: Record<string, boolean> = {
  festival_updates: true,
  new_festivals: true,
  deadline_changes: true,
  results_revealed: true,
  endless_festival: true,
  club_invites: true,
  club_updates: true,
  announcements: true,
  events: true,
  polls: true,
  seasons: true,
  mentions: true,
  new_messages: true,
  badges: true,
  admin_feedback: true,
  all_push_notifications: true,
};

export function parseNotificationPrefs(
  socialLinks: Record<string, unknown> | null
): Record<string, boolean> {
  if (!socialLinks) {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }

  const prefs = (socialLinks.notification_preferences as Record<string, unknown>) || {};

  return {
    festival_updates: prefs.festival_updates !== false,
    new_festivals: prefs.new_festivals !== false,
    deadline_changes: prefs.deadline_changes !== false,
    results_revealed: prefs.results_revealed !== false,
    endless_festival: prefs.endless_festival !== false,
    club_invites: prefs.club_invites !== false,
    club_updates: prefs.club_updates !== false,
    announcements: prefs.announcements !== false,
    events: prefs.events !== false,
    polls: prefs.polls !== false,
    seasons: prefs.seasons !== false,
    mentions: prefs.mentions !== false,
    new_messages: prefs.new_messages !== false,
    badges: prefs.badges !== false,
    admin_feedback: prefs.admin_feedback !== false,
    all_push_notifications: prefs.all_push_notifications !== false,
  };
}

export function parseClubNotificationPrefs(
  socialLinks: Record<string, unknown> | null,
  clubId: string
): Record<string, boolean> {
  const defaultClubPrefs: Record<string, boolean> = {
    festival_updates: true,
    new_festivals: true,
    new_nominations: true,
    phase_changes: true,
    deadline_changes: true,
    results_revealed: true,
    endless_festival: true,
    club_updates: true,
    announcements: true,
    events: true,
    polls: true,
    seasons: true,
    new_messages: true,
    mentions: true,
  };

  if (!socialLinks) {
    return defaultClubPrefs;
  }

  const clubPrefs =
    (socialLinks.club_notification_preferences as Record<string, Record<string, unknown>>) || {};
  const prefs = clubPrefs[clubId] || {};

  return {
    festival_updates: prefs.festival_updates !== false,
    new_festivals: prefs.new_festivals !== false,
    new_nominations: prefs.new_nominations !== false,
    phase_changes: prefs.phase_changes !== false,
    deadline_changes: prefs.deadline_changes !== false,
    results_revealed: prefs.results_revealed !== false,
    endless_festival: prefs.endless_festival !== false,
    club_updates: prefs.club_updates !== false,
    announcements: prefs.announcements !== false,
    events: prefs.events !== false,
    polls: prefs.polls !== false,
    seasons: prefs.seasons !== false,
    new_messages: prefs.new_messages !== false,
    mentions: prefs.mentions !== false,
  };
}

export function getPreferenceKey(type: NotificationType, clubId?: string): string {
  const typeMap: Record<NotificationType, string> = {
    festival_started: "festival_updates",
    festival_phase_changed: clubId ? "phase_changes" : "festival_updates",
    nomination_added: clubId ? "new_nominations" : "festival_updates",
    results_revealed: "results_revealed",
    new_festival: "new_festivals",
    deadline_changed: "deadline_changes",
    endless_movie_added: "endless_festival",
    endless_movie_completed: "endless_festival",
    club_invite: "club_invites",
    club_name_changed: "club_updates",
    club_archived: "club_updates",
    club_deleted: "club_updates",
    announcement: "announcements",
    new_event: "events",
    event_cancelled: "events",
    event_modified: "events",
    new_poll: "polls",
    season_started: "seasons",
    season_ended: "seasons",
    season_date_changed: "seasons",
    season_name_changed: "seasons",
    mention: "mentions",
    new_message: "new_messages",
    discussion_reply: "mentions",
    discussion_thread_created: "mentions",
    discussion_comment_reply: "mentions",
    vote_received: "mentions",
    badge_earned: "badges",
    feedback_submitted: "admin_feedback",
  };

  return typeMap[type] || "festival_updates";
}
