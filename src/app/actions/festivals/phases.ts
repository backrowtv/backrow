"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateFestival, invalidateClubStats } from "@/lib/cache/invalidate";
import { logClubActivity } from "@/lib/activity/logger";
import { createNotificationsForUsers } from "../notifications";
import { checkAndAutoStartNextFestival } from "./auto";
import { handleActionError } from "@/lib/errors/handler";
import { getClubSlug, getFestivalSlug } from "../themes/helpers";
import {
  extractSingleRelation,
  extractClubSettings,
  extractMovieTitle,
  extractUserDisplayName,
  type ClubSettingsRelation,
  type MovieRelation,
  type UserDisplayRelation,
} from "@/types/supabase-helpers";

export async function advanceFestivalPhase(festivalId: string, force?: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival with club settings
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, status, theme, clubs(settings)")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can advance festival phases" };
  }

  // Determine next phase
  const phaseOrder = ["theme_selection", "nomination", "watch_rate", "results"];
  const currentIndex = phaseOrder.indexOf(festival.phase);

  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return { error: "Festival is already at the final phase" };
  }

  // Validate requirements for each phase transition (skip if force=true)
  if (!force) {
    if (festival.phase === "theme_selection") {
      // Require theme to be selected before advancing from theme_selection
      if (!festival.theme) {
        return {
          error:
            'A theme must be selected before advancing to nomination phase. Use "Force Advance" to skip this requirement.',
        };
      }
    }

    if (festival.phase === "nomination") {
      // Get nomination count
      const { count: nominationCount } = await supabase
        .from("nominations")
        .select("*", { count: "exact", head: true })
        .eq("festival_id", festivalId)
        .is("deleted_at", null);

      // Require at least 1 nomination
      if (!nominationCount || nominationCount < 1) {
        return {
          error:
            'At least 1 nomination is required before advancing to Watch & Rate phase. Use "Force Advance" to skip this requirement.',
        };
      }

      // Require at least 2 participants (unique nominators) for meaningful festivals
      const { data: uniqueNominators } = await supabase
        .from("nominations")
        .select("user_id")
        .eq("festival_id", festivalId)
        .is("deleted_at", null);

      const uniqueParticipants = new Set(uniqueNominators?.map((n) => n.user_id)).size;
      if (uniqueParticipants < 2) {
        return {
          error:
            'At least 2 participants must nominate movies before advancing. A single-person festival cannot produce meaningful results. Use "Force Advance" to skip this requirement.',
        };
      }

      // Check if guessing is enabled and warn about minimum nominations
      const clubSettings = extractClubSettings(
        festival.clubs as ClubSettingsRelation | ClubSettingsRelation[] | null
      );
      const guessingEnabled = clubSettings.nomination_guessing_enabled === true;

      if (guessingEnabled && nominationCount < 3) {
        return {
          error:
            "Guessing is enabled but only " +
            nominationCount +
            ' nominations exist (3 required for guessing to work). Use "Force Advance" to skip this requirement.',
        };
      }
    }

    if (festival.phase === "watch_rate") {
      // Get rating count
      const { count: ratingCount } = await supabase
        .from("ratings")
        .select("*", { count: "exact", head: true })
        .eq("festival_id", festivalId);

      // Require at least 1 rating
      if (!ratingCount || ratingCount < 1) {
        return {
          error:
            'At least 1 rating is required before advancing to Results phase. Use "Force Advance" to skip this requirement.',
        };
      }
    }
  }

  const nextPhase = phaseOrder[currentIndex + 1];
  let nextStatus = festival.status;

  // Update status based on phase
  if (nextPhase === "nomination") {
    nextStatus = "nominating";
  } else if (nextPhase === "watch_rate") {
    nextStatus = "watching";
  } else if (nextPhase === "results") {
    nextStatus = "completed";
  }

  // Get festival theme for logging
  const { data: festivalData, error: festivalDataError } = await supabase
    .from("festivals")
    .select("theme")
    .eq("id", festivalId)
    .maybeSingle();

  // Log error but continue - theme is optional for logging
  if (festivalDataError) {
    handleActionError(festivalDataError, { action: "advanceFestivalPhase", silent: true });
  }

  const { error } = await supabase
    .from("festivals")
    .update({
      phase: nextPhase,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", festivalId);

  if (error) {
    return { error: error.message };
  }

  // Log club activity
  if (nextStatus === "completed") {
    // Results revealed
    await logClubActivity(festival.club_id, "festival_results_revealed", {
      festival_id: festivalId,
      festival_theme: festivalData?.theme || "Unknown",
    });
  } else {
    // Phase changed
    await logClubActivity(festival.club_id, "festival_phase_changed", {
      festival_id: festivalId,
      festival_theme: festivalData?.theme || "Unknown",
      from_phase: festival.phase,
      to_phase: nextPhase,
    });
  }

  // Send notifications to all club members
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", festival.club_id);

  if (members && members.length > 0) {
    const memberIds = members.map((m) => m.user_id);
    const clubSlug = await getClubSlug(supabase, festival.club_id);
    const festivalSlug = await getFestivalSlug(supabase, festivalId);

    if (nextPhase === "nomination") {
      await createNotificationsForUsers({
        userIds: memberIds,
        type: "festival_phase_changed",
        title: "Nomination Phase Started",
        message: `Nominations are now open for "${festivalData?.theme || "Festival"}"!`,
        link: `/club/${clubSlug}/festival/${festivalSlug}`,
        clubId: festival.club_id,
        festivalId: festivalId,
      });
    } else if (nextStatus === "watching") {
      await createNotificationsForUsers({
        userIds: memberIds,
        type: "festival_started",
        title: "Festival Started!",
        message: `The festival "${festivalData?.theme || "Festival"}" has started. Time to watch and rate!`,
        link: `/club/${clubSlug}/festival/${festivalSlug}`,
        clubId: festival.club_id,
        festivalId: festivalId,
      });
    } else if (nextStatus === "completed") {
      await createNotificationsForUsers({
        userIds: memberIds,
        type: "results_revealed",
        title: "Results Are In!",
        message: `The results for "${festivalData?.theme || "Festival"}" are now available!`,
        link: `/club/${clubSlug}/festival/${festivalSlug}`,
        clubId: festival.club_id,
        festivalId: festivalId,
      });
    }
  }

  // Note: Festival discussion thread is created when the festival starts (in createFestival),
  // not when phases advance. This ensures the discussion exists from the beginning.

  // If advancing to watch_rate phase, create movie discussion threads for all nominations
  // Movie threads are created now (when movies become visible) rather than at nomination time
  if (nextPhase === "watch_rate") {
    try {
      const { autoCreateMovieThread, updateFestivalThreadWithMovieLinks } =
        await import("../discussions");

      // Get all nominations for this festival
      const { data: nominations } = await supabase
        .from("nominations")
        .select(
          `
          id,
          tmdb_id,
          user_id,
          movies:tmdb_id (
            title,
            year
          ),
          users:user_id (
            display_name
          )
        `
        )
        .eq("festival_id", festivalId)
        .is("deleted_at", null);

      if (nominations && nominations.length > 0) {
        // Get existing movie threads for this club to avoid duplicates
        const tmdbIds = nominations.map((n) => n.tmdb_id).filter((id): id is number => id !== null);
        const { data: existingThreads } = await supabase
          .from("discussion_threads")
          .select("tmdb_id")
          .eq("club_id", festival.club_id)
          .eq("auto_created", true)
          .in("tmdb_id", tmdbIds);

        const existingTmdbIds = new Set(
          existingThreads?.map((t) => t.tmdb_id).filter((id): id is number => id !== null) || []
        );

        // Collect movie info for linking in festival thread
        const movieThreads: Array<{ title: string; tmdbId: number }> = [];

        // Create threads for nominations that don't have them yet
        for (const nomination of nominations) {
          if (!nomination.tmdb_id) {
            continue; // Skip if no tmdb_id
          }

          const movie = extractSingleRelation(
            nomination.movies as MovieRelation | MovieRelation[] | null
          );
          const nominator = extractSingleRelation(
            nomination.users as UserDisplayRelation | UserDisplayRelation[] | null
          );

          const movieTitle = extractMovieTitle(movie);
          const movieYear = movie?.year ?? null;
          movieThreads.push({ title: movieTitle, tmdbId: nomination.tmdb_id });

          // Skip creating thread if one already exists for this movie
          if (existingTmdbIds.has(nomination.tmdb_id)) {
            continue;
          }

          const nominatorName = extractUserDisplayName(nominator, "Member");
          const nominatorId = nomination.user_id;

          await autoCreateMovieThread(
            festival.club_id,
            festivalId,
            nomination.tmdb_id,
            movieTitle,
            nominatorId,
            nominatorName,
            movieYear
          );
        }

        // Update festival thread with links to movie threads
        if (movieThreads.length > 0) {
          await updateFestivalThreadWithMovieLinks(festival.club_id, festivalId, movieThreads);
        }
      }
    } catch (err) {
      // Log error but don't fail the phase advance - discussions are optional
      // Changed from silent: true to make errors visible for debugging
      handleActionError(err, { action: "advanceFestivalPhase", silent: false });
    }
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });

  // Check if festival just completed and auto-start is enabled
  if (nextStatus === "completed") {
    invalidateClubStats(festival.club_id);

    // Check badges for all members who participated
    const { checkRelevantBadges } = await import("../badges");
    const { data: participants } = await supabase
      .from("festival_standings")
      .select("user_id")
      .eq("festival_id", festivalId);

    if (participants) {
      for (const participant of participants) {
        await checkRelevantBadges(participant.user_id, "festival_completed", festival.club_id);
      }
    }

    await checkAndAutoStartNextFestival(festival.club_id);
  }

  return { success: true };
}

