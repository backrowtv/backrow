"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logClubActivity } from "@/lib/activity/logger";
import { handleActionError } from "@/lib/errors/handler";

/**
 * Check and auto-advance festival phases based on deadlines
 * This should be called periodically (e.g., via cron job or on page loads)
 */
export async function checkAndAdvanceFestivalPhases() {
  const supabase = await createClient();
  const now = new Date();

  // Get all festivals that aren't completed
  const { data: festivals, error: festivalsError } = await supabase
    .from("festivals")
    .select(
      "id, club_id, phase, status, theme, nomination_deadline, watch_deadline, rating_deadline, results_date, created_at, updated_at"
    )
    .neq("status", "completed")
    .neq("phase", "results");

  if (festivalsError) {
    handleActionError(festivalsError, { action: "checkAndAdvanceFestivalPhases", silent: true });
    return { advanced: 0 };
  }

  if (!festivals || festivals.length === 0) {
    return { advanced: 0 };
  }

  // Get clubs with their settings
  const clubIds = [...new Set(festivals.map((f) => f.club_id))];
  const { data: clubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id, settings")
    .in("id", clubIds);

  if (clubsError) {
    handleActionError(clubsError, { action: "checkAndAdvanceFestivalPhases", silent: true });
    return { advanced: 0 };
  }

  const clubSettingsMap = new Map(
    (clubs || []).map((club) => [club.id, (club.settings as Record<string, unknown>) || {}])
  );

  const phaseOrder = ["theme_selection", "nomination", "watch_rate", "results"];

  let advancedCount = 0;

  for (const festival of festivals) {
    const currentIndex = phaseOrder.indexOf(festival.phase);
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      continue;
    }

    const settings = clubSettingsMap.get(festival.club_id) || {};
    let shouldAdvance = false;
    let nextPhase = phaseOrder[currentIndex + 1];
    let nextStatus = festival.status;

    // Check timing settings for current phase
    if (festival.phase === "theme_selection") {
      // Theme selection requires theme to be selected before advancing
      if (!festival.theme) {
        // Auto-select top voted theme if Democracy mode + voting enabled
        const themeGovernance = settings.theme_governance as string | undefined;
        const themeVotingEnabled = (settings.theme_voting_enabled as boolean) ?? true;

        if (themeGovernance === "democracy" && themeVotingEnabled) {
          // Get available themes for this club
          const { data: themes } = await supabase
            .from("theme_pool")
            .select("id")
            .eq("club_id", festival.club_id)
            .eq("is_used", false);

          if (themes && themes.length > 0) {
            const themeIds = themes.map((t) => t.id);

            // Get votes for these themes
            const { data: votes } = await supabase
              .from("theme_pool_votes")
              .select("theme_id, vote_type")
              .in("theme_id", themeIds);

            if (votes && votes.length > 0) {
              // Calculate net scores per theme
              const themeScores: Record<string, number> = {};
              votes.forEach((vote) => {
                if (!themeScores[vote.theme_id]) {
                  themeScores[vote.theme_id] = 0;
                }
                if (vote.vote_type === "upvote") {
                  themeScores[vote.theme_id]++;
                } else {
                  themeScores[vote.theme_id]--;
                }
              });

              // Find theme with highest score
              const sortedThemes = Object.entries(themeScores).sort(([, a], [, b]) => b - a);

              if (sortedThemes.length > 0 && sortedThemes[0][1] > 0) {
                const topThemeId = sortedThemes[0][0];

                // Use selectFestivalTheme to properly set the theme
                const { selectFestivalTheme } = await import("../themes");
                const selectResult = await selectFestivalTheme(festival.id, topThemeId);

                if (selectResult?.error) {
                  handleActionError(selectResult.error, {
                    action: "checkAndAdvanceFestivalPhases",
                    silent: true,
                  });
                  // Continue without auto-selecting - user will need to select manually
                } else {
                  // Refresh festival data after theme selection
                  const { data: updatedFestival } = await supabase
                    .from("festivals")
                    .select("theme")
                    .eq("id", festival.id)
                    .single();

                  if (updatedFestival?.theme) {
                    festival.theme = updatedFestival.theme;
                  }
                }
              }
            }
          }
        }

        // If still no theme after auto-selection attempt, skip advancement
        if (!festival.theme) {
          continue;
        }
      }

      const nominationTiming = settings.nomination_timing as
        | { type?: string; scheduled_datetime?: string }
        | undefined;

      if (nominationTiming?.type === "scheduled" && nominationTiming.scheduled_datetime) {
        if (new Date(nominationTiming.scheduled_datetime) <= now) {
          shouldAdvance = true;
          nextPhase = "nomination";
          nextStatus = "nominating";
        }
      }
      // Fallback to legacy deadline check
      else if (festival.nomination_deadline && new Date(festival.nomination_deadline) <= now) {
        shouldAdvance = true;
        nextPhase = "nomination";
        nextStatus = "nominating";
      }
    } else if (festival.phase === "nomination") {
      const nominationTiming = settings.nomination_timing as
        | {
            type?: string;
            duration_days?: number;
            duration_weeks?: number;
            duration_months?: number;
            scheduled_datetime?: string;
          }
        | undefined;

      if (nominationTiming?.type === "scheduled" && nominationTiming.scheduled_datetime) {
        if (new Date(nominationTiming.scheduled_datetime) <= now) {
          shouldAdvance = true;
          nextPhase = "watch_rate";
          nextStatus = "watching";
        }
      } else if (nominationTiming?.type === "duration") {
        // Calculate duration in milliseconds
        let durationMs = 0;
        if (nominationTiming.duration_days) {
          durationMs = nominationTiming.duration_days * 24 * 60 * 60 * 1000;
        } else if (nominationTiming.duration_weeks) {
          durationMs = nominationTiming.duration_weeks * 7 * 24 * 60 * 60 * 1000;
        } else if (nominationTiming.duration_months) {
          durationMs = nominationTiming.duration_months * 30 * 24 * 60 * 60 * 1000;
        }

        // Use nomination_deadline as phase start time, or updated_at if deadline not set
        const phaseStart = festival.nomination_deadline
          ? new Date(festival.nomination_deadline)
          : new Date(festival.updated_at || festival.created_at);

        if (phaseStart.getTime() + durationMs <= now.getTime()) {
          shouldAdvance = true;
          nextPhase = "watch_rate";
          nextStatus = "watching";
        }
      }
      // Fallback to legacy deadline check
      else if (festival.watch_deadline && new Date(festival.watch_deadline) <= now) {
        shouldAdvance = true;
        nextPhase = "watch_rate";
        nextStatus = "watching";
      }
    } else if (festival.phase === "watch_rate") {
      const watchRateTiming = settings.watch_rate_timing as
        | {
            type?: string;
            duration_days?: number;
            duration_weeks?: number;
            duration_months?: number;
            scheduled_datetime?: string;
          }
        | undefined;

      if (watchRateTiming?.type === "scheduled" && watchRateTiming.scheduled_datetime) {
        if (new Date(watchRateTiming.scheduled_datetime) <= now) {
          shouldAdvance = true;
          nextPhase = "results";
          nextStatus = "completed";
        }
      } else if (watchRateTiming?.type === "duration") {
        // Calculate duration in milliseconds
        let durationMs = 0;
        if (watchRateTiming.duration_days) {
          durationMs = watchRateTiming.duration_days * 24 * 60 * 60 * 1000;
        } else if (watchRateTiming.duration_weeks) {
          durationMs = watchRateTiming.duration_weeks * 7 * 24 * 60 * 60 * 1000;
        } else if (watchRateTiming.duration_months) {
          durationMs = watchRateTiming.duration_months * 30 * 24 * 60 * 60 * 1000;
        }

        // Use watch_deadline as phase start time, or updated_at if deadline not set
        const phaseStart = festival.watch_deadline
          ? new Date(festival.watch_deadline)
          : new Date(festival.updated_at || festival.created_at);

        if (phaseStart.getTime() + durationMs <= now.getTime()) {
          shouldAdvance = true;
          nextPhase = "results";
          nextStatus = "completed";
        }
      }
      // Fallback to legacy deadline check
      else if (festival.rating_deadline && new Date(festival.rating_deadline) <= now) {
        shouldAdvance = true;
        nextPhase = "results";
        nextStatus = "completed";
      }
    }

    if (shouldAdvance) {
      // Get producer for logging
      const { data: producers, error: producersError } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", festival.club_id)
        .eq("role", "producer")
        .limit(1);

      if (producersError) {
        handleActionError(producersError, {
          action: "checkAndAdvanceFestivalPhases",
          silent: true,
        });
      }

      const producerId = producers?.[0]?.user_id;

      const { error } = await supabase
        .from("festivals")
        .update({
          phase: nextPhase,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", festival.id);

      if (!error && producerId) {
        // Log activity
        const { data: festivalData, error: festivalDataError } = await supabase
          .from("festivals")
          .select("theme")
          .eq("id", festival.id)
          .maybeSingle();

        if (festivalDataError) {
          handleActionError(festivalDataError, {
            action: "checkAndAdvanceFestivalPhases",
            silent: true,
          });
        }

        if (nextStatus === "completed") {
          // Results revealed
          await logClubActivity(festival.club_id, "festival_results_revealed", {
            festival_id: festival.id,
            festival_theme: festivalData?.theme || "Unknown",
          });
        } else {
          // Phase changed
          await logClubActivity(festival.club_id, "festival_phase_changed", {
            festival_id: festival.id,
            festival_theme: festivalData?.theme || "Unknown",
            from_phase: festival.phase,
            to_phase: nextPhase,
          });
        }

        // Get slugs for revalidation
        const { data: club } = await supabase
          .from("clubs")
          .select("slug")
          .eq("id", festival.club_id)
          .single();

        const { data: festivalSlugData } = await supabase
          .from("festivals")
          .select("slug")
          .eq("id", festival.id)
          .single();

        const clubSlug = club?.slug || festival.club_id;
        const festivalSlug = festivalSlugData?.slug || festival.id;

        revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);
        advancedCount++;

        // Check if festival just completed and auto-start is enabled
        if (nextStatus === "completed") {
          // Invalidate stats cache when festival completes
          revalidatePath(`/club/${clubSlug}/stats`);

          // Check badges for all members who participated
          const { checkRelevantBadges } = await import("../badges");
          const { data: participants } = await supabase
            .from("festival_standings")
            .select("user_id")
            .eq("festival_id", festival.id);

          if (participants) {
            for (const participant of participants) {
              await checkRelevantBadges(
                participant.user_id,
                "festival_completed",
                festival.club_id
              );
            }
          }

          await checkAndAutoStartNextFestival(festival.club_id);
        }
      }
    }
  }

  return { advanced: advancedCount };
}

/**
 * Auto-start next festival if auto_start_next_festival is enabled
 */
export async function checkAndAutoStartNextFestival(clubId: string) {
  const supabase = await createClient();

  // Get club settings
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("settings, festival_type")
    .eq("id", clubId)
    .single();

  if (clubError || !club) {
    handleActionError(clubError, { action: "checkAndAutoStartNextFestival", silent: true });
    return;
  }

  const settings = (club.settings as Record<string, unknown>) || {};
  const autoStartEnabled = settings.auto_start_next_festival as boolean | undefined;

  if (!autoStartEnabled) {
    return; // Auto-start not enabled
  }

  // Check if there's already a pending/active festival
  const { data: existingFestival } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", clubId)
    .in("status", ["pending", "nominating", "watching"])
    .limit(1);

  if (existingFestival && existingFestival.length > 0) {
    return; // Already have an active festival
  }

  // Get the most recent completed festival to use as template
  const { data: lastFestival, error: lastFestivalError } = await supabase
    .from("festivals")
    .select("season_id")
    .eq("club_id", clubId)
    .eq("status", "completed")
    .order("results_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastFestivalError) {
    handleActionError(lastFestivalError, { action: "checkAndAutoStartNextFestival", silent: true });
    return;
  }

  // Create new festival
  // Note: This is a simplified version - you may want to copy more settings from the previous festival
  const { data: _newFestival, error: createError } = await supabase
    .from("festivals")
    .insert({
      club_id: clubId,
      season_id: lastFestival?.season_id || null,
      phase: "theme_selection",
      status: "pending",
      festival_type: club.festival_type || "standard",
    })
    .select("id")
    .single();

  if (createError) {
    handleActionError(createError, { action: "checkAndAutoStartNextFestival", silent: true });
    return;
  }

  // Successfully auto-started new festival (silent success)
}
