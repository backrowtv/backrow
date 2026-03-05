/**
 * Type definitions for discussion threads and comments
 */

export type DiscussionTagType = "movie" | "actor" | "director" | "composer" | "festival";

export interface DiscussionThreadTag {
  id: string;
  thread_id: string;
  tag_type: DiscussionTagType;
  tmdb_id: number | null;
  person_tmdb_id: number | null;
  festival_id: string | null;
  created_at: string;
  // Joined data
  movie?: {
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    year: number | null;
    slug: string | null;
  };
  person?: {
    tmdb_id: number;
    name: string;
    profile_url: string | null;
    slug: string | null;
    known_for_department: string | null;
  };
  festival?: {
    id: string;
    theme: string;
    slug: string | null;
  };
}

export interface DiscussionThread {
  id: string;
  club_id: string;
  slug: string | null;
  title: string;
  content: string;
  author_id: string;
  // Legacy fields (deprecated - use tags instead)
  thread_type: "movie" | "person" | "festival" | "custom";
  tmdb_id: number | null;
  person_name: string | null;
  person_type: "actor" | "director" | "composer" | null;
  person_tmdb_id: number | null;
  festival_id: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  is_spoiler: boolean;
  auto_created: boolean;
  unlock_on_watch: boolean;
  upvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  // Legacy joined data (deprecated - use tags instead)
  movie?: {
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    year: number | null;
    slug: string | null;
  };
  person?: {
    tmdb_id: number;
    name: string;
    profile_url: string | null;
    slug: string | null;
    known_for_department: string | null;
  };
  festival?: {
    id: string;
    name: string;
  };
  // New tag system
  tags?: DiscussionThreadTag[];
}

export interface DiscussionComment {
  id: string;
  thread_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_spoiler: boolean;
  is_edited: boolean;
  edited_at: string | null;
  upvotes: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    email?: string | null;
    social_links?: {
      avatar_icon?: string;
      avatar_color_index?: number;
      avatar_border_color_index?: number;
      [key: string]: unknown;
    } | null;
  };
  replies?: DiscussionComment[];
}

export interface DiscussionVote {
  id: string;
  user_id: string;
  thread_id: string | null;
  comment_id: string | null;
  created_at: string;
}

// Tag input structure for creating threads
export interface TagInput {
  tag_type: DiscussionTagType;
  tmdb_id?: number; // For movies
  person_tmdb_id?: number; // For actors/directors/composers
  festival_id?: string; // For festivals
}

// Watch-gate state: threads tagged with movies are gated until user has watched them
export interface SpoilerState {
  isSpoilered: boolean;
  reason: "none" | "unwatched";
  movieTmdbId: number | null;
  movieTitle: string | null;
  isUnlocked: boolean;
  hasWatched: boolean;
}

// Result for fetching a comment subtree (for "Continue thread" feature)
export interface CommentSubtreeResult {
  anchor: DiscussionComment;
  threadId: string;
  threadTitle: string;
  threadSlug: string | null;
  clubSlug: string;
  parentComment?: {
    id: string;
    authorName: string;
    contentSnippet: string;
  };
}
