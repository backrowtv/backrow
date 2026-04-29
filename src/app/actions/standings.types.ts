export interface StandingsEntry {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  email: string | null;
  // Avatar columns - stored as proper columns, not in social_links JSON
  avatar_icon: string | null;
  avatar_color_index: number | null;
  avatar_border_color_index: number | null;
  rank: number;
  points: number;
  avg_points: number;
  movies_rated: number;
  festivals_attended: number;
  wins: number;
  win_rate: number;
  avg_nomination_rating: number;
  nomination_guesses: number;
  nomination_guesses_total: number;
}
