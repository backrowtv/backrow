import React from "react";
import Link from "next/link";
import type { ClubActivityType, MemberActivityType } from "./activity-types";

// ============================================
// TYPES
// ============================================

export interface ActivityDetails {
  movie_title?: string;
  tmdb_id?: number;
  poster_url?: string;
  poster_path?: string;
  rating?: number;
  club_name?: string;
  club_slug?: string;
  festival_theme?: string;
  festival_id?: string;
  festival_slug?: string;
  event_title?: string;
  event_id?: string;
  announcement_title?: string;
  poll_question?: string;
  badge_name?: string;
  theme_name?: string;
  new_phase?: string;
  new_name?: string;
  season_name?: string;
  winner_title?: string;
  target_user_name?: string;
  [key: string]: unknown;
}

export interface LinkOptions {
  movieLink: string | null;
  movieTitle?: string;
  clubLink: string | null;
  clubName?: string;
  festivalLink?: string | null;
  festivalTheme?: string;
  eventLink?: string | null;
  eventTitle?: string;
  badgeName?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Hidden activity types - these are filtered out from feeds
 */
export const HIDDEN_ACTIVITY_TYPES = ["festival_phase_changed"] as const;

/**
 * Get the number of words in the action phrase for a given action type.
 * Used for proper verb/action highlighting in activity feeds.
 */
export function getActionPhraseWordCount(action: string): number {
  // Multi-word action phrases
  const multiWordActions: Record<string, number> = {
    endless_movie_playing: 2, // "Now showing:"
    festival_started: 2, // "New festival"
    user_watched_and_rated: 3, // "watched and rated"
    announcement_posted: 2, // "New announcement"
    member_joined: 3, // "A new member" / "{N} new members"
    member_left: 3, // "A member left" / "{N} members left"
    poll_created: 2, // "New poll"
    poll_edited: 2, // "Poll updated"
    poll_closed: 2, // "Poll ended"
    poll_deleted: 2, // "Poll deleted"
    club_name_changed: 2, // "Club renamed"
    season_renamed: 2, // "Season renamed"
    season_started: 2, // "Season started:"
    season_ended: 2, // "Season ended:"
    season_paused: 2, // "Season paused:"
    season_resumed: 2, // "Season resumed:"
    season_dates_changed: 3, // "Season dates updated"
    user_rating_changed: 2, // "changed rating"
    user_blocked: 2, // "Blocked from"
  };
  return multiWordActions[action] || 1;
}

// ============================================
// CLUB ACTIVITY VERBIAGE
// ============================================

type ClubVerbiageFunction = (details: ActivityDetails | null, count: number) => string;

export const CLUB_ACTIVITY_VERBIAGE: Record<ClubActivityType, ClubVerbiageFunction> = {
  member_joined: (details, count) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return count > 1
      ? `${count} new members joined${clubContext}`
      : `A new member joined${clubContext}`;
  },
  member_left: (details, count) => {
    const clubContext = details?.club_name ? ` from ${details.club_name}` : "";
    return count > 1 ? `${count} members left${clubContext}` : `A member left${clubContext}`;
  },
  festival_started: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.festival_theme
      ? `New festival "${details.festival_theme}" started${clubContext}`
      : `New festival started${clubContext}`;
  },
  festival_cancelled: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.festival_theme
      ? `Cancelled: "${details.festival_theme}"${clubContext}`
      : `Festival cancelled${clubContext}`;
  },
  festival_phase_changed: () => {
    // This action type is hidden from activity feeds
    return "";
  },
  festival_results_revealed: (details) => {
    // Show "Movie wins Theme!" instead of "wins the festival!"
    if (details?.winner_title && details?.festival_theme) {
      return `"${details.winner_title}" wins "${details.festival_theme}"!`;
    }
    if (details?.winner_title) {
      return `"${details.winner_title}" wins the festival!`;
    }
    return "Festival results revealed!";
  },
  announcement_posted: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return `New announcement${clubContext}`;
  },
  event_created: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.event_title
      ? `Scheduled "${details.event_title}"${clubContext}`
      : `Scheduled a new event${clubContext}`;
  },
  event_cancelled: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.event_title
      ? `Cancelled "${details.event_title}"${clubContext}`
      : `Cancelled an event${clubContext}`;
  },
  event_modified: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.event_title
      ? `Updated "${details.event_title}"${clubContext}`
      : `Updated an event${clubContext}`;
  },
  poll_created: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.poll_question
      ? `New poll${clubContext}: "${details.poll_question}"`
      : `A new poll was created${clubContext}`;
  },
  poll_edited: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.poll_question
      ? `Poll updated${clubContext}: "${details.poll_question}"`
      : `A poll was updated${clubContext}`;
  },
  poll_closed: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.poll_question
      ? `Poll ended${clubContext}: "${details.poll_question}"`
      : `A poll was ended early${clubContext}`;
  },
  poll_deleted: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.poll_question
      ? `Poll deleted${clubContext}: "${details.poll_question}"`
      : `A poll was deleted${clubContext}`;
  },
  club_name_changed: (details) =>
    details?.new_name ? `Club renamed to "${details.new_name}"` : "Club name was changed",
  club_archived: (details) =>
    details?.club_name ? `Archived "${details.club_name}"` : "Archived a club",
  club_deleted: (details) =>
    details?.club_name ? `Deleted "${details.club_name}"` : "Deleted a club",
  season_started: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.season_name
      ? `Season started: "${details.season_name}"${clubContext}`
      : `Season started${clubContext}`;
  },
  season_ended: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.season_name
      ? `Season ended: "${details.season_name}"${clubContext}`
      : `Season ended${clubContext}`;
  },
  season_paused: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.season_name
      ? `Season paused: "${details.season_name}"${clubContext}`
      : `Season paused${clubContext}`;
  },
  season_resumed: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.season_name
      ? `Season resumed: "${details.season_name}"${clubContext}`
      : `Season resumed${clubContext}`;
  },
  season_dates_changed: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return `Season dates updated${clubContext}`;
  },
  season_renamed: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.new_name
      ? `Season renamed to "${details.new_name}"${clubContext}`
      : `Season was renamed${clubContext}`;
  },
  endless_movie_added: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.movie_title
      ? `Added "${details.movie_title}" to the movie pool${clubContext}`
      : `Added a movie to the movie pool${clubContext}`;
  },
  endless_movie_playing: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.movie_title
      ? `Now showing: "${details.movie_title}"${clubContext}`
      : `Now showing: new movie${clubContext}`;
  },
  endless_movie_completed: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.movie_title
      ? `Concluded "${details.movie_title}"${clubContext}`
      : `Concluded a movie${clubContext}`;
  },
  endless_movie_cancelled: (details) => {
    const clubContext = details?.club_name ? ` in ${details.club_name}` : "";
    return details?.movie_title
      ? `Removed "${details.movie_title}" from Now Showing${clubContext}`
      : `Removed a movie from Now Showing${clubContext}`;
  },
};

