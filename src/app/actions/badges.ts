"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "./notifications";
import { logMemberActivity } from "@/lib/activity/logger";
import { handleActionError } from "@/lib/errors/handler";
import {
  type BadgeCategory,
  type BadgeWithProgress,
  type UserBadgeData,
  BADGE_CATEGORIES,
  BADGE_CATEGORY_ORDER,
} from "@/types/badges";
import type { Badge, UserBadge } from "./badges.types";

/**
 * Get all badges for a user (site-wide and club-specific)
 */
export async function getUserBadges(
  userId: string,
  clubId?: string
): Promise<{ data: UserBadge[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get user badges
    let query = supabase
      .from("user_badges")
      .select("user_id, badge_id, club_id, earned_at, progress_jsonb")
      .eq("user_id", userId);

    if (clubId) {
      query = query.or(`club_id.eq.${clubId},club_id.is.null`);
    } else {
      query = query.is("club_id", null);
    }

    const { data: userBadges, error } = await query.order("earned_at", { ascending: false });

    if (error) {
      return handleActionError(error, "getUserBadges");
    }

    if (!userBadges || userBadges.length === 0) {
      return { data: [] };
    }

    // Get badge details for all badges
    const badgeIds = [...new Set(userBadges.map((ub) => ub.badge_id))];
    const { data: badges, error: badgesError } = await supabase
      .from("badges")
      .select(
        "id, name, description, icon_url, badge_type, club_id, requirements_jsonb, created_at"
      )
      .in("id", badgeIds);

    if (badgesError) {
      return handleActionError(badgesError, { action: "getUserBadges" });
    }

    // Combine user badges with badge details
    const badgeMap = new Map((badges || []).map((b) => [b.id, b]));
    const transformedData: UserBadge[] = userBadges
      .map((ub) => {
        const badge = badgeMap.get(ub.badge_id);
        if (!badge) return null;
        return {
          user_id: ub.user_id,
          badge_id: ub.badge_id,
          club_id: ub.club_id,
          earned_at: ub.earned_at,
          progress_jsonb: ub.progress_jsonb,
          badge: badge as Badge,
        };
      })
      .filter((item): item is UserBadge => item !== null);

    return { data: transformedData };
  } catch (error) {
    return handleActionError(error, "getUserBadges");
  }
}

/**
 * Get progress for a specific badge
 */
export async function getBadgeProgress(
  userId: string,
  badgeId: string,
  clubId?: string
): Promise<{ current: number; target: number; progress: number } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get badge requirements
    const { data: badge, error: badgeError } = await supabase
      .from("badges")
      .select("requirements_jsonb")
      .eq("id", badgeId)
      .single();

    if (badgeError || !badge) {
      return { error: "Badge not found" };
    }

    const requirements = badge.requirements_jsonb as {
      type: string;
      threshold: number;
    };

    // Get user badge entry if exists
    let query = supabase
      .from("user_badges")
      .select("progress_jsonb")
      .eq("user_id", userId)
      .eq("badge_id", badgeId);

    if (clubId) {
      query = query.eq("club_id", clubId);
    } else {
      query = query.is("club_id", null);
    }

    const { data: userBadge } = await query.maybeSingle();

    const progress = (userBadge?.progress_jsonb as { current?: number })?.current || 0;
    const target = requirements.threshold || 0;

    return {
      current: progress,
      target,
      progress: target > 0 ? Math.min((progress / target) * 100, 100) : 0,
    };
  } catch (error) {
    return handleActionError(error, "getBadgeProgress");
  }
}

/**
 * Check and update badge progress
 */
