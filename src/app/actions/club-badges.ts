"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import {
  type ClubBadgeCategory,
  type ClubBadgeWithProgress,
  type ClubBadgeData,
  type ClubBadgeCategoryId,
  type ClubChallengeStats,
  type ClubBadgeRequirements,
  CLUB_BADGE_CATEGORIES,
  CLUB_BADGE_CATEGORY_ORDER,
} from "@/types/club-badges";

/**
 * Calculate current stats for a club (festivals, movies, members, seasons)
 */
async function calculateClubStats(clubId: string): Promise<ClubChallengeStats> {
  const supabase = await createClient();

  const [festivalsResult, moviesResult, membersResult, seasonsResult] = await Promise.all([
    // Festivals completed
    supabase
      .from("festivals")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "completed"),

    // Movies watched (distinct tmdb_id from nominations in completed festivals)
    supabase
      .from("nominations")
      .select("tmdb_id, festivals!inner(status)")
      .eq("festivals.club_id", clubId)
      .eq("festivals.status", "completed")
      .is("deleted_at", null),

    // Members count
    supabase.from("club_members").select("*", { count: "exact", head: true }).eq("club_id", clubId),

    // Seasons - get all seasons and check if all their festivals are completed
    supabase.from("seasons").select("id").eq("club_id", clubId),
  ]);

  // Count unique movies
  const uniqueMovies = new Set((moviesResult.data || []).map((n) => n.tmdb_id));

  // Count completed seasons (all festivals in season are completed)
  // Batch query: get all festivals for all seasons in one query
  let completedSeasons = 0;
  if (seasonsResult.data && seasonsResult.data.length > 0) {
    const seasonIds = seasonsResult.data.map((s) => s.id);
    const { data: allSeasonFestivals } = await supabase
      .from("festivals")
      .select("season_id, status")
      .in("season_id", seasonIds);

    // Group festivals by season in memory
    const festivalsBySeason = new Map<string, { status: string }[]>();
    if (allSeasonFestivals) {
      for (const festival of allSeasonFestivals) {
        if (festival.season_id) {
          const existing = festivalsBySeason.get(festival.season_id) || [];
          existing.push({ status: festival.status });
          festivalsBySeason.set(festival.season_id, existing);
        }
      }
    }

    // Count seasons where all festivals are completed
    for (const seasonId of seasonIds) {
      const seasonFestivals = festivalsBySeason.get(seasonId) || [];
      if (seasonFestivals.length > 0 && seasonFestivals.every((f) => f.status === "completed")) {
        completedSeasons++;
      }
    }
  }

  return {
    festivalsCompleted: festivalsResult.count || 0,
    moviesWatched: uniqueMovies.size,
    members: membersResult.count || 0,
    seasonsCompleted: completedSeasons,
  };
}

/**
 * Get all club challenge badges organized by category with progress
 */
export async function getClubBadgeData(
  clubId: string
): Promise<{ data: ClubBadgeData } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get all club challenge badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*")
      .eq("badge_type", "club_challenge")
      .is("club_id", null)
      .order("requirements_jsonb->threshold", { ascending: true });

    if (badgesError) {
      return handleActionError(badgesError, "getClubBadgeData");
    }

    // Get club's earned badges
    const { data: clubBadges, error: clubBadgesError } = await supabase
      .from("club_badges")
      .select("*")
      .eq("club_id", clubId);

    if (clubBadgesError) {
      return handleActionError(clubBadgesError, "getClubBadgeData");
    }

    // Create a map of club badge progress
    const clubBadgeMap = new Map((clubBadges || []).map((cb) => [cb.badge_id, cb]));

    // Get current stats
    const stats = await calculateClubStats(clubId);

    // Map stats to category values
    const currentValues: Record<ClubBadgeCategoryId, number> = {
      festivals_completed: stats.festivalsCompleted,
      movies_watched: stats.moviesWatched,
      members: stats.members,
      seasons_completed: stats.seasonsCompleted,
    };

    // Organize badges by category
    const categories: ClubBadgeCategory[] = CLUB_BADGE_CATEGORY_ORDER.map((categoryId) => {
      const meta = CLUB_BADGE_CATEGORIES[categoryId];
      const categoryBadges = (allBadges || [])
        .filter((b) => {
          const req = b.requirements_jsonb as ClubBadgeRequirements;
          return req.category === categoryId;
        })
        .sort((a, b) => {
          const aThreshold = (a.requirements_jsonb as ClubBadgeRequirements).threshold;
          const bThreshold = (b.requirements_jsonb as ClubBadgeRequirements).threshold;
          return aThreshold - bThreshold;
        });

      const currentValue = currentValues[categoryId];
      let foundNextToUnlock = false;

      const badgesWithProgress: ClubBadgeWithProgress[] = categoryBadges.map((badge, _index) => {
        const clubBadge = clubBadgeMap.get(badge.id);
        const req = badge.requirements_jsonb as ClubBadgeRequirements;
        const threshold = req.threshold;
        // Badge is earned if current value >= threshold OR has earned_at date
        const earned = currentValue >= threshold || !!clubBadge?.earned_at;
        const isNextToUnlock = !earned && !foundNextToUnlock;

        if (isNextToUnlock) {
          foundNextToUnlock = true;
        }

        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon_url: badge.icon_url,
          threshold,
          earned,
          earnedAt: clubBadge?.earned_at || null,
          progress: {
            current: currentValue,
            target: threshold,
            percent: Math.min((currentValue / threshold) * 100, 100),
          },
          isNextToUnlock,
        };
      });

      return {
        category: categoryId,
        displayName: meta.displayName,
        description: meta.description,
        icon: meta.icon,
        badges: badgesWithProgress,
        currentValue,
      };
    });

    // Collect earned badge IDs
    const earnedBadgeIds = categories.flatMap((cat) =>
      cat.badges.filter((b) => b.earned).map((b) => b.id)
    );

    return {
      data: {
        categories,
        earnedBadgeIds,
      },
    };
  } catch (error) {
    return handleActionError(error, "getClubBadgeData");
  }
}

