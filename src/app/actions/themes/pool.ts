"use server";

/**
 * Theme Pool Actions
 *
 * CRUD operations for the club theme pool.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateClub } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import { logMemberActivity } from "@/lib/activity/logger";
import { MAX_THEME_LENGTH } from "./helpers";

export async function addTheme(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const clubId = formData.get("clubId") as string;
  const themeName = formData.get("themeName") as string;

  if (!clubId || !themeName || !themeName.trim()) {
    return { error: "Theme name is required" };
  }

  // Check character limit
  if (themeName.trim().length > MAX_THEME_LENGTH) {
    return { error: `Theme must be ${MAX_THEME_LENGTH} characters or less` };
  }

  // Check blacklist for theme name
  const { validateBlacklist } = await import("@/lib/clubs/blacklist");
  const blacklistError = await validateBlacklist(clubId, themeName);
  if (blacklistError) {
    return { error: blacklistError };
  }

  // Check user is a member (using maybeSingle to avoid error when no row found)
  // Note: club_members has composite PK (club_id, user_id), no id column
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return handleActionError(membershipError, "addTheme");
  }

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Check if theme submissions are locked
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("theme_submissions_locked, settings")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) {
    return handleActionError(clubError, "addTheme");
  }

  if (!club) {
    console.error("Club not found for clubId:", clubId);
    return { error: "Club not found" };
  }

  const clubSettings = (club.settings as Record<string, unknown>) || {};
  if (clubSettings.themes_enabled === false) {
    return { error: "The theme pool is currently disabled for this club" };
  }

  if (club.theme_submissions_locked) {
    return {
      error:
        "Theme submissions are currently locked. Please contact the club producer or director to unlock theme submissions.",
    };
  }

  // Check if theme already exists (case-sensitive unique per club)
  const { data: existingTheme, error: existingThemeError } = await supabase
    .from("theme_pool")
    .select("id")
    .eq("club_id", clubId)
    .eq("theme_name", themeName.trim())
    .eq("is_used", false)
    .maybeSingle();

  if (existingThemeError) {
    return { error: existingThemeError.message };
  }

  if (existingTheme) {
    return { error: "This theme already exists in the pool" };
  }

  // Add theme and return the inserted row with the author joined so the client
  // can render it immediately without a fallback-avatar flash.
  const { data: inserted, error } = await supabase
    .from("theme_pool")
    .insert({
      club_id: clubId,
      theme_name: themeName.trim(),
      added_by: user.id,
      is_used: false,
    })
    .select("*, added_by_user:added_by(id, display_name, username, avatar_url)")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to add theme" };
  }

  // Log activity
  await logMemberActivity(
    user.id,
    "user_theme_submitted",
    {
      theme_name: themeName.trim(),
    },
    clubId
  );

  invalidateClub(clubId);

  const addedByUser = Array.isArray(inserted.added_by_user)
    ? inserted.added_by_user[0] || null
    : inserted.added_by_user;

  return {
    success: true,
    theme: {
      ...inserted,
      added_by_user: addedByUser,
    },
  };
}

export async function removeTheme(themeId: string, clubId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check user is a member (club_members has composite PK, no id column)
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Get theme to check if it's used
  const { data: theme, error: themeError } = await supabase
    .from("theme_pool")
    .select("is_used, added_by, theme_name")
    .eq("id", themeId)
    .single();

  if (themeError || !theme) {
    return { error: "Theme not found" };
  }

  if (theme.is_used) {
    return { error: "Cannot remove a theme that has been used" };
  }

  // Only the person who added it or producer/director can remove
  const { data: userMembership, error: userMembershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (userMembershipError) {
    return { error: userMembershipError.message };
  }

  const canRemove =
    theme.added_by === user.id ||
    userMembership?.role === "producer" ||
    userMembership?.role === "director";

  if (!canRemove) {
    return { error: "You can only remove themes you added" };
  }

  const { error } = await supabase.from("theme_pool").delete().eq("id", themeId);

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logMemberActivity(
    user.id,
    "user_theme_removed",
    {
      theme_name: theme.theme_name,
    },
    clubId
  );

  invalidateClub(clubId);
  return { success: true };
}

export async function updateTheme(themeId: string, newName: string, clubId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  if (!newName || !newName.trim()) {
    return { error: "Theme name is required" };
  }

  // Check character limit
  if (newName.trim().length > MAX_THEME_LENGTH) {
    return { error: `Theme must be ${MAX_THEME_LENGTH} characters or less` };
  }

  // Check user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Get theme to check if it's used and who added it
  const { data: theme, error: themeError } = await supabase
    .from("theme_pool")
    .select("is_used, added_by, theme_name")
    .eq("id", themeId)
    .single();

  if (themeError || !theme) {
    return { error: "Theme not found" };
  }

  if (theme.is_used) {
    return { error: "Cannot edit a theme that has been used" };
  }

  // Only the person who added it or producer/director can edit
  const canEdit =
    theme.added_by === user.id || membership.role === "producer" || membership.role === "director";

  if (!canEdit) {
    return { error: "You can only edit themes you added" };
  }

  // Check if new name is different
  if (theme.theme_name.trim() === newName.trim()) {
    return { success: true }; // No change needed
  }

  // Check if theme name already exists (case-sensitive unique per club)
  const { data: existingTheme } = await supabase
    .from("theme_pool")
    .select("id")
    .eq("club_id", clubId)
    .eq("theme_name", newName.trim())
    .eq("is_used", false)
    .neq("id", themeId) // Exclude current theme
    .maybeSingle();

  if (existingTheme) {
    return { error: "This theme name already exists in the pool" };
  }

  // Update theme
  const { error } = await supabase
    .from("theme_pool")
    .update({ theme_name: newName.trim() })
    .eq("id", themeId);

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logMemberActivity(
    user.id,
    "user_theme_edited",
    {
      theme_name: newName.trim(),
    },
    clubId
  );

  invalidateClub(clubId);
  return { success: true };
}
