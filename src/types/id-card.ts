/**
 * ID Card Types
 *
 * TypeScript interfaces for the user ID card system including
 * featured badges, social link visibility, and stats.
 */

import type { BadgeCategoryId } from "./badges";

/**
 * Visibility settings for each social platform on the ID card
 */
export interface IDCardSocialLinksVisibility {
  letterboxd?: boolean;
  imdb?: boolean;
  trakt?: boolean;
  tmdb?: boolean;

  youtube?: boolean;
  twitter?: boolean;
  instagram?: boolean;
  reddit?: boolean;
  discord?: boolean;
  tiktok?: boolean;
}

/**
 * Settings stored in users.id_card_settings JSONB column
 */
export interface IDCardSettings {
  social_links_visibility?: IDCardSocialLinksVisibility;
}

/**
 * Stats displayed on the ID card
 */
export interface UserIDCardStats {
  clubsCount: number;
  moviesWatchedCount: number;
}

/**
 * Badge data for display on ID card
 */
export interface FeaturedBadge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  category: BadgeCategoryId;
  tier: number;
}

/**
 * Social links data structure from users.social_links
 */
export interface SocialLinksData {
  letterboxd?: string;
  imdb?: string;
  trakt?: string;
  tmdb?: string;

  youtube?: string;
  twitter?: string;
  instagram?: string;
  reddit?: string;
  discord?: string;
  tiktok?: string;
}

/**
 * Favorite movie data fetched from TMDB
 */
export interface FavoriteMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string | null;
}

/**
 * Favorite person data fetched from TMDB
 */
export interface FavoritePerson {
  id: number;
  name: string;
  profile_path: string | null;
}

/**
 * Complete favorites collection for ID card
 * Up to 4 featured items, any mix of movies and people
 */
export interface UserIDCardFavorites {
  featured: FeaturedFavorite[];
}

/**
 * A featured favorite for ID card display
 */
export interface FeaturedFavorite {
  tmdb_id: number;
  item_type: "movie" | "person";
  title: string;
  image_path: string | null;
}

/**
 * User data needed for ID card display
 */
export interface UserIDCardUser {
  id: string;
  display_name: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  email?: string;
  avatar_icon?: string | null;
  avatar_color_index?: number | null;
  avatar_border_color_index?: number | null;
  social_links: SocialLinksData | null;
  id_card_settings: IDCardSettings | null;
}

/**
 * Complete data package for rendering UserIDCard
 */
export interface UserIDCardData {
  user: UserIDCardUser;
  favorites: UserIDCardFavorites;
  stats: UserIDCardStats;
  featuredBadges: FeaturedBadge[];
}