/**
 * Check and award club badges based on current stats
 */
export async function checkAndAwardClubBadges(
  clubId: string
): Promise<{ awarded: string[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get current stats
    const stats = await calculateClubStats(clubId);

    // Map stats to requirement types
    const statsByType: Record<string, number> = {
      club_festivals_completed: stats.festivalsCompleted,
      club_movies_watched: stats.moviesWatched,
      club_members: stats.members,
      club_seasons_completed: stats.seasonsCompleted,
    };

    // Get all club challenge badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("id, requirements_jsonb")
      .eq("badge_type", "club_challenge")
      .is("club_id", null);

    if (badgesError) {
      return handleActionError(badgesError, "checkAndAwardClubBadges");
    }

    // Get club's existing badges
    const { data: existingBadges } = await supabase
      .from("club_badges")
      .select("badge_id, earned_at")
      .eq("club_id", clubId);

    const existingBadgeMap = new Map((existingBadges || []).map((eb) => [eb.badge_id, eb]));

    const awardedBadgeIds: string[] = [];

    // Check each badge
    for (const badge of allBadges || []) {
      const req = badge.requirements_jsonb as ClubBadgeRequirements;
      const currentValue = statsByType[req.type] || 0;
      const existing = existingBadgeMap.get(badge.id);

      // Upsert progress
      await supabase.from("club_badges").upsert(
        {
          club_id: clubId,
          badge_id: badge.id,
          progress: currentValue,
          earned_at:
            currentValue >= req.threshold ? existing?.earned_at || new Date().toISOString() : null,
        },
        { onConflict: "club_id,badge_id" }
      );

      // Track newly awarded badges
      if (currentValue >= req.threshold && !existing?.earned_at) {
        awardedBadgeIds.push(badge.id);
      }
    }

    return { awarded: awardedBadgeIds };
  } catch (error) {
    return handleActionError(error, "checkAndAwardClubBadges");
  }
}

/**
 * Update featured badges for a club (max 5)
 * Only producers and directors can do this
 */
export async function updateClubFeaturedBadges(
  clubId: string,
  badgeIds: string[]
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Check if user is producer or director
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .single();

    if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
      return { error: "Only producers and directors can update featured badges" };
    }

    // Validate max 5 badges
    if (badgeIds.length > 5) {
      return { error: "Maximum 5 badges can be featured" };
    }

    // Validate all badges are earned by this club
    if (badgeIds.length > 0) {
      const { data: earnedBadges } = await supabase
        .from("club_badges")
        .select("badge_id")
        .eq("club_id", clubId)
        .not("earned_at", "is", null)
        .in("badge_id", badgeIds);

      const earnedBadgeIds = new Set((earnedBadges || []).map((b) => b.badge_id));
      const invalidBadges = badgeIds.filter((id) => !earnedBadgeIds.has(id));

      if (invalidBadges.length > 0) {
        return { error: "Can only feature earned badges" };
      }
    }

    // Update club's featured badges
    const { error: updateError } = await supabase
      .from("clubs")
      .update({ featured_badge_ids: badgeIds })
      .eq("id", clubId);

    if (updateError) {
      return handleActionError(updateError, "updateClubFeaturedBadges");
    }

    // Revalidate paths
    revalidatePath(`/club/[slug]`, "page");
    revalidatePath(`/club/[slug]/display-case`, "page");

    return { success: true };
  } catch (error) {
    return handleActionError(error, "updateClubFeaturedBadges");
  }
}

/**
 * Get featured badges for a club (for display on ID card)
 */
export async function getClubFeaturedBadges(
  clubId: string
): Promise<{ data: ClubBadgeWithProgress[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get club's featured badge IDs
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("featured_badge_ids")
      .eq("id", clubId)
      .single();

    if (clubError) {
      return handleActionError(clubError, "getClubFeaturedBadges");
    }

    const featuredIds: string[] = (club?.featured_badge_ids as string[]) || [];

    if (featuredIds.length === 0) {
      return { data: [] };
    }

    // Get badge details
    const { data: badges, error: badgesError } = await supabase
      .from("badges")
      .select("*")
      .in("id", featuredIds);

    if (badgesError) {
      return handleActionError(badgesError, "getClubFeaturedBadges");
    }

    // Get club badge progress
    const { data: clubBadges } = await supabase
      .from("club_badges")
      .select("*")
      .eq("club_id", clubId)
      .in("badge_id", featuredIds);

    const clubBadgeMap = new Map((clubBadges || []).map((cb) => [cb.badge_id, cb]));

    // Build featured badges list in order
    const featuredBadges: ClubBadgeWithProgress[] = featuredIds
      .map((id) => {
        const badge = badges?.find((b) => b.id === id);
        if (!badge) return null;

        const clubBadge = clubBadgeMap.get(id);
        const req = badge.requirements_jsonb as ClubBadgeRequirements;

        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon_url: badge.icon_url,
          threshold: req.threshold,
          earned: !!clubBadge?.earned_at,
          earnedAt: clubBadge?.earned_at || null,
          progress: {
            current: clubBadge?.progress || 0,
            target: req.threshold,
            percent: Math.min(((clubBadge?.progress || 0) / req.threshold) * 100, 100),
          },
          isNextToUnlock: false,
        };
      })
      .filter((b): b is ClubBadgeWithProgress => b !== null);

    return { data: featuredBadges };
  } catch (error) {
    return handleActionError(error, "getClubFeaturedBadges");
  }
}
