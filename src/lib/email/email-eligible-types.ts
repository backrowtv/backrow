import type { NotificationType } from "@/app/actions/notifications.types";

/**
 * Notification types that warrant an email (meaningful, infrequent, actionable).
 * All other types are in-app only.
 */
export const EMAIL_ELIGIBLE_TYPES: Set<NotificationType> = new Set([
  "club_invite", // Action required
  "announcement", // Important club-wide comms
  "new_festival", // New activity to participate in
  "results_revealed", // Eagerly awaited outcome
  "deadline_changed", // Time-sensitive
  "new_event", // Scheduling action
  "event_cancelled", // Plans changed
  "mention", // Someone addressed the user directly
  "badge_earned", // Celebratory, infrequent
]);

const CTA_LABELS: Partial<Record<NotificationType, string>> = {
  club_invite: "View Invitation",
  announcement: "Read Announcement",
  new_festival: "View Festival",
  results_revealed: "View Results",
  deadline_changed: "View Festival",
  new_event: "View Event",
  event_cancelled: "View Details",
  mention: "View Discussion",
  badge_earned: "View Badge",
};

const SUBJECT_PREFIXES: Partial<Record<NotificationType, string>> = {
  club_invite: "Invitation",
  announcement: "Announcement",
  deadline_changed: "Deadline Update",
  event_cancelled: "Event Cancelled",
  mention: "You were mentioned",
  badge_earned: "New Badge",
};

export function getEmailCTALabel(type: NotificationType): string {
  return CTA_LABELS[type] || "View in BackRow";
}

export function getEmailSubjectPrefix(type: NotificationType): string | undefined {
  return SUBJECT_PREFIXES[type];
}