export async function checkBadgeProgress(
  userId: string,
  badgeId: string,
  clubId?: string
): Promise<{ updated: boolean; awarded: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get badge requirements
    const { data: badge, error: badgeError } = await supabase
      .from("badges")
      .select("requirements_jsonb, badge_type, club_id")
      .eq("id", badgeId)
      .single();

    if (badgeError || !badge) {
      return { error: "Badge not found" };
    }

    const requirements = badge.requirements_jsonb as {
      type: string;
      threshold: number;
    };

    // Calculate current progress based on badge type
    let current = 0;

    if (requirements.type === "movie_milestone") {
      // Count movies watched
      const { count, error: countError } = await supabase
        .from("watch_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        return { error: "Failed to count movies" };
      }

      current = count || 0;
    } else if (requirements.type === "festival_milestone") {
      // Count completed festivals where user participated
      const { data: standings, error: standingsError } = await supabase
        .from("festival_standings")
        .select("festival_id")
        .eq("user_id", userId);

      if (standingsError) {
        return { error: "Failed to count festivals" };
      }

      if (standings && standings.length > 0) {
        const festivalIds = standings.map((s) => s.festival_id);
        const { count, error: countError } = await supabase
          .from("festivals")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .in("id", festivalIds);

        if (countError) {
          return { error: "Failed to count festivals" };
        }

        current = count || 0;
      }
    } else if (requirements.type === "festival_win_milestone") {
      // Count festivals won (rank = 1)
      const { count, error: countError } = await supabase
        .from("festival_standings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("rank", 1);

      if (countError) {
        return { error: "Failed to count festival wins" };
      }

      current = count || 0;
    } else if (requirements.type === "guess_milestone") {
      // Sum correct guesses from festival standings
      const { data: standings, error: standingsError } = await supabase
        .from("festival_standings")
        .select("correct_guesses")
        .eq("user_id", userId);

      if (standingsError) {
        return { error: "Failed to count guesses" };
      }

      current = (standings || []).reduce((sum, s) => sum + (Number(s.correct_guesses) || 0), 0);
    }

    // Check if user already has this badge
    let userBadgeQuery = supabase
      .from("user_badges")
      .select("user_id, badge_id, club_id, earned_at, progress_jsonb")
      .eq("user_id", userId)
      .eq("badge_id", badgeId);

    if (clubId) {
      userBadgeQuery = userBadgeQuery.eq("club_id", clubId);
    } else {
      userBadgeQuery = userBadgeQuery.is("club_id", null);
    }

    const { data: existingBadge } = await userBadgeQuery.maybeSingle();

    // Update progress
    const progressJsonb = { current, target: requirements.threshold };

    if (existingBadge) {
      // Update existing progress
      await supabase
        .from("user_badges")
        .update({ progress_jsonb: progressJsonb })
        .eq("user_id", userId)
        .eq("badge_id", badgeId)
        .eq("club_id", clubId || null);

      // Check if badge should be awarded
      if (current >= requirements.threshold && existingBadge.earned_at) {
        return { updated: true, awarded: false }; // Already awarded
      }
    } else {
      // Create progress entry
      await supabase.from("user_badges").insert({
        user_id: userId,
        badge_id: badgeId,
        club_id: clubId || null,
        progress_jsonb: progressJsonb,
      });
    }

    // Award badge if threshold reached
    if (current >= requirements.threshold && !existingBadge?.earned_at) {
      const result = await awardBadge(userId, badgeId, clubId);
      if ("error" in result) {
        return result;
      }
      return { updated: true, awarded: result.awarded };
    }

    return { updated: true, awarded: false };
  } catch (error) {
    return handleActionError(error, "checkBadgeProgress");
  }
}

/**
 * Award a badge to a user
 */
export async function awardBadge(
  userId: string,
  badgeId: string,
  clubId?: string
): Promise<{ awarded: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get badge details
    const { data: badge, error: badgeError } = await supabase
      .from("badges")
      .select("name, description, badge_type")
      .eq("id", badgeId)
      .single();

    if (badgeError || !badge) {
      return { error: "Badge not found" };
    }

    // Check if already awarded
    let checkQuery = supabase
      .from("user_badges")
      .select("earned_at")
      .eq("user_id", userId)
      .eq("badge_id", badgeId);

    if (clubId) {
      checkQuery = checkQuery.eq("club_id", clubId);
    } else {
      checkQuery = checkQuery.is("club_id", null);
    }

    const { data: existing } = await checkQuery.maybeSingle();

    if (existing?.earned_at) {
      return { awarded: false }; // Already awarded
    }

    // Award badge
    const { error: updateError } = await supabase.from("user_badges").upsert(
      {
        user_id: userId,
        badge_id: badgeId,
        club_id: clubId || null,
        earned_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,badge_id,club_id",
      }
    );

    if (updateError) {
      return handleActionError(updateError, "awardBadge");
    }

    // Create notification
    await createNotification({
      userId,
      type: "badge_earned",
      title: "Badge Earned!",
      message: `You earned the "${badge.name}" badge!`,
      link: `/profile/display-case`,
    });

    // Log member activity
    await logMemberActivity(
      userId,
      "user_badge_earned",
      {
        badge_id: badgeId,
        badge_name: badge.name,
        badge_type: badge.badge_type,
        club_id: clubId,
      },
      clubId
    );

    return { awarded: true };
  } catch (error) {
    return handleActionError(error, "awardBadge");
  }
}

/**
 * Check all relevant badges for a user after an action
 */