/**
 * Revert festival phase with optional data clearing
 * @param festivalId - The festival ID
 * @param options - Optional settings for what data to clear
 *   - clearRatings: Clear all ratings when reverting from watch_rate to nomination
 *   - clearNominations: Clear all nominations when reverting from nomination to theme_selection
 */
export async function revertFestivalPhase(
  festivalId: string,
  options?: { force?: boolean; clearRatings?: boolean; clearNominations?: boolean }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, status, theme")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can revert festival phases" };
  }

  // Determine previous phase
  const phaseOrder = ["theme_selection", "nomination", "watch_rate", "results"];
  const currentIndex = phaseOrder.indexOf(festival.phase);

  if (currentIndex === -1 || currentIndex === 0) {
    return { error: "Festival is already at the first phase" };
  }

  const previousPhase = phaseOrder[currentIndex - 1];
  let previousStatus = festival.status;

  // Update status based on phase
  if (previousPhase === "theme_selection") {
    previousStatus = "pending";
  } else if (previousPhase === "nomination") {
    previousStatus = "nominating";
  } else if (previousPhase === "watch_rate") {
    previousStatus = "watching";
  } else if (previousPhase === "results") {
    previousStatus = "completed";
  }

  // If rolling back from results, delete cached results (required)
  if (festival.phase === "results") {
    const { error: deleteResultsError } = await supabase
      .from("festival_results")
      .delete()
      .eq("festival_id", festivalId);

    if (deleteResultsError) {
      handleActionError(deleteResultsError, { action: "revertFestivalPhase", silent: true });
      // Continue anyway - the results will need to be recalculated
    }

    // Also delete normalized standings
    const { error: deleteStandingsError } = await supabase
      .from("festival_standings")
      .delete()
      .eq("festival_id", festivalId);

    if (deleteStandingsError) {
      handleActionError(deleteStandingsError, { action: "revertFestivalPhase", silent: true });
    }
  }

  // Optional: Clear ratings when reverting from watch_rate to nomination
  if (festival.phase === "watch_rate" && previousPhase === "nomination" && options?.clearRatings) {
    const { error: clearRatingsError } = await supabase
      .from("ratings")
      .delete()
      .eq("festival_id", festivalId);

    if (clearRatingsError) {
      handleActionError(clearRatingsError, { action: "revertFestivalPhase", silent: true });
    }
  }

  // Optional: Clear nominations when reverting from nomination to theme_selection
  if (
    festival.phase === "nomination" &&
    previousPhase === "theme_selection" &&
    options?.clearNominations
  ) {
    // Soft delete nominations
    const { error: clearNominationsError } = await supabase
      .from("nominations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("festival_id", festivalId);

    if (clearNominationsError) {
      handleActionError(clearNominationsError, { action: "revertFestivalPhase", silent: true });
    }
  }

  const { error } = await supabase
    .from("festivals")
    .update({
      phase: previousPhase,
      status: previousStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", festivalId);

  if (error) {
    return { error: error.message };
  }

  // Log club activity (phase change)
  await logClubActivity(festival.club_id, "festival_phase_changed", {
    festival_id: festivalId,
    from_phase: festival.phase,
    to_phase: previousPhase,
    action: "reverted",
  });

  await invalidateFestival(festivalId, { clubId: festival.club_id });
  return { success: true, previousPhase };
}

/**
 * Force advance festival phase with admin override
 * Bypasses requirements but shows warning about implications
 */
export async function forceAdvanceFestivalPhase(
  festivalId: string,
  acknowledgedWarnings: string[]
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, status, theme")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can force advance festival phases" };
  }

  // Require acknowledgment of warnings
  if (!acknowledgedWarnings || acknowledgedWarnings.length === 0) {
    return { error: "You must acknowledge the warnings before force advancing" };
  }

  // Determine next phase
  const phaseOrder = ["theme_selection", "nomination", "watch_rate", "results"];
  const currentIndex = phaseOrder.indexOf(festival.phase);

  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return { error: "Festival is already at the final phase" };
  }

  const nextPhase = phaseOrder[currentIndex + 1];
  let nextStatus = festival.status;

  // Update status based on phase
  if (nextPhase === "nomination") {
    nextStatus = "nominating";
  } else if (nextPhase === "watch_rate") {
    nextStatus = "watching";
  } else if (nextPhase === "results") {
    nextStatus = "completed";
  }

  // If advancing to nomination without a theme, set theme to "Open"
  let themeUpdate = {};
  if (festival.phase === "theme_selection" && !festival.theme) {
    themeUpdate = { theme: "Open" };
  }

  const { error } = await supabase
    .from("festivals")
    .update({
      phase: nextPhase,
      status: nextStatus,
      ...themeUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", festivalId);

  if (error) {
    return { error: error.message };
  }

  // Log club activity (phase change)
  await logClubActivity(festival.club_id, "festival_phase_changed", {
    festival_id: festivalId,
    from_phase: festival.phase,
    to_phase: nextPhase,
    action: "force_advanced",
  });

  await invalidateFestival(festivalId, { clubId: festival.club_id });

  return { success: true, nextPhase };
}

/**
 * Get phase advancement requirements and blockers
 */
export async function getPhaseRequirements(festivalId: string) {
  const supabase = await createClient();

  // Get festival with club settings
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, club_id, phase, theme, clubs(settings)")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  const clubSettings = extractClubSettings(
    festival.clubs as ClubSettingsRelation | ClubSettingsRelation[] | null
  );
  const guessingEnabled = clubSettings.nomination_guessing_enabled === true;

  // Get counts
  const [nominationsResult, ratingsResult] = await Promise.all([
    supabase
      .from("nominations")
      .select("*", { count: "exact", head: true })
      .eq("festival_id", festivalId)
      .is("deleted_at", null),
    supabase
      .from("ratings")
      .select("*", { count: "exact", head: true })
      .eq("festival_id", festivalId),
  ]);

  const nominationCount = nominationsResult.count || 0;
  const ratingCount = ratingsResult.count || 0;

  // Build requirements based on current phase
  const requirements: {
    id: string;
    label: string;
    met: boolean;
    required: boolean;
    value?: number;
    target?: number;
  }[] = [];

  if (festival.phase === "theme_selection") {
    requirements.push({
      id: "theme_selected",
      label: "Theme must be selected",
      met: !!festival.theme,
      required: true,
    });
  }

  if (festival.phase === "nomination") {
    requirements.push({
      id: "min_nominations",
      label: "At least 1 nomination",
      met: nominationCount >= 1,
      required: true,
      value: nominationCount,
      target: 1,
    });

    if (guessingEnabled) {
      requirements.push({
        id: "min_nominations_guessing",
        label: "At least 3 nominations (for guessing)",
        met: nominationCount >= 3,
        required: false, // Soft requirement
        value: nominationCount,
        target: 3,
      });
    }
  }

  if (festival.phase === "watch_rate") {
    requirements.push({
      id: "min_ratings",
      label: "At least 1 rating",
      met: ratingCount >= 1,
      required: true,
      value: ratingCount,
      target: 1,
    });
  }

  const canAdvance = requirements.filter((r) => r.required).every((r) => r.met);
  const hasWarnings = requirements.filter((r) => !r.required && !r.met).length > 0;

  return {
    data: {
      phase: festival.phase,
      requirements,
      canAdvance,
      hasWarnings,
      nominationCount,
      ratingCount,
      guessingEnabled,
    },
  };
}
