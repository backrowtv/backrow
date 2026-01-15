"use server";

/**
 * Theme Selection Actions
 *
 * Functions for selecting festival themes (producer/director actions).
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateFestival, invalidateClub } from "@/lib/cache/invalidate";
import { logClubActivity } from "@/lib/activity/logger";
import { generateUniqueSlug } from "./helpers";

/**
 * Update the festival_started activity record with the theme and slug
 * once a theme has been selected.
 */
async function updateFestivalStartedActivity(
  supabase: SupabaseClient,
  clubId: string,
  festivalId: string,
  theme: string,
  slug: string
) {
  const { data: activity } = await supabase
    .from("activity_log")
    .select("id, details")
    .eq("club_id", clubId)
    .eq("action", "festival_started")
    .filter("details->>festival_id", "eq", festivalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activity) {
    const updatedDetails = {
      ...(activity.details as Record<string, unknown>),
      festival_theme: theme,
      festival_slug: slug,
    };
    await supabase.from("activity_log").update({ details: updatedDetails }).eq("id", activity.id);
  }
}

/**
 * Producer selects winning theme for festival
 * Marks theme as used and updates festival theme
 */
export async function selectFestivalTheme(festivalId: string, themeId: string) {
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
    .select("club_id, phase, theme")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  if (festival.phase !== "theme_selection") {
    return { error: "Theme can only be selected during theme selection phase" };
  }

  // Check user is producer
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership || membership.role !== "producer") {
    return { error: "Only the producer can select the festival theme" };
  }

  // Get theme
  const { data: theme, error: themeError } = await supabase
    .from("theme_pool")
    .select("id, theme_name, club_id, is_used")
    .eq("id", themeId)
    .single();

  if (themeError || !theme) {
    return { error: "Theme not found" };
  }

  if (theme.club_id !== festival.club_id) {
    return { error: "Theme does not belong to this club" };
  }

  if (theme.is_used) {
    return { error: "This theme has already been used" };
  }

  // Generate unique slug from theme name
  const finalSlug = await generateUniqueSlug(
    supabase,
    theme.theme_name,
    festival.club_id,
    festivalId
  );

  // Update festival theme, slug, AND advance to nomination phase
  const { error: updateFestivalError } = await supabase
    .from("festivals")
    .update({
      theme: theme.theme_name,
      slug: finalSlug,
      phase: "nomination",
      status: "nominating",
      theme_selected_by: user.id,
      theme_source: "pool",
    })
    .eq("id", festivalId);

  if (updateFestivalError) {
    return { error: updateFestivalError.message };
  }

  // Mark theme as used
  const { error: updateThemeError } = await supabase
    .from("theme_pool")
    .update({ is_used: true })
    .eq("id", themeId);

  if (updateThemeError) {
    return { error: updateThemeError.message };
  }

  // Log club activity (phase change)
  await logClubActivity(festival.club_id, "festival_phase_changed", {
    festival_id: festivalId,
    from_phase: "theme_selection",
    to_phase: "nomination",
    theme: theme.theme_name,
  });

  // Update the festival_started activity with the theme now that it's been selected
  await updateFestivalStartedActivity(
    supabase,
    festival.club_id,
    festivalId,
    theme.theme_name,
    finalSlug
  );

  // Create discussion thread now that theme is decided
  try {
    const { createFestivalDiscussionOnStart } = await import("../discussions/auto");
    await createFestivalDiscussionOnStart(festival.club_id, festivalId, theme.theme_name, user.id);
  } catch (err) {
    console.error("Error creating festival discussion thread:", err);
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });
  return { success: true, theme: theme.theme_name };
}

/**
 * Select a custom theme (admin types in a name that doesn't exist in pool)
 */
