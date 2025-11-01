import { createClient } from "@/lib/supabase/server";
import { UserIDCard } from "./UserIDCard";
import { getUserBadges } from "@/app/actions/badges";
import { getUserIDCardStats, getUserFeaturedBadges } from "@/app/actions/id-card";
import { getFeaturedFavorites } from "@/app/actions/profile/favorites";
import type { IDCardSettings } from "@/types/id-card";

interface UserIDCardServerProps {
  userId: string;
  showEditButton?: boolean;
  variant?: "full" | "compact";
  className?: string;
}

/**
 * UserIDCardServer - Server component that fetches user data and renders UserIDCard
 *
 * This component handles all the data fetching for:
 * - User profile data
 * - Featured favorites (from user_favorites table)
 * - Favorite club
 * - Festival trophy counts
 * - User badges
 */
export async function UserIDCardServer({
  userId,
  showEditButton = false,
  variant = "full",
  className,
}: UserIDCardServerProps) {
  const supabase = await createClient();

  // Fetch all data in parallel
  const [
    profileResult,
    favoriteClubResult,
    winsResult,
    badgesResult,
    statsResult,
    featuredBadgesResult,
    featuredFavoritesResult,
  ] = await Promise.all([
    // User profile
    supabase
      .from("users")
      .select(
        `
        id,
        display_name,
        username,
        email,
        avatar_url,
        bio,
        social_links,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index,
        featured_badge_ids,
        id_card_settings
      `
      )
      .eq("id", userId)
      .single(),

    // Favorite club (most recently favorited)
    supabase
      .from("favorite_clubs")
      .select("club_id, clubs:club_id!inner(id, name, slug)")
      .eq("user_id", userId)
      .eq("clubs.archived", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Festival standings (1st, 2nd, 3rd place counts)
    supabase.from("festival_standings").select("rank").eq("user_id", userId).in("rank", [1, 2, 3]),

    // User badges
    getUserBadges(userId),

    // User stats (clubs count, movies watched)
    getUserIDCardStats(userId),

    // Featured badges for ID card
    getUserFeaturedBadges(userId),

    // Featured favorites from user_favorites table
    getFeaturedFavorites(userId),
  ]);

  const profile = profileResult.data;
  if (!profile) {
    return null;
  }

  // Count trophy placements
  const festivalWins = { first: 0, second: 0, third: 0 };
  if (winsResult.data) {
    winsResult.data.forEach((standing) => {
      if (standing.rank === 1) festivalWins.first++;
      else if (standing.rank === 2) festivalWins.second++;
      else if (standing.rank === 3) festivalWins.third++;
    });
  }

  // Extract favorite club
  const favoriteClubData = favoriteClubResult.data?.clubs;
  const favoriteClub = Array.isArray(favoriteClubData)
    ? (favoriteClubData[0] as { id: string; name: string; slug: string } | undefined)
    : (favoriteClubData as { id: string; name: string; slug: string } | null | undefined);

  // Extract earned badges (getUserBadges returns { data: UserBadge[] } | { error: string })
  const earnedBadges =
    "data" in badgesResult
      ? badgesResult.data.map((ub) => ({
          id: ub.badge_id,
          name: ub.badge.name,
          icon_url: ub.badge.icon_url,
        }))
      : [];

  // Extract stats
  const stats = "data" in statsResult ? statsResult.data : { clubsCount: 0, moviesWatchedCount: 0 };

  // Extract featured badges
  const featuredBadges = "data" in featuredBadgesResult ? featuredBadgesResult.data : [];

  // Extract featured favorites
  const featuredFavorites = featuredFavoritesResult.data || [];

  // Build user data for the ID card
  const displayName = profile.display_name || profile.email?.split("@")[0] || "User";
  const userData = {
    id: profile.id,
    name: displayName,
    display_name: displayName,
    username: profile.username,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    email: profile.email,
    avatar_icon: profile.avatar_icon,
    avatar_color_index: profile.avatar_color_index,
    avatar_border_color_index: profile.avatar_border_color_index,
    social_links: profile.social_links as {
      letterboxd?: string;
      imdb?: string;
      trakt?: string;
      tmdb?: string;
    } | null,
    id_card_settings: (profile.id_card_settings as IDCardSettings) || null,
  };

  const favorites = {
    featured: featuredFavorites,
    club: favoriteClub || undefined,
  };

  const achievements = {
    festivalWins,
    badges: earnedBadges,
  };

  return (
    <UserIDCard
      user={userData}
      favorites={favorites}
      achievements={achievements}
      stats={stats}
      featuredBadges={featuredBadges}
      showEditButton={showEditButton}
      variant={variant}
      className={className}
    />
  );
}
