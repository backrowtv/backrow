/**
 * Centralized Cache Invalidation (tag-based)
 *
 * Next 16 Cache Components (`cacheComponents: true`) render each cached
 * component independently. A coarse `revalidatePath('/club/...')` blasts the
 * whole subtree, defeating that. Tag-based invalidation matches the scope
 * of each "use cache" function.
 *
 * Call these helpers from server actions and worker route handlers after
 * writes. Every "use cache" reader MUST tag itself using `CacheTags.*` so
 * these helpers can reach it.
 *
 * Tag safety: tag strings appear in logs/observability. Put IDs only —
 * never email, display name, or any RLS-protected string.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Paths used by LEGITIMATE_BROAD invalidations (home, /admin, /search).
 * Scoped writes (club, festival, discussion, poll) should NOT use paths —
 * they should call `invalidateClub` / `invalidateFestival` / etc.
 */
export const CachePaths = {
  home: "/",
  clubs: "/clubs",
  discover: "/discover",
  admin: "/admin",
  search: "/search",
  activity: "/activity",
  calendar: "/calendar",
  profile: "/profile",
  profileSettings: "/profile/settings",
  profileDisplayCase: "/profile/display-case",
  profileFutureNominations: "/profile/future-nominations",
} as const;

/**
 * Colon-scheme cache tags. Every `"use cache"` function declares a
 * matching `cacheTag(...)` so writes can target it precisely.
 *
 * Convention: `<entity>:<id>` for per-entity data, `<entity>:index` for
 * global lists.
 */
export const CacheTags = {
  // Per-entity (IDs only)
  club: (id: string) => `club:${id}` as const,
  festival: (id: string) => `festival:${id}` as const,
  season: (id: string) => `season:${id}` as const,
  discussion: (id: string) => `discussion:${id}` as const,
  poll: (id: string) => `poll:${id}` as const,
  member: (userId: string) => `member:${userId}` as const,
  user: (id: string) => `user:${id}` as const,
  movie: (tmdbId: string | number) => `movie:${tmdbId}` as const,

  // Global collections
  clubsIndex: () => "clubs:index" as const,
  discoverIndex: () => "discover:index" as const,
  featuredClub: () => "featured:club" as const,
  curatedPick: () => "curated:current" as const,
  upcomingMovies: () => "movies:upcoming" as const,
  popularMovies: () => "movies:popular" as const,
  filmNews: () => "news:film" as const,

  // Per-club stats (one tag per stats type, plus the club tag for cascade)
  clubStats: (clubId: string, kind: StatsKind) => `stats:${kind}:${clubId}` as const,
} as const;

export type StatsKind =
  | "participation"
  | "distribution"
  | "top-movies"
  | "activity"
  | "completion"
  | "trends";

type InvalidateProfile = "max" | "default" | "minutes" | "hours" | "days" | "weeks" | "seconds";
const DEFAULT_PROFILE: InvalidateProfile = "max";

function bust(tag: string, profile: InvalidateProfile = DEFAULT_PROFILE): void {
  revalidateTag(tag, profile);
}

/**
 * Invalidate a single club and the global club indexes that list it.
 *
 * Call after any club metadata, settings, moderation, announcement,
 * membership, or resource change.
 */
export function invalidateClub(clubId: string): void {
  bust(CacheTags.club(clubId));
  bust(CacheTags.clubsIndex());
  bust(CacheTags.discoverIndex());
}

/**
 * Invalidate a festival plus its parent club and season.
 *
 * Pass `opts` when the caller already knows the parents (the common case in
 * `src/app/actions/festivals/**` — avoids a DB roundtrip). Otherwise the
 * helper looks them up.
 */
