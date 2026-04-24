"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { invalidateFestival } from "@/lib/cache/invalidate";
import { getSharp } from "@/lib/image/sharp-loader";
import { logClubActivity } from "@/lib/activity/logger";
import { validateKeywords } from "@/types/club-creation";
import { createNotificationsForUsers } from "../notifications";
import { handleActionError } from "@/lib/errors/handler";

export async function createFestival(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const clubId = formData.get("clubId") as string;
  const seasonId = formData.get("seasonId") as string;
  const _themeId = formData.get("themeId") as string | null; // Optional - theme will be selected during theme_selection phase
  // Support both datetime-local and date formats
  const startDateTime =
    (formData.get("startDateTime") as string) || (formData.get("startDate") as string);
  const nominationDeadline = formData.get("nominationDeadline") as string;
  const ratingDeadline = formData.get("ratingDeadline") as string;
  // Watch deadline is the same as rating deadline (you can't rate movies you haven't watched)
  const _watchDeadline = ratingDeadline;
  const autoAdvance = formData.get("autoAdvance") === "true";

  // Results date is automatically set to rating deadline (results reveal when rating deadline passes)
  const _resultsDate = ratingDeadline;
  const backgroundType = formData.get("background_type") as string | null;
  const backgroundValue = formData.get("background_value") as string | null;
  const backgroundImageFile = formData.get("festival_background_image") as File | null;
  const keywordsJson = formData.get("keywords") as string | null;
  const pictureFile = formData.get("picture") as File | null;

  // Required fields: club, season, and all date/time fields
  // Optional fields: background, picture, keywords (all have defaults)
  if (!clubId) {
    return { error: "Club is required" };
  }
  if (!seasonId) {
    return { error: "Season is required" };
  }
  if (!startDateTime) {
    return { error: "Start date and time is required" };
  }
  if (!nominationDeadline) {
    return { error: "Nomination deadline is required" };
  }
  if (!ratingDeadline) {
    return { error: "Rating deadline is required" };
  }

  // Parallelize: Check membership, active festival, and season at once
  const [membershipResult, activeFestivalResult, seasonResult] = await Promise.all([
    supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("festivals")
      .select("id, name")
      .eq("club_id", clubId)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle(),
    supabase.from("seasons").select("start_date, end_date").eq("id", seasonId).single(),
  ]);

  const { data: membership, error: membershipError } = membershipResult;
  const { data: activeFestival } = activeFestivalResult;
  const { data: season, error: seasonError } = seasonResult;

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can create festivals" };
  }

  if (activeFestival) {
    return {
      error: `Cannot create a new festival while "${activeFestival.name || "an active festival"}" is still in progress. Please complete or cancel the current festival first.`,
    };
  }

  if (seasonError || !season) {
    return { error: "Season not found" };
  }

  // Validate dates (handle both datetime-local and date formats)
  // datetime-local format: YYYY-MM-DDTHH:mm
  // date format: YYYY-MM-DD
  const start = new Date(startDateTime.includes("T") ? startDateTime : `${startDateTime}T00:00`);
  const nomDeadline = new Date(
    nominationDeadline.includes("T") ? nominationDeadline : `${nominationDeadline}T23:59`
  );
  const rateDeadline = new Date(
    ratingDeadline.includes("T") ? ratingDeadline : `${ratingDeadline}T23:59`
  );
  // Watch deadline is the same as rating deadline (you can't rate movies you haven't watched)
  const watchDead = rateDeadline;
  // Results date is automatically set to rating deadline (results reveal when rating deadline passes)
  const _results = rateDeadline;
  const seasonStart = new Date(season.start_date);
  const seasonEnd = new Date(season.end_date);

  // Validate all dates are valid
  if (isNaN(start.getTime()) || isNaN(nomDeadline.getTime()) || isNaN(rateDeadline.getTime())) {
    return {
      error: "Invalid date format provided",
    };
  }

  // Check dates are in order (using <= to allow same-day transitions)
  if (start > nomDeadline || nomDeadline > rateDeadline) {
    return {
      error: "Dates must be in order: start ≤ nomination ≤ rating",
    };
  }

  // Check dates fall within season (start must be >= season start, rating deadline must be <= season end)
  if (start < seasonStart) {
    const seasonStartDate = new Date(season.start_date);
    const formattedDate = seasonStartDate.toISOString().split("T")[0]; // YYYY-MM-DD format
    return {
      error: `Festival start date must be on or after season start date (${formattedDate})`,
    };
  }

  if (rateDeadline > seasonEnd) {
    const seasonEndDate = new Date(season.end_date);
    const formattedDate = seasonEndDate.toISOString().split("T")[0]; // YYYY-MM-DD format
    return {
      error: `Festival rating deadline must be on or before season end date (${formattedDate})`,
    };
  }

  // Additional validation: ensure start date is not in the past (optional, but helpful)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    // Allow past dates for now, but could add a warning if needed
  }

  // Validate keywords
  let keywords: string[] = [];
  if (keywordsJson) {
    try {
      const parsedKeywords = JSON.parse(keywordsJson) as string[];
      const validation = validateKeywords(parsedKeywords);
      if (!validation.isValid) {
        return { error: validation.errors.join(", ") };
      }
      keywords = validation.validKeywords;
    } catch {
      return { error: "Invalid keywords format" };
    }
  }

  // Get member count at creation
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId);

  // Handle image uploads (background and picture)
  let backgroundUrl: string | null = null;
  let pictureUrl: string | null = null;

  // Upload background image if custom
  if (backgroundType === "custom_image" && backgroundImageFile && backgroundImageFile.size > 0) {
    try {
      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (backgroundImageFile.size > maxSize) {
        return { error: "Background image file size must be less than 5MB" };
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(backgroundImageFile.type)) {
        return { error: "Background must be an image file (JPEG, PNG, GIF, or WebP)" };
      }

      // Re-encode to mozjpeg q85, cap at 1920 wide, strip metadata (privacy).
      const sharp = await getSharp();
      const bgBuffer = await sharp(Buffer.from(await backgroundImageFile.arrayBuffer()))
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      const fileName = `${user.id}-festival-bg-${Date.now()}.jpg`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("festival-backgrounds")
        .upload(filePath, bgBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        return handleActionError(uploadError, { action: "createFestival" });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("festival-backgrounds")
        .getPublicUrl(filePath);

      backgroundUrl = urlData.publicUrl;
    } catch (error) {
      return handleActionError(error, { action: "createFestival" });
    }
  }

  // Upload festival picture if provided
  if (pictureFile && pictureFile.size > 0) {
    try {
      // Validate file size (15MB)
      const maxSize = 15 * 1024 * 1024;
      if (pictureFile.size > maxSize) {
        return { error: "Picture file size must be less than 15MB" };
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(pictureFile.type)) {
        return { error: "Picture must be an image file (JPEG, PNG, GIF, or WebP)" };
      }

      // Re-encode to mozjpeg q85, cap at 2048×2048 (fit:inside preserves aspect),
      // strip metadata (privacy).
      const sharp = await getSharp();
      const picBuffer = await sharp(Buffer.from(await pictureFile.arrayBuffer()))
        .rotate()
        .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      const fileName = `${user.id}-festival-pic-${Date.now()}.jpg`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("festival-pictures")
        .upload(filePath, picBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        return handleActionError(uploadError, { action: "createFestival" });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("festival-pictures").getPublicUrl(filePath);

      pictureUrl = urlData.publicUrl;
    } catch (error) {
      return handleActionError(error, { action: "createFestival" });
    }
  }

  // Get club settings to determine theme governance
  const { data: clubSettingsData } = await supabase
    .from("clubs")
    .select("settings")
    .eq("id", clubId)
    .single();

  const clubSettings = (clubSettingsData?.settings as Record<string, unknown>) || {};
  // Per-festival theme governance override from wizard, falling back to club setting
  const themeGovernanceOverride = formData.get("theme_governance") as string | null;
  const themeGovernance =
    themeGovernanceOverride || (clubSettings.theme_governance as string) || "autocracy";
  const themesEnabled = clubSettings.themes_enabled !== false; // Default true

  // Determine initial phase and theme based on governance mode
  let initialPhase = "theme_selection";
  let initialStatus = "idle";
  let selectedTheme: string | null = null;

  if (!themesEnabled) {
    // Themes disabled - skip theme selection, use "Open" as theme
    initialPhase = "nomination";
    initialStatus = "nominating";
    selectedTheme = "Open";
  } else if (themeGovernance === "democracy" || themeGovernance === "random") {
    // Get available themes from pool
    const { data: themes } = await supabase
      .from("theme_pool")
      .select("id, theme_name, created_at")
      .eq("club_id", clubId)
      .eq("is_used", false)
      .order("created_at", { ascending: true });

    // Require minimum 2 themes when themes are enabled
    if (!themes || themes.length < 2) {
      return {
        error:
          "At least 2 themes are required in the theme pool to start a festival. Add more themes first.",
      };
    }

    if (themeGovernance === "democracy") {
      // Auto-select top voted theme
      const themeIds = themes.map((t) => t.id);
      const { data: votes } = await supabase
        .from("theme_pool_votes")
        .select("theme_id, vote_type")
        .in("theme_id", themeIds);

      // Calculate net scores
      const themeScores: Record<string, { score: number; created_at: string }> = {};
      themes.forEach((t) => {
        themeScores[t.id] = { score: 0, created_at: t.created_at };
      });

      if (votes) {
        votes.forEach((vote) => {
          if (vote.vote_type === "upvote") {
            themeScores[vote.theme_id].score++;
          }
        });
      }

      // Sort by score (desc), then by created_at (asc) for tie-breaker (oldest wins)
      const sortedThemes = Object.entries(themeScores).sort(([, a], [, b]) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const topThemeId = sortedThemes[0]?.[0];
      const topTheme = themes.find((t) => t.id === topThemeId);

      if (topTheme) {
        selectedTheme = topTheme.theme_name;
        // Mark theme as used
        await supabase.from("theme_pool").update({ is_used: true }).eq("id", topTheme.id);
      }
    } else if (themeGovernance === "random") {
      // Pure random selection (equal chance)
      const randomIndex = Math.floor(Math.random() * themes.length);
      const randomTheme = themes[randomIndex];

      if (randomTheme) {
        selectedTheme = randomTheme.theme_name;
        // Mark theme as used
        await supabase.from("theme_pool").update({ is_used: true }).eq("id", randomTheme.id);
      }
    }

    if (selectedTheme) {
      initialPhase = "nomination";
      initialStatus = "nominating";
    }
  } else if (themeGovernance === "autocracy") {
    // Autocracy mode - admin can provide a custom theme upfront or select one later
    const customTheme = (formData.get("custom_theme") as string)?.trim();
    if (customTheme) {
      selectedTheme = customTheme;
      initialPhase = "nomination";
      initialStatus = "nominating";
    }
    // Otherwise festival starts in theme_selection phase for admin to pick/enter a theme
  }

  // Create festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .insert({
      club_id: clubId,
      season_id: seasonId,
      theme: selectedTheme,
      status: initialStatus,
      phase: initialPhase,
      start_date: start.toISOString(),
      nomination_deadline: nomDeadline.toISOString(),
      watch_deadline: watchDead.toISOString(),
      rating_deadline: rateDeadline.toISOString(),
      results_date: rateDeadline.toISOString(), // Results reveal automatically when rating deadline passes
      member_count_at_creation: memberCount || 0,
      auto_advance: autoAdvance,
      background_type: backgroundType || null,
      background_value:
        backgroundType === "custom_image" && backgroundUrl
          ? backgroundUrl
          : backgroundValue || null,
      keywords: keywords.length > 0 ? keywords : null,
      picture_url: pictureUrl,
    })
    .select()
    .single();

  if (festivalError) {
    // Clean up uploaded images if festival creation fails
    if (backgroundUrl) {
      try {
        const urlParts = backgroundUrl.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "festival-backgrounds");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          await supabase.storage.from("festival-backgrounds").remove([urlParts[filenameIndex + 1]]);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    if (pictureUrl) {
      try {
        const urlParts = pictureUrl.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "festival-pictures");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          await supabase.storage.from("festival-pictures").remove([urlParts[filenameIndex + 1]]);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    return { error: festivalError.message };
  }

  // Log club activity
  await logClubActivity(clubId, "festival_started", {
    festival_id: festival.id,
    festival_slug: festival.slug || festival.id,
    festival_theme: selectedTheme || null,
    theme_governance: themeGovernance,
  });

  // Notify all club members about the new festival
  const { data: membersForNotification } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the creator

  if (membersForNotification && membersForNotification.length > 0) {
    const memberIds = membersForNotification.map((m) => m.user_id);
    await createNotificationsForUsers({
      userIds: memberIds,
      type: "new_festival",
      title: "New Festival Created",
      message: selectedTheme
        ? `A new festival "${selectedTheme}" has been created!`
        : "A new festival has been created!",
      link: `/club/${clubId}/festival/${festival.id}`,
      clubId: clubId,
      festivalId: festival.id,
    });
  }

  // Create discussion thread for the festival when it starts
  // Only create if theme is already decided (not starting in theme_selection phase)
  // If starting in theme_selection, discussion is deferred to when the theme is actually selected
  if (selectedTheme && initialPhase !== "theme_selection") {
    try {
      const { createFestivalDiscussionOnStart } = await import("../discussions");
      await createFestivalDiscussionOnStart(clubId, festival.id, selectedTheme, user.id);
    } catch (err) {
      // Log but don't fail festival creation
      handleActionError(err, { action: "createFestival", silent: true });
    }
  }

  // Generate a slug for the festival
  // If theme is already selected, use theme name; otherwise use ID-based slug
  let festivalSlug: string;
  if (selectedTheme && selectedTheme !== "Open") {
    festivalSlug = selectedTheme
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  } else {
    const shortId = festival.id.substring(0, 8);
    festivalSlug = `festival-${shortId}`;
  }

  // Ensure slug is unique within club
  let slugSuffix = 1;
  let finalSlug = festivalSlug;
  let isUnique = false;

  while (!isUnique && slugSuffix < 100) {
    const { data: existingFestival } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .eq("slug", finalSlug)
      .neq("id", festival.id)
      .maybeSingle();

    if (!existingFestival) {
      isUnique = true;
    } else {
      finalSlug = `${festivalSlug}-${slugSuffix}`;
      slugSuffix++;
    }
  }

  // Update festival with slug
  const { error: slugError } = await supabase
    .from("festivals")
    .update({ slug: finalSlug })
    .eq("id", festival.id);

  if (slugError) {
    handleActionError(slugError, { action: "createFestival", silent: true });
  }

  await invalidateFestival(festival.id, { clubId, seasonId });

  // Get club slug for redirect
  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();
  const clubSlug = club?.slug || clubId;

  redirect(`/club/${clubSlug}/festival/${finalSlug}`);
}

// ============================================
// CACHED QUERY HELPERS
// ============================================

/**
 * Get festival by slug (cached for 1 hour)
 */
export async function getFestivalBySlug(clubId: string, slug: string) {
  const supabase = await createClient();

  const { data: festival, error } = await supabase
    .from("festivals")
    .select("*")
    .eq("club_id", clubId)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    handleActionError(error, { action: "getFestivalBySlug", silent: true });
    return null;
  }

  return festival;
}

/**
 * Get festivals by club (cached for 1 hour)
 */
export async function getFestivalsByClub(clubId: string) {
  const supabase = await createClient();

  const { data: festivals, error } = await supabase
    .from("festivals")
    .select("*")
    .eq("club_id", clubId)
    .is("deleted_at", null)
    .order("start_date", { ascending: false });

  if (error) {
    handleActionError(error, { action: "getFestivalsByClub", silent: true });
    return [];
  }

  return festivals || [];
}
