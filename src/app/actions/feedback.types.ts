// Types for feedback items
export type FeedbackType = "bug" | "feature";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "closed" | "wont_fix";

export interface FeedbackItemWithUser {
  id: string;
  type: FeedbackType;
  title: string;
  description: string | null;
  user_id: string | null;
  status: FeedbackStatus;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  vote_count: number;
  user: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}