// ============================================
// MEMBER ACTIVITY VERBIAGE
// ============================================

type MemberVerbiageFunction = (details: ActivityDetails | null, count: number) => string;

// Combined watch + rate verbiage (not in activity-types, generated by grouping)
const COMBINED_ACTIVITY_VERBIAGE: Record<
  string,
  (details: ActivityDetails | null, count: number) => string
> = {
  user_watched_and_rated: (details) => {
    const rating = details?.rating ? ` (${details.rating}/10)` : "";
    return details?.movie_title
      ? `watched and rated "${details.movie_title}"${rating}`
      : "watched and rated a movie";
  },
};

export const MEMBER_ACTIVITY_VERBIAGE: Record<MemberActivityType, MemberVerbiageFunction> = {
  user_joined_club: (details) =>
    details?.club_name ? `Joined "${details.club_name}"` : "Joined a club",
  user_left_club: (details) =>
    details?.club_name ? `Left "${details.club_name}"` : "Left a club",
  user_blocked: (details) =>
    details?.club_name ? `Blocked from "${details.club_name}"` : "Blocked from a club",
  user_created_club: (details) =>
    details?.club_name ? `Created "${details.club_name}"` : "Created a new club",
  user_deleted_club: (details) =>
    details?.club_name ? `Deleted "${details.club_name}"` : "Deleted a club",
  user_archived_club: (details) =>
    details?.club_name ? `Archived "${details.club_name}"` : "Archived a club",
  user_watched_movie: (details, count) => {
    // If count > 1 AND we have a movie title, it means multiple users watched the SAME movie
    // Otherwise, it means one user watched multiple different movies
    if (count > 1 && details?.movie_title) {
      return `Watched by ${count} people: "${details.movie_title}"`;
    }
    if (count > 1) return `watched ${count} movies`;
    let text = details?.movie_title ? `watched "${details.movie_title}"` : "watched a movie";
    // Add club context if available
    if (details?.club_name) {
      text += ` in ${details.club_name}`;
    }
    // Add theme context if available
    if (details?.festival_theme) {
      text += ` (${details.festival_theme})`;
    }
    return text;
  },
  user_rated_movie: (details, count) => {
    // If count > 1 AND we have a movie title, it means multiple users rated the SAME movie
    // Otherwise, it means one user rated multiple different movies
    if (count > 1 && details?.movie_title) {
      return `Rated by ${count} people: "${details.movie_title}"`;
    }
    if (count > 1) return `rated ${count} movies`;
    const rating = details?.rating ? ` (${details.rating}/10)` : "";
    return details?.movie_title ? `rated "${details.movie_title}"${rating}` : "rated a movie";
  },
  user_rating_changed: (details) => {
    const rating = details?.rating ? ` to ${details.rating}/10` : "";
    return details?.movie_title
      ? `changed rating for "${details.movie_title}"${rating}`
      : "changed a rating";
  },
  user_nominated: (details) =>
    details?.movie_title ? `nominated "${details.movie_title}"` : "nominated a movie",
  user_nomination_removed: (details) =>
    details?.movie_title ? `removed nomination for "${details.movie_title}"` : "removed a nomination",
  user_nomination_edited: (details) =>
    details?.movie_title ? `updated nomination for "${details.movie_title}"` : "updated a nomination",
  user_theme_submitted: (details, count) => {
    if (count > 1) return `submitted ${count} themes`;
    return details?.theme_name ? `submitted theme: "${details.theme_name}"` : "submitted a theme";
  },
  user_theme_removed: (details) =>
    details?.theme_name ? `removed theme: "${details.theme_name}"` : "removed a theme",
  user_theme_edited: (details) =>
    details?.theme_name ? `updated theme: "${details.theme_name}"` : "updated a theme",
  user_movie_pool_added: (details, count) => {
    if (count > 1) return `added ${count} movies to the movie pool`;
    return details?.movie_title
      ? `added "${details.movie_title}" to the movie pool`
      : "added a movie to the movie pool";
  },
  user_movie_pool_removed: (details) =>
    details?.movie_title
      ? `removed "${details.movie_title}" from the movie pool`
      : "removed a movie from the movie pool",
  user_future_nomination_added: (details, count) => {
    if (count > 1) return `added ${count} movies to future nominations`;
    return details?.movie_title
      ? `added "${details.movie_title}" to future nominations`
      : "added to future nominations";
  },
  user_future_nomination_removed: (details, count) => {
    if (count > 1) return `removed ${count} movies from future nominations`;
    return details?.movie_title
      ? `removed "${details.movie_title}" from future nominations`
      : "removed from future nominations";
  },
  user_badge_earned: (details) =>
    details?.badge_name ? `earned the "${details.badge_name}" badge!` : "earned a badge!",
};