export async function checkRelevantBadges(
  userId: string,
  actionType: "movie_watched" | "festival_completed" | "festival_won" | "guess_recorded",
  clubId?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get relevant badges based on action type
    let badgeType = "";
    if (actionType === "movie_watched") {
      badgeType = "movie_milestone";
    } else if (actionType === "festival_completed") {
      badgeType = "festival_milestone";
    } else if (actionType === "festival_won") {
      badgeType = "festival_win_milestone";
    } else if (actionType === "guess_recorded") {
      badgeType = "guess_milestone";
    }

    // Get site-wide badges of this type
    const { data: siteBadges } = await supabase
      .from("badges")
      .select("id")
      .eq("badge_type", "site")
      .eq("requirements_jsonb->>type", badgeType);

    // Check each badge
    if (siteBadges) {
      for (const badge of siteBadges) {
        await checkBadgeProgress(userId, badge.id);
      }
    }

    // If clubId provided, check club-specific badges
    if (clubId) {
      const { data: clubBadges } = await supabase
        .from("badges")
        .select("id")
        .eq("badge_type", "club")
        .eq("club_id", clubId)
        .eq("requirements_jsonb->>type", badgeType);

      if (clubBadges) {
        for (const badge of clubBadges) {
          await checkBadgeProgress(userId, badge.id, clubId);
        }
      }
    }
  } catch (error) {
    handleActionError(error, { action: "checkRelevantBadges", silent: true });
    // Don't throw - badge checking shouldn't break the main flow
  }
}

/**
 * Get all badges organized by category with user progress
 */