export async function invalidateFestival(
  festivalId: string,
  opts?: { clubId?: string; seasonId?: string | null }
): Promise<void> {
  bust(CacheTags.festival(festivalId));

  let clubId = opts?.clubId;
  let seasonId = opts?.seasonId;

  if (clubId === undefined || seasonId === undefined) {
    const parents = await lookupFestivalParents(festivalId);
    clubId = clubId ?? parents?.clubId;
    seasonId = seasonId ?? parents?.seasonId;
  }

  if (clubId) invalidateClub(clubId);
  if (seasonId) bust(CacheTags.season(seasonId));
}

/** Invalidate a discussion thread and its parent club. */
export function invalidateDiscussion(threadId: string, clubId: string): void {
  bust(CacheTags.discussion(threadId));
  invalidateClub(clubId);
}

/** Invalidate a poll and its parent club. */
export function invalidatePoll(pollId: string, clubId: string): void {
  bust(CacheTags.poll(pollId));
  invalidateClub(clubId);
}

/**
 * Invalidate data scoped to a (club, user) pair — membership changes,
 * role updates, join/leave, rubric-for-user-in-club changes.
 */
export function invalidateMember(clubId: string, userId: string): void {
  bust(CacheTags.member(userId));
  bust(CacheTags.user(userId));
  invalidateClub(clubId);
}

/** Invalidate a season and its parent club. */
export function invalidateSeason(seasonId: string, clubId: string): void {
  bust(CacheTags.season(seasonId));
  invalidateClub(clubId);
}

/** Invalidate profile-level data for a single user. */
export function invalidateUser(userId: string): void {
  bust(CacheTags.user(userId));
  bust(CacheTags.member(userId));
}

/** Invalidate a movie by TMDB id. */
export function invalidateMovie(tmdbId: string | number): void {
  bust(CacheTags.movie(tmdbId));
}

/** Invalidate a specific stats slice for a club. */
export function invalidateClubStats(clubId: string, kind?: StatsKind): void {
  if (kind) {
    bust(CacheTags.clubStats(clubId, kind));
  } else {
    const kinds: StatsKind[] = [
      "participation",
      "distribution",
      "top-movies",
      "activity",
      "completion",
      "trends",
    ];
    for (const k of kinds) bust(CacheTags.clubStats(clubId, k));
  }
  invalidateClub(clubId);
}

/**
 * Admin-only: invalidate the Discover index and featured-club slot.
 * Use when curated or featured content changes.
 */
export function invalidateDiscover(): void {
  bust(CacheTags.discoverIndex());
  bust(CacheTags.clubsIndex());
  bust(CacheTags.featuredClub());
}

/**
 * Invalidate a global marketing slot.
 */
export function invalidateMarketing(
  slot: "featured-club" | "curated-pick" | "upcoming-movies" | "popular-movies" | "film-news"
): void {
  switch (slot) {
    case "featured-club":
      bust(CacheTags.featuredClub());
      bust(CacheTags.clubsIndex());
      break;
    case "curated-pick":
      bust(CacheTags.curatedPick());
      break;
    case "upcoming-movies":
      bust(CacheTags.upcomingMovies());
      break;
    case "popular-movies":
      bust(CacheTags.popularMovies());
      break;
    case "film-news":
      bust(CacheTags.filmNews());
      break;
  }
}

/**
 * Legitimate-broad path-based invalidation.
 * Reserved for home/marketing/admin writes that genuinely cover the full
 * page shell. Prefer `invalidate*` helpers above for anything scoped.
 */
export function invalidatePath(path: string): void {
  revalidatePath(path);
}

/**
 * Look up a festival's `club_id` and `season_id`. Used as a fallback by
 * `invalidateFestival` when the caller doesn't already have them.
 *
 * Uses the service-role client so invalidation works even for users who
 * couldn't read the festival row themselves (workers, admin paths).
 */
async function lookupFestivalParents(
  festivalId: string
): Promise<{ clubId: string; seasonId: string | null } | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("festivals")
    .select("club_id, season_id")
    .eq("id", festivalId)
    .maybeSingle();

  if (error || !data) return null;
  return { clubId: data.club_id as string, seasonId: (data.season_id as string | null) ?? null };
}