// ============================================
// LEGACY ACTION MAP
// ============================================

const LEGACY_ACTION_MAP: Record<
  string,
  (details: ActivityDetails | null, count: number) => string
> = {
  // Legacy endless festival actions
  endless_movie_started: (details) =>
    details?.movie_title ? `Now Showing: "${details.movie_title}"` : "New movie is now showing",
  endless_movie_deleted: (details) =>
    details?.movie_title
      ? `"${details.movie_title}" removed from the movie pool`
      : "Movie removed from the movie pool",
  // Legacy watch/rate actions
  watched_movie: (details) =>
    details?.movie_title ? `watched "${details.movie_title}"` : "watched a movie",
  rated_movie: (details) => {
    const rating = details?.rating ? ` (${details.rating}/10)` : "";
    return details?.movie_title ? `rated "${details.movie_title}"${rating}` : "rated a movie";
  },
  // Legacy nomination actions
  nomination_added: (details) =>
    details?.movie_title ? `nominated "${details.movie_title}"` : "nominated a movie",
  // Legacy festival actions
  festival_created: () => "Festival created",
  festival_completed: () => "Festival completed!",
  phase_changed: () => "Festival phase changed",
  deadline_changed: () => "Deadline updated",
  theme_selected: (details) =>
    details?.theme_name ? `"${details.theme_name}" theme selected` : "Theme selected",
  // Legacy member actions
  promoted: (details) =>
    details?.target_user_name ? `promoted ${details.target_user_name}` : "promoted a member",
  demoted: (details) =>
    details?.target_user_name ? `demoted ${details.target_user_name}` : "demoted a member",
  removed_member: (details) =>
    details?.target_user_name ? `removed ${details.target_user_name}` : "removed a member",
  joined: () => "joined",
  left: () => "left",
};

