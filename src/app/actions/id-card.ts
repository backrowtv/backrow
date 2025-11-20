"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import type {
  IDCardSettings,
  IDCardSocialLinksVisibility,
  UserIDCardStats,
  FeaturedBadge,
} from "@/types/id-card";

/**
 * Update which badges are featured on the user's ID card
 * @param badgeIds Array of badge IDs to feature (max 5)
 */
export async function updateFeaturedBadges(
  badgeIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Validate max 5 badges
    if (badgeIds.length > 5) {
      return { error: "Maximum of 5 featured badges allowed" };
    }

    // Validate that user has earned all these badges
    // A badge is earned if:
    // 1. There's a user_badges record with earned_at set, OR
    // 2. The user's current progress meets or exceeds the badge threshold
    if (badgeIds.length > 0) {
      // Get badges with earned_at
      const { data: earnedBadges, error: badgeError } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", user.id)
        .not("earned_at", "is", null)
        .in("badge_id", badgeIds);

      if (badgeError) {
        return handleActionError(badgeError, "updateFeaturedBadges");
      }

      const earnedBadgeIds = new Set(earnedBadges?.map((b) => b.badge_id) || []);
      const potentiallyUnearned = badgeIds.filter((id) => !earnedBadgeIds.has(id));

      // For badges not in user_badges, check if they're earned via progress
      if (potentiallyUnearned.length > 0) {
        // Get badge requirements
        const { data: badges, error: badgesError } = await supabase
          .from("badges")
          .select("id, requirements_jsonb")
          .in("id", potentiallyUnearned);

        if (badgesError) {
          return handleActionError(badgesError, "updateFeaturedBadges");
        }

        // Get user's current progress values
        const [winsCount, watchedCount, participatedCount, guessesResult] = await Promise.all([
          supabase
            .from("festival_standings")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("rank", 1),
          supabase
            .from("watch_history")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("festival_standings")
            .select("festival_id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase.from("festival_standings").select("correct_guesses").eq("user_id", user.id),
        ]);

        const currentValues: Record<string, number> = {
          festivals_won: winsCount.count || 0,
          movies_watched: watchedCount.count || 0,
          festivals_participated: participatedCount.count || 0,
          guesses_correct: (guessesResult.data || []).reduce(
            (sum, s) => sum + (Number(s.correct_guesses) || 0),
            0
          ),
        };

        // Check each badge
        for (const badge of badges || []) {
          const req = badge.requirements_jsonb as { threshold: number; category?: string };
          const category = req.category;
          const threshold = req.threshold;

          if (!category || currentValues[category] === undefined) {
            return { error: "Some badges have not been earned" };
          }

          if (currentValues[category] < threshold) {
            return { error: "Some badges have not been earned" };
          }
        }
      }
    }

    // Update user's featured badges
    const { error } = await supabase
      .from("users")
      .update({ featured_badge_ids: badgeIds })
      .eq("id", user.id);

    if (error) {
      return handleActionError(error, "updateFeaturedBadges");
    }

    revalidatePath("/profile");
    revalidatePath("/profile/display-case");

    return { success: true };
  } catch (error) {
    return handleActionError(error, "updateFeaturedBadges");
  }
}

/**
 * Update social link visibility settings for the ID card
 * @param visibility Object with platform names as keys and boolean visibility as values
 */
export async function updateSocialLinksVisibility(
  visibility: IDCardSocialLinksVisibility
): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get current settings
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("id_card_settings")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      return handleActionError(fetchError, "updateSocialLinksVisibility");
    }

    // Merge with existing settings
    const currentSettings = (userData?.id_card_settings as IDCardSettings) || {};
    const newSettings: IDCardSettings = {
      ...currentSettings,
      social_links_visibility: {
        ...currentSettings.social_links_visibility,
        ...visibility,
      },
    };

    // Update user's settings
    const { error } = await supabase
      .from("users")
      .update({ id_card_settings: newSettings })
      .eq("id", user.id);

    if (error) {
      return handleActionError(error, "updateSocialLinksVisibility");
    }

    revalidatePath("/profile");
    revalidatePath("/profile/display-case");

    return { success: true };
  } catch (error) {
    return handleActionError(error, "updateSocialLinksVisibility");
  }
}