export async function selectCustomTheme(festivalId: string, themeName: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  if (!themeName || !themeName.trim()) {
    return { error: "Theme name is required" };
  }

  // Get festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, theme")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  if (festival.phase !== "theme_selection") {
    return { error: "Theme can only be selected during theme selection phase" };
  }

  // Check user is producer or director
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can select themes" };
  }

  // Generate unique slug from theme name
  const finalSlug = await generateUniqueSlug(
    supabase,
    themeName.trim(),
    festival.club_id,
    festivalId
  );

  // Update festival theme, slug, AND advance to nomination phase
  const { error: updateFestivalError } = await supabase
    .from("festivals")
    .update({
      theme: themeName.trim(),
      slug: finalSlug,
      phase: "nomination",
      status: "nominating",
      theme_selected_by: user.id,
      theme_source: "custom",
    })
    .eq("id", festivalId);

  if (updateFestivalError) {
    return { error: updateFestivalError.message };
  }

  // Log club activity (phase change)
  await logClubActivity(festival.club_id, "festival_phase_changed", {
    festival_id: festivalId,
    from_phase: "theme_selection",
    to_phase: "nomination",
    theme: themeName.trim(),
  });

  // Update the festival_started activity with the theme now that it's been selected
  await updateFestivalStartedActivity(
    supabase,
    festival.club_id,
    festivalId,
    themeName.trim(),
    finalSlug
  );

  // Create discussion thread now that theme is decided
  try {
    const { createFestivalDiscussionOnStart } = await import("../discussions/auto");
    await createFestivalDiscussionOnStart(festival.club_id, festivalId, themeName.trim(), user.id);
  } catch (err) {
    console.error("Error creating festival discussion thread:", err);
  }

  invalidateClub(festival.club_id);
  return { success: true, theme: themeName.trim() };
}

/**
 * Select a random theme from the available theme pool
 */
export async function selectRandomTheme(festivalId: string) {
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
    .select("club_id, phase, theme")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  if (festival.phase !== "theme_selection") {
    return { error: "Theme can only be selected during theme selection phase" };
  }

  // Check user is producer or director
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can select themes" };
  }

  // Get available (unused) themes from the pool
  const { data: themes, error: themesError } = await supabase
    .from("theme_pool")
    .select("id, theme_name")
    .eq("club_id", festival.club_id)
    .eq("is_used", false);

  if (themesError) {
    return { error: themesError.message };
  }

  if (!themes || themes.length === 0) {
    return { error: "No available themes in the pool" };
  }

  // Select a random theme
  const randomIndex = Math.floor(Math.random() * themes.length);
  const selectedTheme = themes[randomIndex];

  // Generate unique slug from theme name
  const finalSlug = await generateUniqueSlug(
    supabase,
    selectedTheme.theme_name,
    festival.club_id,
    festivalId
  );

  // Update festival theme, slug, AND advance to nomination phase
  const { error: updateFestivalError } = await supabase
    .from("festivals")
    .update({
      theme: selectedTheme.theme_name,
      slug: finalSlug,
      phase: "nomination",
      status: "nominating",
      theme_selected_by: user.id,
      theme_source: "random",
    })
    .eq("id", festivalId);

  if (updateFestivalError) {
    return { error: updateFestivalError.message };
  }

  // Mark theme as used
  const { error: updateThemeError } = await supabase
    .from("theme_pool")
    .update({ is_used: true })
    .eq("id", selectedTheme.id);

  if (updateThemeError) {
    return { error: updateThemeError.message };
  }

  // Log club activity (phase change)
  await logClubActivity(festival.club_id, "festival_phase_changed", {
    festival_id: festivalId,
    from_phase: "theme_selection",
    to_phase: "nomination",
    theme: selectedTheme.theme_name,
  });

  // Update the festival_started activity with the theme now that it's been selected
  await updateFestivalStartedActivity(
    supabase,
    festival.club_id,
    festivalId,
    selectedTheme.theme_name,
    finalSlug
  );

  // Create discussion thread now that theme is decided
  try {
    const { createFestivalDiscussionOnStart } = await import("../discussions/auto");
    await createFestivalDiscussionOnStart(
      festival.club_id,
      festivalId,
      selectedTheme.theme_name,
      user.id
    );
  } catch (err) {
    console.error("Error creating festival discussion thread:", err);
  }

  invalidateClub(festival.club_id);
  return { success: true, theme: selectedTheme.theme_name };
}

/**
 * Get top voted themes from the theme pool
 */
export async function getTopVotedThemes(clubId: string, limit: number = 3) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null };
  }

  // Get themes with their vote counts, sorted by votes
  const { data: themes, error: themesError } = await supabase
    .from("theme_pool")
    .select("id, theme_name, upvotes, downvotes")
    .eq("club_id", clubId)
    .eq("is_used", false)
    .order("upvotes", { ascending: false })
    .limit(limit);

  if (themesError) {
    return { error: themesError.message, data: null };
  }

  return {
    success: true,
    data:
      themes?.map((t) => ({
        id: t.id,
        theme_name: t.theme_name,
        votes: (t.upvotes || 0) - (t.downvotes || 0),
      })) || [],
  };
}
