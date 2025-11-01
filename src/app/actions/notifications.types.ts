export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  club_id: string | null;
  festival_id: string | null;
  related_user_id: string | null;
  archived?: boolean;
  archived_at?: string | null;
}

export interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  older: Notification[];
}

export interface NotificationGroup {
  label: string;
  notifications: Notification[];
  count: number;
  unreadCount: number;
}

export type NotificationType =
  // Festival notifications
  | "festival_started"
  | "festival_phase_changed"
  | "nomination_added"
  | "results_revealed"
  | "new_festival"
  | "deadline_changed"
  // Endless festival notifications
  | "endless_movie_added"
  | "endless_movie_completed"
  // Club notifications
  | "club_invite"
  | "club_name_changed"
  | "club_archived"
  | "club_deleted"
  | "announcement"
  // Event notifications
  | "new_event"
  | "event_cancelled"
  | "event_modified"
  // Poll notifications
  | "new_poll"
  // Season notifications
  | "season_started"
  | "season_ended"
  | "season_date_changed"
  | "season_name_changed"
  // Social notifications
  | "mention"
  | "new_message"
  | "discussion_reply"
  | "discussion_thread_created"
  | "discussion_comment_reply"
  | "vote_received"
  | "badge_earned"
  // Admin notifications
  | "feedback_submitted";
