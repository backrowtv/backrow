/**
 * Avatar Helpers - Unified avatar data normalization
 *
 * Provides a single AvatarData interface and normalizer functions
 * to convert user/club database rows into a consistent shape
 * for the EntityAvatar component.
 */

/**
 * Unified avatar data shape used by EntityAvatar.
 * Both user and club data gets normalized to this interface.
 */
export interface AvatarData {
  /** Display name (user's display_name or club's name) */
  name: string;
  /** Image URL (user's avatar_url or club's picture_url) */
  avatar_url?: string | null;
  /** Icon identifier: 'letter', 'photo', emoji ID, or emoji char */
  avatar_icon?: string | null;
  /** Index into AVATAR_COLORS (0-17) or -1 for theme color */
  avatar_color_index?: number | null;
  /** Border color index (0-17), -1 for theme, or null for no border */
  avatar_border_color_index?: number | null;
  /** User email — used for founder detection */
  email?: string | null;
  /** Club slug — used for BackRow Featured detection */
  slug?: string | null;
}

/**
 * Standard select fragments for Supabase queries.
 * Use these to ensure all avatar-related columns are always fetched.
 */
export const USER_AVATAR_SELECT =
  "id, display_name, email, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index";
export const CLUB_AVATAR_SELECT =
  "id, name, slug, picture_url, avatar_icon, avatar_color_index, avatar_border_color_index";

/**
 * Normalize a user database row into AvatarData.
 * Handles common user field shapes from various queries.
 */
export function userToAvatarData(
  user:
    | {
        display_name?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        avatar_icon?: string | null;
        avatar_color_index?: number | null;
        avatar_border_color_index?: number | null;
        username?: string | null;
      }
    | null
    | undefined
): AvatarData | null {
  if (!user) return null;
  return {
    name: user.display_name || user.email?.split("@")[0] || user.username || "User",
    avatar_url: user.avatar_url,
    avatar_icon: user.avatar_icon,
    avatar_color_index: user.avatar_color_index,
    avatar_border_color_index: user.avatar_border_color_index,
    email: user.email,
  };
}

/**
 * Normalize a club database row into AvatarData.
 * Maps picture_url → avatar_url for unified rendering.
 */
export function clubToAvatarData(
  club:
    | {
        name?: string | null;
        slug?: string | null;
        picture_url?: string | null;
        logo_url?: string | null;
        avatar_icon?: string | null;
        avatar_color_index?: number | null;
        avatar_border_color_index?: number | null;
      }
    | null
    | undefined
): AvatarData | null {
  if (!club) return null;
  return {
    name: club.name || "Club",
    avatar_url: club.picture_url || club.logo_url,
    avatar_icon: club.avatar_icon,
    avatar_color_index: club.avatar_color_index,
    avatar_border_color_index: club.avatar_border_color_index,
    slug: club.slug,
  };
}
