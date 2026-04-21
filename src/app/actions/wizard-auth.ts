"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import { ensureUser } from "@/lib/users/ensureUser";
import { authCallbackUrl } from "@/lib/seo/absolute-url";

/**
 * Combined action for wizard-first auth flow
 * Creates a new user account and their first club in a single transaction
 */
export async function createUserAndClub(formData: FormData) {
  const supabase = await createClient();

  // Extract auth data
  const email = formData.get("email") as string;
  const username = formData.get("username") as string | null;
  const authPassword = formData.get("auth_password") as string;

  // Validate auth data
  if (!email || !email.includes("@")) {
    return { error: "Valid email is required" };
  }

  if (username && username.length < 3) {
    return { error: "Username must be at least 3 characters" };
  }

  if (username && !/^[a-z0-9_]+$/.test(username)) {
    return { error: "Username can only contain lowercase letters, numbers, and underscores" };
  }

  if (!authPassword || authPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  // Extract club data
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const privacy = formData.get("privacy") as string;
  const themeColor = formData.get("theme_color") as string | null;

  // Avatar customization settings
  const avatarIcon = formData.get("avatar_icon") as string | null;
  const avatarColorIndexStr = formData.get("avatar_color_index") as string | null;
  const avatarBorderColorIndexStr = formData.get("avatar_border_color_index") as string | null;

  // Validate club name
  if (!name || name.trim().length < 3) {
    return { error: "Club name must be at least 3 characters" };
  }

  if (name.length > 25) {
    return { error: "Club name must be less than 25 characters" };
  }

  // Step 1: Create the user account
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: authPassword,
    options: {
      emailRedirectTo: authCallbackUrl(),
    },
  });

  if (signUpError) {
    // Handle specific error cases
    if (signUpError.message.includes("already registered")) {
      return { error: "An account with this email already exists. Please sign in instead." };
    }
    return { error: signUpError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create account" };
  }

  const userId = authData.user.id;

  // Step 2: Ensure user exists in public.users table
  try {
    await ensureUser(supabase, userId, email);

    // Update username if provided
    if (username && username.length >= 3) {
      const { error: usernameError } = await supabase
        .from("users")
        .update({ username })
        .eq("id", userId);

      if (usernameError?.code === "23505" && usernameError.message?.includes("username")) {
        return { error: "That username is already taken. Please choose another." };
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create user profile",
    };
  }

  // Step 3: Generate slug
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // Step 4: Check if club name already exists
  const { data: existingClub } = await supabase
    .from("clubs")
    .select("id")
    .eq("name", name.trim())
    .maybeSingle();

  if (existingClub) {
    return { error: "A club with this name already exists" };
  }

  // Step 5: Extract all settings from form data
  const festivalType = (formData.get("festival_type") as string) || "standard";
  const firstSeasonName = (formData.get("first_season_name") as string) || "Season 1";
  const themeGovernance = (formData.get("theme_governance") as string) || "democracy";
  const maxNominationsPerUser = parseInt(
    (formData.get("max_nominations_per_user") as string) || "1"
  );
  const maxThemesPerUser = parseInt((formData.get("max_themes_per_user") as string) || "5");
  const blindNominations = formData.get("blind_nominations") === "true";
  const nominationGuessingEnabled = formData.get("nomination_guessing_enabled") === "true";
  const seasonStandingsEnabled = formData.get("season_standings_enabled") === "true";
  const timingMode = (formData.get("timing_mode") as string) || "manual";
  const autoStartNextFestival = formData.get("auto_start_next_festival") === "true";
  const rubricsMode = (formData.get("rubrics_mode") as string) || "off";
  const rubricName = formData.get("rubric_name") as string | null;
  const ratingRubricsJson = formData.get("rating_rubrics") as string | null;
  const scoringEnabled = formData.get("scoring_enabled") === "true";

  // Parse rating rubrics if provided
  let ratingRubrics = null;
  if (ratingRubricsJson) {
    try {
      ratingRubrics = JSON.parse(ratingRubricsJson);
    } catch {
      // Ignore invalid JSON
    }
  }

  // Build settings JSONB
  const settings: Record<string, unknown> = {
    themes_enabled: true,
    theme_governance: themeGovernance,
    theme_voting_enabled: themeGovernance === "democracy",
    max_themes_per_user: maxThemesPerUser === 0 ? null : maxThemesPerUser,
    max_nominations_per_user: maxNominationsPerUser,
    max_nominations_per_festival: null,
    blind_nominations_enabled: blindNominations,
    festival_type: festivalType,
    // Rating rubric settings (scale/increment are user preferences, not club settings)
    club_ratings_enabled: true,
    rubric_enforcement: rubricsMode,
    rating_rubric_name: rubricName || null,
    rating_rubrics: ratingRubrics,
    // Scoring settings (standard only)
    scoring_enabled: scoringEnabled,
    nomination_guessing_enabled: nominationGuessingEnabled,
    season_standings_enabled: seasonStandingsEnabled,
    // Timing
    nomination_timing: { type: timingMode },
    watch_rate_timing: { type: timingMode },
    auto_start_next_festival: autoStartNextFestival,
    // Results settings
    results_reveal_type: "manual",
    results_reveal_direction: "forward",
  };

  // Step 6: Create the club
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      name: name.trim(),
      slug,
      description: description || null,
      privacy: privacy || "private",
      producer_id: userId,
      festival_type: festivalType,
      theme_color: themeColor || null,
      settings,
      avatar_icon: avatarIcon || null,
      avatar_color_index: avatarColorIndexStr ? parseInt(avatarColorIndexStr, 10) : null,
      avatar_border_color_index: avatarBorderColorIndexStr
        ? parseInt(avatarBorderColorIndexStr, 10)
        : null,
    })
    .select("id, slug")
    .single();

  if (clubError) {
    return handleActionError(clubError, "createUserAndClub");
  }

  // Step 7: Add owner as club member with 'producer' role
  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: userId,
    role: "producer",
  });

  if (memberError) {
    console.error("Member creation error:", memberError);
    // Club was created but member wasn't added - this is a problem
    // For now, continue and let them handle it
  }

  // Auto-join BackRow Featured club
  const { data: featuredClub } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "backrow-featured")
    .single();

  if (featuredClub) {
    await supabase
      .from("club_members")
      .upsert(
        { club_id: featuredClub.id, user_id: userId, role: "critic" },
        { onConflict: "club_id,user_id" }
      );
  }

  const now = new Date();
  const isEndlessMode = festivalType === "endless";

  // Create first season for standard clubs only (endless festivals are season-independent)
  if (!isEndlessMode) {
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const { error: seasonError } = await supabase
      .from("seasons")
      .insert({
        club_id: club.id,
        name: firstSeasonName.trim() || "Season 1",
        start_date: now.toISOString(),
        end_date: oneYearFromNow.toISOString(),
      })
      .select("id")
      .single();

    if (seasonError) {
      console.error("Failed to create first season:", seasonError);
      // Don't fail club creation, but log the error
    }
  }

  // For endless mode clubs, create the endless festival (no season needed)
  if (isEndlessMode) {
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
      console.error("Failed to create endless festival:", festivalError);
      // Don't fail club creation, but log the error
    }
  }

  // Step 8: Handle avatar upload if provided
  const pictureFile = formData.get("picture") as File | null;
  if (pictureFile && pictureFile.size > 0) {
    try {
      const fileExt = pictureFile.name.split(".").pop();
      const fileName = `${club.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("club-pictures")
        .upload(fileName, pictureFile, {
          upsert: true,
          contentType: pictureFile.type,
        });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("club-pictures").getPublicUrl(fileName);

        await supabase.from("clubs").update({ picture_url: publicUrl }).eq("id", club.id);
      }
    } catch (error) {
      // Non-critical error, continue
      console.error("Avatar upload error:", error);
    }
  }

  // Revalidate paths
  revalidatePath("/");
  revalidatePath("/clubs");
  revalidatePath(`/club/${club.slug}`);

  // Return success with redirect URL (don't use redirect() as it throws and breaks try/catch on client)
  return { success: true, clubSlug: club.slug };
}
