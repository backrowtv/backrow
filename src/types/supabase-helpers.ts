/**
 * Type helpers for Supabase query results
 *
 * Supabase joins can return T | T[] | null depending on query configuration.
 * These helpers provide type-safe access to relation data without type assertions.
 */

/**
 * Represents a Supabase single relation that could be:
 * - null (no data)
 * - T (single object)
 * - T[] (array, usually with one element for single relations)
 */
export type SingleRelation<T> = T | T[] | null;

/**
 * Extracts a single object from a Supabase relation.
 * Handles the T | T[] | null type that Supabase returns.
 *
 * @example
 * const festival = await supabase.from('festivals').select('clubs(settings)').single();
 * const club = extractSingleRelation(festival.clubs);
 * // club is now ClubType | null instead of ClubType | ClubType[] | null
 */
export function extractSingleRelation<T>(relation: SingleRelation<T>): T | null {
  if (relation === null || relation === undefined) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

/**
 * Type guard to check if a relation has data.
 *
 * @example
 * if (hasRelation(festival.clubs)) {
 *   // TypeScript now knows festival.clubs is T | [T, ...T[]]
 * }
 */
export function hasRelation<T>(relation: SingleRelation<T>): relation is T | [T, ...T[]] {
  if (relation === null || relation === undefined) return false;
  if (Array.isArray(relation)) return relation.length > 0;
  return true;
}

/**
 * Safely extracts a property from a Supabase relation.
 * Combines extractSingleRelation with property access.
 *
 * @example
 * const settings = extractRelationProperty(festival.clubs, 'settings');
 * // Returns the settings property or null
 */
export function extractRelationProperty<T extends object, K extends keyof T>(
  relation: SingleRelation<T>,
  key: K
): T[K] | null {
  const item = extractSingleRelation(relation);
  return item ? item[key] : null;
}

/**
 * Type helper for club settings extracted from a relation.
 * Use with extractSingleRelation for type-safe settings access.
 */
export interface ClubSettingsRelation {
  settings?: Record<string, unknown>;
}

/**
 * Extracts club settings from a clubs relation.
 * Returns an empty object if no settings found.
 *
 * @example
 * const festival = await supabase.from('festivals').select('clubs(settings)').single();
 * const settings = extractClubSettings(festival.clubs);
 * const guessingEnabled = settings.nomination_guessing_enabled === true;
 */
export function extractClubSettings(
  clubsRelation: SingleRelation<ClubSettingsRelation>
): Record<string, unknown> {
  const club = extractSingleRelation(clubsRelation);
  return club?.settings ?? {};
}

/**
 * Type helper for user display info from relations.
 */
export interface UserDisplayRelation {
  id?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string;
}

/**
 * Extracts user display name from a users relation.
 *
 * @example
 * const name = extractUserDisplayName(nomination.users, 'Member');
 */
export function extractUserDisplayName(
  usersRelation: SingleRelation<UserDisplayRelation>,
  fallback = "Unknown"
): string {
  const user = extractSingleRelation(usersRelation);
  return user?.display_name ?? user?.email ?? fallback;
}

/**
 * Type helper for movie info from relations.
 */
export interface MovieRelation {
  title?: string;
  poster_url?: string | null;
  year?: number | null;
  slug?: string | null;
  genres?: string[];
  director?: string;
}

/**
 * Extracts movie title from a movies relation.
 *
 * @example
 * const title = extractMovieTitle(nomination.movies, 'Movie');
 */
export function extractMovieTitle(
  moviesRelation: SingleRelation<MovieRelation>,
  fallback = "Movie"
): string {
  const movie = extractSingleRelation(moviesRelation);
  return movie?.title ?? fallback;
}

/**
 * Type helper for festival info from relations.
 */
export interface FestivalRelation {
  id?: string;
  theme?: string | null;
  slug?: string | null;
  club_id?: string;
  phase?: string;
  status?: string;
  nomination_deadline?: string | null;
}

/**
 * Type helper for club info from relations.
 */
export interface ClubRelation {
  id?: string;
  name?: string;
  slug?: string | null;
  settings?: Record<string, unknown>;
  avatar_icon?: string | null;
  avatar_color_index?: number | null;
  avatar_border_color_index?: number | null;
}

/**
 * Extracts club name from a clubs relation.
 *
 * @example
 * const clubName = extractClubName(festival.clubs, 'Club');
 */
export function extractClubName(
  clubsRelation: SingleRelation<ClubRelation>,
  fallback = "Club"
): string {
  const club = extractSingleRelation(clubsRelation);
  return club?.name ?? fallback;
}

/**
 * Extracts club slug from a clubs relation.
 *
 * @example
 * const slug = extractClubSlug(festival.clubs);
 */
export function extractClubSlug(clubsRelation: SingleRelation<ClubRelation>): string | null {
  const club = extractSingleRelation(clubsRelation);
  return club?.slug ?? null;
}

/**
 * Type helper for activity details JSONB field.
 * Use explicit properties for type-safe access.
 */
export interface ActivityDetails {
  tmdb_id?: number;
  movie_title?: string;
  target_name?: string;
  rating?: number;
  has_review?: boolean;
  festival_id?: string;
  festival_theme?: string;
}

/**
 * Type helper for badge requirements JSONB field.
 */
export interface BadgeRequirements {
  category?: string;
  threshold?: number;
  type?: string;
}

/**
 * Type helper for badge progress JSONB field.
 */
export interface BadgeProgress {
  current?: number;
}

/**
 * Type helper for placement points JSONB field.
 */
export interface PlacementPoints {
  type?: string;
  formula?: string;
}

/**
 * Type helper for club settings with known properties.
 */
export interface ClubSettingsTyped {
  festival_type?: "standard" | "endless";
  nomination_guessing_enabled?: boolean;
  scoring_enabled?: boolean;
  [key: string]: unknown;
}

/**
 * Extracts festival type from club settings.
 */
export function extractFestivalType(
  settings: Record<string, unknown> | null | undefined,
  fallback: "standard" | "endless" = "standard"
): "standard" | "endless" {
  if (!settings) return fallback;
  const ft = settings.festival_type;
  if (ft === "standard" || ft === "endless") return ft;
  return fallback;
}

/**
 * Type guard to check if activity details has a review.
 */
export function activityHasReview(details: Record<string, unknown> | null | undefined): boolean {
  if (!details) return false;
  return details.has_review === true;
}

/**
 * Parses activity details into a typed object.
 * Returns an empty object if details is null/undefined.
 */
export function parseActivityDetails(details: unknown): ActivityDetails {
  if (!details || typeof details !== "object") return {};
  return details as ActivityDetails;
}