/**
 * Get user stats for ID card display
 * Reads denormalized counts from users table (public profile data)
 * @param userId The user ID to get stats for
 */
export async function getUserIDCardStats(
  userId: string
): Promise<{ data: UserIDCardStats } | { error: string }> {
  try {
    const supabase = await createClient();

    // Read denormalized counts from users table (publicly readable)
    const { data, error } = await supabase
      .from("users")
      .select("clubs_count, movies_watched_count")
      .eq("id", userId)
      .single();

    if (error) {
      return handleActionError(error, "getUserIDCardStats");
    }

    return {
      data: {
        clubsCount: data?.clubs_count || 0,
        moviesWatchedCount: data?.movies_watched_count || 0,
      },
    };
  } catch (error) {
    return handleActionError(error, "getUserIDCardStats");
  }
}

// Tier thresholds for each category (used to calculate tier level)
const TIER_THRESHOLDS: Record<string, number[]> = {
  festivals_won: [1, 5, 10, 25, 50, 100],
  movies_watched: [1, 10, 25, 50, 100, 250],
  festivals_participated: [1, 10, 25, 50, 100, 250],
  guesses_correct: [1, 10, 25, 50, 100, 250],
};

/**
 * Calculate tier level based on category and threshold
 */
function getTierFromThreshold(category: string | undefined, threshold: number | undefined): number {
  if (!category || threshold === undefined) return 1;
  const thresholds = TIER_THRESHOLDS[category] || [1];
  const idx = thresholds.indexOf(threshold);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Get user's featured badges with full badge details
 * @param userId The user ID to get featured badges for
 */
export async function getUserFeaturedBadges(
  userId: string
): Promise<{ data: FeaturedBadge[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get user's featured badge IDs
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("featured_badge_ids")
      .eq("id", userId)
      .single();

    if (userError) {
      return handleActionError(userError, "getUserFeaturedBadges");
    }

    const featuredBadgeIds = userData?.featured_badge_ids || [];

    if (featuredBadgeIds.length === 0) {
      return { data: [] };
    }

    // Get badge details for featured badges (including requirements for category)
    const { data: badges, error: badgesError } = await supabase
      .from("badges")
      .select("id, name, description, icon_url, requirements_jsonb")
      .in("id", featuredBadgeIds);

    if (badgesError) {
      return handleActionError(badgesError, "getUserFeaturedBadges");
    }

    // Preserve order from featured_badge_ids and extract category/tier
    const badgeMap = new Map((badges || []).map((b) => [b.id, b]));
    const orderedBadges: FeaturedBadge[] = featuredBadgeIds
      .map((id: string) => {
        const badge = badgeMap.get(id);
        if (!badge) return undefined;
        const req = badge.requirements_jsonb as { category?: string; threshold?: number } | null;
        const category = (req?.category || "festivals_won") as FeaturedBadge["category"];
        const tier = getTierFromThreshold(req?.category, req?.threshold);
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon_url: badge.icon_url,
          category,
          tier,
        };
      })
      .filter((b: FeaturedBadge | undefined): b is FeaturedBadge => b !== undefined);

    return { data: orderedBadges };
  } catch (error) {
    return handleActionError(error, "getUserFeaturedBadges");
  }
}

/**
 * Get all earned badges for a user (for badge selector)
 */
export async function getEarnedBadgesForSelector(
  userId: string
): Promise<{ data: FeaturedBadge[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get all earned badges (site-wide only for now)
    const { data: userBadges, error: userBadgesError } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId)
      .not("earned_at", "is", null)
      .is("club_id", null); // Site badges only

    if (userBadgesError) {
      return handleActionError(userBadgesError, "getEarnedBadgesForSelector");
    }

    if (!userBadges || userBadges.length === 0) {
      return { data: [] };
    }

    const badgeIds = userBadges.map((ub) => ub.badge_id);

    // Get badge details
    const { data: badges, error: badgesError } = await supabase
      .from("badges")
      .select("id, name, description, icon_url")
      .in("id", badgeIds);

    if (badgesError) {
      return handleActionError(badgesError, "getEarnedBadgesForSelector");
    }

    return { data: (badges || []) as FeaturedBadge[] };
  } catch (error) {
    return handleActionError(error, "getEarnedBadgesForSelector");
  }
}