// ============================================
// MAIN FORMATTING FUNCTION
// ============================================

/**
 * Get the verbiage for an activity action
 * @param action - The activity action type
 * @param details - Activity details
 * @param count - Number of grouped activities (for pluralization)
 * @param isClubActivity - Whether this is a club-level activity
 * @returns Formatted verbiage string
 */
export function formatActivityVerbiage(
  action: string,
  details: ActivityDetails | null,
  count: number = 1,
  isClubActivity: boolean = false
): string {
  // Try combined activity verbiage first (e.g., user_watched_and_rated)
  if (action in COMBINED_ACTIVITY_VERBIAGE) {
    return COMBINED_ACTIVITY_VERBIAGE[action](details, count);
  }

  // Try club verbiage first if it's a club activity
  if (isClubActivity && action in CLUB_ACTIVITY_VERBIAGE) {
    return CLUB_ACTIVITY_VERBIAGE[action as ClubActivityType](details, count);
  }

  // Try member verbiage
  if (action in MEMBER_ACTIVITY_VERBIAGE) {
    return MEMBER_ACTIVITY_VERBIAGE[action as MemberActivityType](details, count);
  }

  // Try legacy action map
  if (action in LEGACY_ACTION_MAP) {
    return LEGACY_ACTION_MAP[action](details, count);
  }

  // Final fallback - clean up action string
  return action.replace(/_/g, " ").replace(/^user /, "");
}

// ============================================
// TEXT RENDERING HELPERS
// ============================================

/**
 * Render text with quoted content in bold
 * Finds text in "quotes" and wraps it in bold spans
 */
