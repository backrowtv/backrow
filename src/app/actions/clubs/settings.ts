"use server";

/**
 * Club Settings Actions
 *
 * Server actions for updating club settings and member personalization.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getClubSlug,
  checkAdminPermission,
  validateImageUpload,
  extractStorageFilename,
} from "./_helpers";
import { handleActionError } from "@/lib/errors/handler";
import { validateSettingsUpdate } from "@/lib/validation/club-settings";
import { completeEndlessFestival } from "@/app/actions/endless-festival/helpers";

/**
 * Check if festival type is locked for a club
 *
 * Festival type is locked when a festival is actively running in the current season.
 */
export async function isFestivalTypeLocked(clubId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get current season (started but not ended) — endless clubs won't have seasons
  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("club_id", clubId)
    .lte("start_date", new Date().toISOString())
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!currentSeason) {
    return false;
  }

  // Check for any started festivals in this season (not draft, completed, or cancelled)
  const { count } = await supabase
    .from("festivals")
    .select("id", { count: "exact", head: true })
    .eq("season_id", currentSeason.id)
    .not("status", "in", '("draft","completed","cancelled")');

  return (count ?? 0) > 0;
}

export async function updateClubSettings(
  clubId: string,
  settings: Record<string, unknown>,
  options?: { confirmEndlessSwitch?: boolean }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, clubId, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to update settings" };
  }

  // Get current settings and club mode
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("settings")
    .eq("id", clubId)
    .single();

  if (clubError || !club) {
    return { error: "Club not found" };
  }

  // Merge settings
  const currentSettings = (club.settings as Record<string, unknown>) || {};
  const mergedSettings = { ...currentSettings, ...settings };

  // Validate with Zod schema
  const validation = validateSettingsUpdate(mergedSettings);
  if (!validation.valid) {
    return { error: validation.errors.join(", ") };
  }

  // Business logic validation
  const festivalType = mergedSettings.festival_type as string | undefined;
  const isEndless = festivalType === "endless";

  // Validate endless festival incompatibilities
  // Only block if the user is actively enabling an incompatible setting in this update.
  // If it's a stale value already in the DB, auto-clean it instead of blocking.
  if (isEndless) {
    const isEnabling = (key: string) => key in settings && settings[key] === true;

    if (isEnabling("scoring_enabled")) {
      return {
        error:
          "Endless festivals are not compatible with competitive ratings/scoring. Please disable scoring first.",
      };
    }

    if (isEnabling("nomination_guessing_enabled")) {
      return {
        error:
          "Endless festivals are not compatible with guessing features. Please disable guessing first.",
      };
    }

    // Auto-clean stale incompatible flags
    mergedSettings.scoring_enabled = false;
    mergedSettings.nomination_guessing_enabled = false;
  }

  // Check if festival_type is being changed - must lock to season lifecycle
  const currentFestivalType = (currentSettings.festival_type as string | undefined) || "standard";
  const newFestivalType = (mergedSettings.festival_type as string | undefined) || "standard";

  if (newFestivalType !== currentFestivalType) {
    // Get current season (started but not ended)
    const { data: currentSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("club_id", clubId)
      .lte("start_date", new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentSeason) {
      // Check for any started festivals in this season (not draft, completed, or cancelled)
      const { count } = await supabase
        .from("festivals")
        .select("id", { count: "exact", head: true })
        .eq("season_id", currentSeason.id)
        .not("status", "in", '("draft","completed","cancelled")');

      if (count && count > 0) {
        return {
          error:
            "Cannot change festival type while a festival is running. Complete or cancel the current festival first.",
        };
      }
    }

    // Switching from endless to standard: conclude active endless festivals + clear pool
    if (currentFestivalType === "endless" && newFestivalType === "standard") {
      // Find any active endless festivals
      const { data: endlessFestivals } = await supabase
        .from("festivals")
        .select("id")
        .eq("club_id", clubId)
        .is("season_id", null)
        .in("status", ["watching", "nominating"]);

      if (endlessFestivals && endlessFestivals.length > 0) {
        // Check for playing movies that need to be concluded
        const { count: playingCount } = await supabase
          .from("nominations")
          .select("id", { count: "exact", head: true })
          .in(
            "festival_id",
            endlessFestivals.map((f) => f.id)
          )
          .eq("endless_status", "playing")
          .is("deleted_at", null);

        // Require confirmation before concluding
        if (!options?.confirmEndlessSwitch) {
          if (playingCount && playingCount > 0) {
            return {
              error: "CONFIRM_ENDLESS_SWITCH",
              playingMovieCount: playingCount,
            };
          }
          // No playing movies — still confirm the switch
          return { error: "CONFIRM_ENDLESS_SWITCH", playingMovieCount: 0 };
        }

        // User confirmed — complete each endless festival (marks playing movies as completed)
        for (const festival of endlessFestivals) {
          const result = await completeEndlessFestival(festival.id);
          if (result.error) {
            return { error: `Failed to conclude endless festival: ${result.error}` };
          }
        }
      }

      // Clear the movie pool
      await supabase.from("club_movie_pool").delete().eq("club_id", clubId);
    }

    // Switching from standard to endless: auto-create endless festival
    if (currentFestivalType === "standard" && newFestivalType === "endless") {
      // Check no active endless festival already exists
      const { data: existingEndless } = await supabase
        .from("festivals")
        .select("id")
        .eq("club_id", clubId)
        .is("season_id", null)
        .in("status", ["watching", "nominating"])
        .limit(1)
        .maybeSingle();

      if (!existingEndless) {
        const nowIso = new Date().toISOString();
        await supabase.from("festivals").insert({
          club_id: clubId,
          season_id: null,
          theme: "Endless Festival",
          status: "watching",
          phase: "watch_rate",
          member_count_at_creation: 1,
          start_date: nowIso,
          auto_advance: false,
          slug: `endless-${clubId.slice(0, 8)}`,
        });
      }
    }
  }

  // Validate rubric weights sum to 100 if rubrics are being set
  const rubrics = mergedSettings.rating_rubrics as Array<{ weight?: number }> | undefined;
  if (rubrics && rubrics.length > 0) {
    const totalWeight = rubrics.reduce((sum, r) => sum + (r.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return {
        error: `Rubric category weights must sum to 100% (currently ${totalWeight}%)`,
      };
    }
  }

  // Sync dedicated columns that mirror settings JSON keys
  const dedicatedColumnKeys = [
    "festival_type",
    "themes_enabled",
    "blind_nominations_enabled",
    "allow_non_admin_nominations",
    "max_nominations_per_user",
    "max_themes_per_user",
    "theme_governance",
    "theme_voting_enabled",
    "club_ratings_enabled",
    "rating_min",
    "rating_max",
    "rating_increment",
    "scoring_enabled",
    "nomination_guessing_enabled",
    "season_standings_enabled",
    "auto_start_next_festival",
    "results_reveal_type",
    "results_reveal_direction",
    "rubric_enforcement",
  ] as const;

  const columnUpdates: Record<string, unknown> = {};
  for (const key of dedicatedColumnKeys) {
    if (key in settings) {
      columnUpdates[key] = settings[key];
    }
  }

  const { error } = await supabase
    .from("clubs")
    .update({ settings: mergedSettings, updated_at: new Date().toISOString(), ...columnUpdates })
    .eq("id", clubId);

  if (error) {
    return { error: error.message };
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/settings`);
  return { success: true };
}

export async function updateClubMemberPersonalization(
  clubId: string,
  personalization: {
    clubDisplayName?: string | null;
    clubAvatar?: File | null;
    clubBio?: string | null;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check membership
  const { data: membership } = await supabase
    .from("club_members")
    .select("role, club_avatar_url")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You are not a member of this club" };
  }

  // Handle club avatar upload if provided
  let clubAvatarUrl: string | null = null;
  if (personalization.clubAvatar && personalization.clubAvatar.size > 0) {
    // Validate file
    const validation = await validateImageUpload(personalization.clubAvatar, 15);
    if (!validation.valid) {
      return { error: validation.error };
    }

    try {
      // Delete old club avatar if it exists
      if (membership.club_avatar_url) {
        const oldFilename = extractStorageFilename(membership.club_avatar_url, "avatars");
        if (oldFilename?.startsWith("club-")) {
          try {
            await supabase.storage.from("avatars").remove([oldFilename]);
          } catch {
            // Ignore errors - file might not exist
          }
        }
      }

      // Generate unique filename
      const fileExt = personalization.clubAvatar.name.split(".").pop();
      const fileName = `club-${user.id}-${clubId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, personalization.clubAvatar, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        return handleActionError(uploadError, {
          action: "updateClubMemberPersonalization",
          metadata: { step: "avatarUpload" },
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

      clubAvatarUrl = urlData.publicUrl;
    } catch (error) {
      return handleActionError(error, {
        action: "updateClubMemberPersonalization",
        metadata: { step: "avatarUpload" },
      });
    }
  }

  // Validate bio
  if (personalization.clubBio && personalization.clubBio.length > 500) {
    return { error: "Club bio must be less than 500 characters" };
  }

  // Update club_members table
  const updateData: {
    club_display_name?: string | null;
    club_avatar_url?: string | null;
    club_bio?: string | null;
  } = {};

  if (personalization.clubDisplayName !== undefined) {
    updateData.club_display_name = personalization.clubDisplayName || null;
  }

  if (clubAvatarUrl !== null) {
    updateData.club_avatar_url = clubAvatarUrl;
  } else if (personalization.clubAvatar === null) {
    updateData.club_avatar_url = null;
  }

  if (personalization.clubBio !== undefined) {
    updateData.club_bio = personalization.clubBio || null;
  }

  const { error } = await supabase
    .from("club_members")
    .update(updateData)
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message || "Failed to update personalization settings" };
  }

  revalidatePath(`/club/[slug]/settings/personalization`);
  revalidatePath(`/club/[slug]`);
  return { success: true };
}
