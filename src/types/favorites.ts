/**
 * User Favorites Types
 *
 * Types for the unlimited favorites system with featured ID card picks.
 */

export type FavoriteItemType = "movie" | "person";

/**
 * A single favorite item (movie or person)
 */
export interface UserFavorite {
  id: string;
  tmdb_id: number;
  item_type: FavoriteItemType;
  title: string;
  image_path: string | null;
  subtitle: string | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
  // Enriched movie metadata (from movies cache table, optional)
  director?: string | null;
  certification?: string | null;
  runtime?: number | null;
  genres?: string[] | null;
  // Enriched person metadata (from persons cache table, optional)
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string | null;
}
