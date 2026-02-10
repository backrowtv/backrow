export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  badge_type: "site" | "club";
  club_id: string | null;
  requirements_jsonb: Record<string, unknown>;
  created_at: string;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  club_id: string | null;
  earned_at: string;
  progress_jsonb: Record<string, unknown>;
  badge: Badge;
}
