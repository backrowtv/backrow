// Types for endless festival module

export type EndlessStatus = "pool" | "playing" | "completed";
export type DisplaySlot = "featured" | "throwback" | null;

export interface EndlessMovie {
  id: string; // nomination id
  tmdb_id: number;
  slug: string | null; // For SEO-friendly URLs
  title: string;
  year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string | null;
  runtime: number | null; // in minutes
  director: string | null;
  genres: string[] | null;
  certification: string | null; // MPAA rating (G, PG, PG-13, R, NC-17)
  curator_note: string | null; // Custom description (max 100 chars)
  endless_status: EndlessStatus;
  display_slot: DisplaySlot;
  created_at: string;
  completed_at: string | null; // When movie was marked completed (for retention)
  nominator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  vote_count?: number;
  discussion_thread_id?: string | null;
}

export interface PoolVoteState {
  count: number;
  userVoted: boolean;
}

export interface EndlessFestivalData {
  festivalId: string | null;
  festivalName: string | null; // "Now Showing" header text (stored in theme field)
  nowPlaying: EndlessMovie[];
  pool: EndlessMovie[];
  recentlyPlayed: EndlessMovie[];
  /** Pre-fetched votes for pool items (keyed by pool item id) */
  poolVotes?: Record<string, PoolVoteState>;
}