export function renderWithBoldQuotes(text: string): React.ReactElement {
  // Split by quoted strings, keeping the quotes
  const parts = text.split(/("[^"]*")/g);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a quoted string
        if (part.startsWith('"') && part.endsWith('"')) {
          return (
            <span key={index} className="font-medium text-[var(--text-primary)]">
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

// ============================================
// LINK RENDERING
// ============================================

/**
 * Build link options from activity details
 */
export function buildLinkOptions(
  details: ActivityDetails | null,
  clubSlug?: string | null,
  clubName?: string | null
): LinkOptions {
  const movieTitle = details?.movie_title;
  const tmdbId = details?.tmdb_id;
  const festivalId = details?.festival_id;
  const festivalSlug = details?.festival_slug;
  const festivalTheme = details?.festival_theme;
  const eventId = details?.event_id;
  const eventTitle = details?.event_title;
  const badgeName = details?.badge_name;

  // Build links - use TMDB ID for movie routes
  const movieLink = tmdbId ? `/movies/${tmdbId}` : null;
  const clubLink = clubSlug ? `/club/${clubSlug}` : null;
  const festivalLink =
    clubSlug && (festivalSlug || festivalId)
      ? `/club/${clubSlug}/festival/${festivalSlug || festivalId}`
      : null;
  const eventLink = clubSlug && eventId ? `/club/${clubSlug}/events` : null;

  return {
    movieLink,
    movieTitle,
    clubLink,
    clubName: clubName || undefined,
    festivalLink,
    festivalTheme,
    eventLink,
    eventTitle,
    badgeName,
  };
}

/**
 * Render activity text with embedded links
 * Returns JSX with clickable links for movies, clubs, festivals, etc.
 * @param text - The text to render with links
 * @param options - Link options containing URLs and display names
 * @param onLinkClick - Optional click handler to apply to all links (for stopping propagation)
 */
export function renderActivityTextWithLinks(
  text: string,
  options: LinkOptions,
  onLinkClick?: (e: React.MouseEvent) => void
): React.ReactElement {
  const {
    movieLink,
    movieTitle,
    clubLink,
    clubName,
    festivalLink,
    festivalTheme,
    eventLink,
    eventTitle,
  } = options;

  // Build list of patterns to linkify (in order of priority)
  let parts: (string | React.ReactElement)[] = [text];
  let keyCounter = 0;

  // Helper to linkify a pattern
  const linkifyPattern = (
    pattern: string,
    link: string,
    className: string,
    displayText?: string
  ) => {
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;
      if (!part.includes(pattern)) return part;

      const idx = part.indexOf(pattern);
      keyCounter++;
      return [
        part.slice(0, idx),
        <Link key={`link-${keyCounter}`} href={link} className={className} onClick={onLinkClick}>
          {displayText || pattern}
        </Link>,
        part.slice(idx + pattern.length),
      ].filter(Boolean);
    });
  };

  // Linkify movie titles (in quotes) - bright text
  if (movieLink && movieTitle) {
    const moviePattern = `"${movieTitle}"`;
    if (text.includes(moviePattern)) {
      linkifyPattern(
        moviePattern,
        movieLink,
        "text-[var(--text-primary)] hover:underline",
        `"${movieTitle}"`
      );
    }
  }

  // Linkify festival themes (in quotes) - bright text
  if (festivalLink && festivalTheme) {
    const festivalPattern = `"${festivalTheme}"`;
    if (text.includes(festivalPattern)) {
      linkifyPattern(
        festivalPattern,
        festivalLink,
        "text-[var(--text-primary)] hover:underline",
        `"${festivalTheme}"`
      );
    }
  }

  // Linkify event titles (in quotes) - bright text
  if (eventLink && eventTitle) {
    const eventPattern = `"${eventTitle}"`;
    if (text.includes(eventPattern)) {
      linkifyPattern(
        eventPattern,
        eventLink,
        "text-[var(--text-primary)] hover:underline",
        `"${eventTitle}"`
      );
    }
  }

  // Linkify club names (not in quotes) - bright text
  if (clubLink && clubName) {
    if (text.includes(clubName)) {
      linkifyPattern(clubName, clubLink, "text-[var(--text-primary)] hover:underline");
    }
  }

  return <>{parts}</>;
}
