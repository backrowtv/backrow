"use server";

/**
 * Club Create Action
 *
 * Server action for creating new clubs with all associated setup.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateClub, invalidateDiscover, invalidateMember } from "@/lib/cache/invalidate";
import { logMemberActivity } from "@/lib/activity/logger";
import { ensureUser } from "@/lib/users/ensureUser";
import { validateKeywords } from "@/types/club-creation";
import { validateGenres } from "@/lib/genres/constants";
import { handleActionError } from "@/lib/errors/handler";
import { generateClubSlug } from "./_helpers";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

/**
 * Create a new club
 */
export async function createClub(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("createClub", { limit: 3, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to create a club" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Ensure user exists in public.users table
  try {
    await ensureUser(supabase, user.id, user.email || "");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create user profile",
    };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const privacy = formData.get("privacy") as string;
  const themeColor = formData.get("theme_color") as string | null;
  const keywordsJson = formData.get("keywords") as string | null;
  const genresJson = formData.get("genres") as string | null;
  const pictureFile = formData.get("picture") as File | null;

  // Avatar customization settings
  const avatarIcon = formData.get("avatar_icon") as string | null;
  const avatarColorIndexStr = formData.get("avatar_color_index") as string | null;
  const avatarBorderColorIndexStr = formData.get("avatar_border_color_index") as string | null;

  // Wizard settings
  const festivalType = formData.get("festival_type") as string | null;
  const firstSeasonName = formData.get("first_season_name") as string | null;
  const themesEnabled = formData.get("themes_enabled") as string | null;
  const themeGovernance = formData.get("theme_governance") as string | null;
  const maxThemesPerUser = formData.get("max_themes_per_user") as string | null;
  const maxNominationsPerUser = formData.get("max_nominations_per_user") as string | null;
  const blindNominations = formData.get("blind_nominations") as string | null;
  const rubricsMode = formData.get("rubrics_mode") as string | null;
  const rubricName = formData.get("rubric_name") as string | null;
  const ratingRubricsJson = formData.get("rating_rubrics") as string | null;
  const scoringEnabled = formData.get("scoring_enabled") as string | null;
  const nominationGuessingEnabled = formData.get("nomination_guessing_enabled") as string | null;
  const seasonStandingsEnabled = formData.get("season_standings_enabled") as string | null;
  const timingMode = formData.get("timing_mode") as string | null;
  const autoStartNextFestival = formData.get("auto_start_next_festival") as string | null;

  // Validate inputs
  if (!name || name.trim().length < 3) {
    return { error: "Club name must be at least 3 characters" };
  }

  if (name.length > 30) {
    return { error: "Club name must be less than 30 characters" };
  }

  const validPrivacyLevels = ["public_open", "public_moderated", "private"];
  if (!privacy || !validPrivacyLevels.includes(privacy)) {
    return { error: "Invalid privacy level" };
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

  // Validate genres
  let genres: string[] = [];
  if (genresJson) {
    try {
      const parsedGenres = JSON.parse(genresJson) as string[];
      const genreValidation = validateGenres(parsedGenres);
      if (!genreValidation.isValid) {
        return { error: genreValidation.errors.join(", ") };
      }
      genres = genreValidation.validGenres;
    } catch {
      return { error: "Invalid genres format" };
    }
  }

  // Validate festival type
  const validFestivalTypes = ["standard", "endless"];
  const selectedFestivalType = festivalType || "standard";
  if (!validFestivalTypes.includes(selectedFestivalType)) {
    return { error: "Invalid festival type" };
  }

  // Check if club name already exists (globally unique)
  const { data: existingClub, error: existingClubError } = await supabase
    .from("clubs")
    .select("id")
    .eq("name", name.trim())
    .maybeSingle();

  if (existingClubError) {
    return { error: existingClubError.message };
  }

  if (existingClub) {
    return { error: "A club with this name already exists" };
  }

  const baseSlug = generateClubSlug(name.trim());
  let slug = baseSlug;
  let slugAttempts = 0;
  const maxAttempts = 100;

  // Check if slug already exists and generate unique one
  while (slugAttempts < maxAttempts) {
    const { data: existingSlugClub } = await supabase
      .from("clubs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!existingSlugClub) {
      break; // Slug is available
    }

    // Slug exists, try with a number suffix
    slugAttempts++;
    slug = `${baseSlug}-${slugAttempts}`;
  }

  if (slugAttempts >= maxAttempts) {
    return { error: "Unable to generate a unique slug. Please try a different club name." };
  }

  // Handle image uploads
  let pictureUrl: string | null = null;

  // Upload club picture if provided
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

      // Generate unique filename
      const fileExt = pictureFile.name.split(".").pop();
      const fileName = `${user.id}-pic-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("club-pictures")
        .upload(filePath, pictureFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        return handleActionError(uploadError, {
          action: "createClub",
          metadata: { step: "pictureUpload" },
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("club-pictures").getPublicUrl(filePath);

      pictureUrl = urlData.publicUrl;
    } catch (error) {
      return handleActionError(error, {
        action: "createClub",
        metadata: { step: "pictureUpload" },
      });
    }
  }

  // Build settings object from wizard form data
  const settings: Record<string, unknown> = {};

  // Festival type
  if (festivalType) {
    settings.festival_type = festivalType;
  }

  // Theme settings
  if (themesEnabled !== null) {
    settings.themes_enabled = themesEnabled === "true";
  }
  if (themeGovernance) {
    settings.theme_governance = themeGovernance;
  }
  if (maxThemesPerUser) {
    const parsedValue = parseInt(maxThemesPerUser, 10);
    settings.max_themes_per_user = parsedValue === 0 ? null : parsedValue;
  }

  // Nomination settings
  if (maxNominationsPerUser) {
    settings.max_nominations_per_user = parseInt(maxNominationsPerUser, 10);
  }
  if (blindNominations !== null) {
    settings.blind_nominations_enabled = blindNominations === "true";
  }

  // Rating settings — only rubric mode is club-configurable; scale/increment are user preferences
  if (rubricsMode) {
    settings.rubric_enforcement = rubricsMode;
  }
  if (rubricName) {
    settings.rating_rubric_name = rubricName;
  }
  if (ratingRubricsJson) {
    try {
      settings.rating_rubrics = JSON.parse(ratingRubricsJson);
    } catch {
      // Ignore invalid JSON
    }
  }

  // Competition settings
  if (scoringEnabled !== null) {
    settings.scoring_enabled = scoringEnabled === "true";
  }
  if (nominationGuessingEnabled !== null) {
    settings.nomination_guessing_enabled = nominationGuessingEnabled === "true";
  }
  if (seasonStandingsEnabled !== null) {
    settings.season_standings_enabled = seasonStandingsEnabled === "true";
  }

  // Timing settings
  if (timingMode) {
    settings.nomination_timing = { type: timingMode };
    settings.watch_rate_timing = { type: timingMode };
  }
  if (autoStartNextFestival !== null) {
    settings.auto_start_next_festival = autoStartNextFestival === "true";
  }

  // Sync dedicated columns that mirror settings JSON keys.
  //
  // clubs has both a `settings` JSON blob AND dedicated columns for the same
  // keys. The settings UI (e.g. src/app/(dashboard)/club/[slug]/manage/festival)
  // reads the columns via mergePreferences() — column wins over JSON. If we
  // only write to the JSON here, the UI falls back to DB column defaults
  // (blind_nominations_enabled=false, theme_governance=democracy,
  // max_nominations_per_user=3, etc.) instead of what the user picked in the
  // wizard. See updateClubSettings() in src/app/actions/clubs/settings.ts for
  // the same sync pattern on updates.
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
  const columnSync: Record<string, unknown> = {};
  for (const key of dedicatedColumnKeys) {
    if (key in settings) {
      columnSync[key] = settings[key];
    }
  }

  // Prepare club data
  const clubData: {
    name: string;
    description: string | null;
    privacy: string;
    producer_id: string;
    archived: boolean;
    slug: string;
    theme_color?: string | null;
    keywords?: string[] | null;
    genres?: string[] | null;
    festival_type?: string;
    picture_url?: string | null;
    settings?: Record<string, unknown> | null;
    // Avatar columns (stored as proper columns, not in settings JSON)
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    [key: string]: unknown;
  } = {
    name: name.trim(),
    description: description?.trim() || null,
    privacy,
    producer_id: user.id,
    archived: false,
    slug,
    theme_color: themeColor || null,
    keywords: keywords.length > 0 ? keywords : null,
    genres: genres.length > 0 ? genres : null,
    festival_type: selectedFestivalType,
    picture_url: pictureUrl,
    settings: Object.keys(settings).length > 0 ? settings : null,
    // Avatar columns - write directly to columns, not settings JSON
    avatar_icon: avatarIcon || null,
    avatar_color_index: avatarColorIndexStr ? parseInt(avatarColorIndexStr, 10) : null,
    avatar_border_color_index: avatarBorderColorIndexStr
      ? parseInt(avatarBorderColorIndexStr, 10)
      : null,
    // Dedicated column sync — see comment above.
    ...columnSync,
  };

  // Create club
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert(clubData)
    .select("id, name, slug")
    .single();

  if (clubError) {
    // Clean up uploaded picture if club creation fails
    if (pictureUrl) {
      try {
        const urlParts = pictureUrl.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "club-pictures");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          await supabase.storage.from("club-pictures").remove([urlParts[filenameIndex + 1]]);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    return { error: clubError.message };
  }

  // Add creator as producer
  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: "producer",
  });

  if (memberError) {
    // Rollback club creation
    await supabase.from("clubs").delete().eq("id", club.id);
    return { error: memberError.message };
  }

  const now = new Date();
  const isEndlessFestival = selectedFestivalType === "endless";

  // Create first season for standard clubs only (endless festivals are season-independent)
  if (!isEndlessFestival) {
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const { error: seasonError } = await supabase
      .from("seasons")
      .insert({
        club_id: club.id,
        name: firstSeasonName?.trim() || "Season 1",
        start_date: now.toISOString(),
        end_date: oneYearFromNow.toISOString(),
      })
      .select("id")
      .single();

    if (seasonError) {
      handleActionError(seasonError, {
        action: "createClub",
        metadata: { step: "createFirstSeason" },
      });
      // Don't fail club creation, but log the error
    }
  }

  // For endless mode clubs, create the endless festival (no season needed)
  if (isEndlessFestival) {
    const { error: festivalError } = await supabase.from("festivals").insert({
      club_id: club.id,
      season_id: null,
      theme: "Endless Festival",
      status: "watching",
      phase: "watch_rate",
      member_count_at_creation: 1,
      start_date: now.toISOString(),
      auto_advance: false,
      slug: `endless-${club.id.slice(0, 8)}`,
    });

    if (festivalError) {
      handleActionError(festivalError, {
        action: "createClub",
        metadata: { step: "createEndlessFestival" },
      });
      // Don't fail club creation, but log the error
    }
  }

  // Log member activity (user created a club)
  await logMemberActivity(user.id, "user_created_club", {
    club_id: club.id,
    club_name: club.name,
    club_slug: club.slug || club.id,
  });

  // Check Club Founder achievement badge (non-blocking)
  try {
    const { awardAchievementIfNotEarned } = await import("../badges");
    await awardAchievementIfNotEarned(user.id, "club_founder");
  } catch (e) {
    console.error("Club Founder badge check failed:", e);
  }

  invalidateClub(club.id);
  invalidateDiscover();
  // Bust the creator's own "my clubs" + membership cache so the just-created
  // club appears in /clubs and the new-club page shows the user as producer
  // on first render. invalidateClub alone doesn't cover CacheTags.member(userId).
  invalidateMember(club.id, user.id);

  // Return success with redirect URL (don't use redirect() as it throws and breaks try/catch on client)
  return { success: true, clubSlug: club.slug || club.id };
}