export async function getAllBadgesByCategory(
  userId: string
): Promise<{ data: UserBadgeData } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get all site badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select(
        "id, name, description, icon_url, badge_type, club_id, requirements_jsonb, created_at"
      )
      .eq("badge_type", "site")
      .order("requirements_jsonb->threshold", { ascending: true });

    if (badgesError) {
      return handleActionError(badgesError, "getAllBadgesByCategory");
    }

    // Get user's badge progress
    const { data: userBadges, error: userBadgesError } = await supabase
      .from("user_badges")
      .select("user_id, badge_id, club_id, earned_at, progress_jsonb")
      .eq("user_id", userId)
      .is("club_id", null);

    if (userBadgesError) {
      return handleActionError(userBadgesError, "getAllBadgesByCategory");
    }

    // Create a map of user badge progress
    const userBadgeMap = new Map((userBadges || []).map((ub) => [ub.badge_id, ub]));

    // Get current counts for each category
    const [winsCount, watchedCount, participatedCount, guessesCount] = await Promise.all([
      // Festivals won
      supabase
        .from("festival_standings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("rank", 1),
      // Movies watched
      supabase
        .from("watch_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      // Festivals participated (via standings)
      supabase
        .from("festival_standings")
        .select("festival_id", { count: "exact", head: true })
        .eq("user_id", userId),
      // Correct guesses - sum from standings
      supabase.from("festival_standings").select("correct_guesses").eq("user_id", userId),
    ]);

    const currentValues: Record<string, number> = {
      festivals_won: winsCount.count || 0,
      movies_watched: watchedCount.count || 0,
      festivals_participated: participatedCount.count || 0,
      guesses_correct: (guessesCount.data || []).reduce(
        (sum, s) => sum + (Number(s.correct_guesses) || 0),
        0
      ),
    };

    // Organize badges by category
    const categories: BadgeCategory[] = BADGE_CATEGORY_ORDER.map((categoryId) => {
      const meta = BADGE_CATEGORIES[categoryId];
      const categoryBadges = (allBadges || [])
        .filter((b) => {
          const req = b.requirements_jsonb as { category?: string };
          return req.category === categoryId;
        })
        .sort((a, b) => {
          const aThreshold = (a.requirements_jsonb as { threshold: number }).threshold;
          const bThreshold = (b.requirements_jsonb as { threshold: number }).threshold;
          return aThreshold - bThreshold;
        });

      const currentValue = currentValues[categoryId];
      let foundNextToUnlock = false;

      const badgesWithProgress: BadgeWithProgress[] = categoryBadges.map((badge) => {
        const userBadge = userBadgeMap.get(badge.id);
        const req = badge.requirements_jsonb as { threshold: number };
        const threshold = req.threshold;
        // Badge is earned if user has reached the threshold OR has an earned_at date
        const earned = currentValue >= threshold || !!userBadge?.earned_at;
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
          earnedAt: userBadge?.earned_at || null,
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

    // Fetch one-off achievement badges
    const achievements = (allBadges || [])
      .filter((b) => {
        const req = b.requirements_jsonb as { category?: string };
        return req.category === "achievements";
      })
      .map((badge) => {
        const userBadge = userBadgeMap.get(badge.id);
        const req = badge.requirements_jsonb as { type: string };
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon_url: badge.icon_url,
          earned: !!userBadge?.earned_at,
          earnedAt: userBadge?.earned_at || null,
          requirementType: req.type,
        };
      });

    // Collect all earned badge IDs (including achievements)
    const earnedBadgeIds = [
      ...categories.flatMap((cat) => cat.badges.filter((b) => b.earned).map((b) => b.id)),
      ...achievements.filter((b) => b.earned).map((b) => b.id),
    ];

    return {
      data: {
        categories,
        achievements,
        earnedBadgeIds,
      },
    };
  } catch (error) {
    return handleActionError(error, "getAllBadgesByCategory");
  }
}

/**
 * Award a one-off achievement badge if not already earned.
 * Looks up badge by requirement type, checks if already awarded, then awards.
 */
export async function awardAchievementIfNotEarned(
  userId: string,
  requirementType: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Find badge by requirement type
    const { data: allBadges } = await supabase
      .from("badges")
      .select("id, requirements_jsonb")
      .eq("badge_type", "site");

    const badge = allBadges?.find((b) => {
      const req = b.requirements_jsonb as { type?: string };
      return req.type === requirementType;
    });

    if (!badge) return;

    await awardBadge(userId, badge.id);
  } catch (error) {
    console.error(`Achievement check failed for ${requirementType}:`, error);
  }
}

/**
 * Check rating-based achievements after a rating is created/updated.
 * Checks: Perfect 10, Tough Crowd, Contrarian, Generous
 */
export async function checkRatingAchievements(
  userId: string,
  normalizedRating: number,
  nominationId: string
): Promise<void> {
  try {
    // Perfect 10
    if (normalizedRating === 10.0) {
      await awardAchievementIfNotEarned(userId, "rating_perfect_10");
    }

    // Tough Crowd
    if (normalizedRating === 0.0) {
      await awardAchievementIfNotEarned(userId, "rating_rock_bottom");
    }

    // Contrarian & Generous: compare against group average
    const supabase = await createClient();
    const { data: allRatings } = await supabase
      .from("ratings")
      .select("rating, user_id")
      .eq("nomination_id", nominationId)
      .not("rating", "is", null);

    if (allRatings && allRatings.length >= 2) {
      const othersRatings = allRatings.filter((r) => r.user_id !== userId);
      if (othersRatings.length > 0) {
        const groupAvg =
          othersRatings.reduce((sum, r) => sum + Number(r.rating), 0) / othersRatings.length;
        const diff = normalizedRating - groupAvg;

        if (diff <= -3.0) {
          await awardAchievementIfNotEarned(userId, "rating_contrarian");
        }
        if (diff >= 3.0) {
          await awardAchievementIfNotEarned(userId, "rating_generous");
        }
      }
    }
  } catch (error) {
    console.error("Rating achievement check failed:", error);
  }
}

/**
 * Check festival-result-based achievements after results are calculated.
 * Checks: Crowd Pleaser, Photo Finish, Back to Back
 */
export async function checkFestivalAchievements(
  festivalId: string,
  clubId: string,
  standings: Array<{ user_id: string; rank: number; points: number }>,
  nominations: Array<{ id: string; user_id: string | null }>
): Promise<void> {
  try {
    const supabase = await createClient();

    // CROWD PLEASER: nomination with highest average rating
    const { data: nomRatings } = await supabase
      .from("ratings")
      .select("nomination_id, rating")
      .eq("festival_id", festivalId)
      .not("rating", "is", null);

    if (nomRatings && nomRatings.length > 0) {
      const avgByNomination = new Map<string, { total: number; count: number }>();
      for (const r of nomRatings) {
        const entry = avgByNomination.get(r.nomination_id) || { total: 0, count: 0 };
        entry.total += Number(r.rating);
        entry.count++;
        avgByNomination.set(r.nomination_id, entry);
      }

      let bestNomId = "";
      let bestAvg = -1;
      for (const [nomId, { total, count }] of avgByNomination) {
        const avg = total / count;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestNomId = nomId;
        }
      }

      if (bestNomId) {
        const nomination = nominations.find((n) => n.id === bestNomId);
        if (nomination?.user_id) {
          await awardAchievementIfNotEarned(nomination.user_id, "nomination_crowd_pleaser");
        }
      }
    }

    // PHOTO FINISH: winner won by < 0.5 points
    if (standings.length >= 2) {
      const first = standings[0];
      const second = standings[1];
      const gap = first.points - second.points;
      if (gap > 0 && gap < 0.5) {
        await awardAchievementIfNotEarned(first.user_id, "festival_photo_finish");
      }
    }

    // BACK TO BACK: winner won the previous festival in same club
    if (standings.length > 0) {
      const winnerId = standings[0].user_id;

      const { data: previousFestivals } = await supabase
        .from("festivals")
        .select("id")
        .eq("club_id", clubId)
        .eq("status", "completed")
        .neq("id", festivalId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (previousFestivals && previousFestivals.length > 0) {
        const { data: prevWinner } = await supabase
          .from("festival_standings")
          .select("user_id")
          .eq("festival_id", previousFestivals[0].id)
          .eq("rank", 1)
          .maybeSingle();

        if (prevWinner?.user_id === winnerId) {
          await awardAchievementIfNotEarned(winnerId, "festival_back_to_back");
        }
      }
    }
  } catch (error) {
    console.error("Festival achievement check failed:", error);
  }
}
