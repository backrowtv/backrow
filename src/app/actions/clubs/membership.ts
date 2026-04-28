"use server";

/**
 * Club Membership Actions
 *
 * Server actions for joining clubs, managing favorites, and inviting members.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateMember } from "@/lib/cache/invalidate";
import { logDualActivity } from "@/lib/activity/logger";
import { ensureUser } from "@/lib/users/ensureUser";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { checkAndAwardClubBadges } from "../club-badges";
import type { MobileNavPreferences } from "@/lib/navigation-constants";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Auto-set the user's default rubric for a newly joined club
 * This is called after a user successfully joins a club
 */
async function applyDefaultRubric(
  supabase: SupabaseClient,
  clubId: string,
  userId: string
): Promise<void> {
  try {
    // Check if user has a default rubric set
    const { data: defaultRubric } = await supabase
      .from("user_rubrics")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();

    if (!defaultRubric) {
      return; // No default rubric set
    }

    // Get the membership to update preferences
    const { data: membership } = await supabase
      .from("club_members")
      .select("preferences")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return; // Membership not found (shouldn't happen)
    }

    const currentPreferences = (membership.preferences as Record<string, unknown>) || {};

    // Set the default rubric for this club
    await supabase
      .from("club_members")
      .update({
        preferences: {
          ...currentPreferences,
          default_rubric_id: defaultRubric.id,
        },
      })
      .eq("club_id", clubId)
      .eq("user_id", userId);
  } catch (error) {
    // Log error but don't fail the join operation
    console.error("Failed to apply default rubric:", error);
  }
}

export async function joinPublicClub(clubId: string) {
  const rateCheck = await actionRateLimit("joinPublicClub", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to join a club" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Ensure user exists in public.users table
  try {
    await ensureUser(supabase, user.id, user.email || "");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to load user profile",
    };
  }

  // Get club info
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug, privacy, archived")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) {
    return { error: clubError.message };
  }

  if (!club) {
    return { error: "Club not found" };
  }

  if (club.archived) {
    return { error: "This club has been archived and is no longer accepting new members." };
  }

  if (club.privacy !== "public_open") {
    return { error: "This club requires an invitation code or approval to join." };
  }

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return { error: "You are already a member of this club." };
  }

  // Add user as a member with 'critic' role
  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: "critic",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  // Log both club and member activity
  await logDualActivity(club.id, user.id, "member_joined", "user_joined_club", {
    club_name: club.name,
    club_slug: club.slug || club.id,
    method: "public_join",
  });

  // Auto-apply default rubric if user has one set
  await applyDefaultRubric(supabase, club.id, user.id);

  // Check and award club badges for member count milestone
  try {
    await checkAndAwardClubBadges(club.id);
  } catch (error) {
    // Don't fail join if badge check fails
    console.error("Failed to check club badges:", error);
  }

  invalidateMember(club.id, user.id);

  return { success: true, clubId: club.id, clubSlug: club.slug || club.id, clubName: club.name };
}

export async function toggleFavoriteClub(clubId: string) {
  const rateCheck = await actionRateLimit("toggleFavoriteClub", { limit: 30, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to favorite clubs" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Check if club exists
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) {
    return { error: clubError.message };
  }

  if (!club) {
    return { error: "Club not found" };
  }

  // Check if already favorited
  const { data: existingFavorite } = await supabase
    .from("favorite_clubs")
    .select("*")
    .eq("user_id", user.id)
    .eq("club_id", clubId)
    .maybeSingle();

  if (existingFavorite) {
    // Remove favorite
    const { error } = await supabase
      .from("favorite_clubs")
      .delete()
      .eq("user_id", user.id)
      .eq("club_id", clubId);

    if (error) {
      return { error: error.message };
    }

    // Clear from mobile_nav_preferences if this was the selected favorite club
    const { data: userData } = await supabase
      .from("users")
      .select("mobile_nav_preferences")
      .eq("id", user.id)
      .single();

    if (userData?.mobile_nav_preferences) {
      const prefs = userData.mobile_nav_preferences as MobileNavPreferences;
      if (prefs.favoriteClubId === clubId) {
        // Clear the favoriteClubId since this club is no longer favorited
        await supabase
          .from("users")
          .update({
            mobile_nav_preferences: {
              ...prefs,
              favoriteClubId: null,
            },
          })
          .eq("id", user.id);
      }
    }

    invalidateMember(clubId, user.id);

    return {
      success: true,
      isFavorite: false,
      clearedFromNav: userData?.mobile_nav_preferences?.favoriteClubId === clubId,
    };
  } else {
    // Add favorite
    const { error } = await supabase.from("favorite_clubs").insert({
      user_id: user.id,
      club_id: clubId,
    });

    if (error) {
      return { error: error.message };
    }

    invalidateMember(clubId, user.id);

    return { success: true, isFavorite: true };
  }
}

export async function updateMemberPreference(clubId: string, key: string, value: unknown) {
  const rateCheck = await actionRateLimit("updateMemberPreference", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  const { data: membership } = await supabase
    .from("club_members")
    .select("preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "Not a member" };

  const current = (membership.preferences as Record<string, unknown>) || {};

  // One-time migration: when a member with the legacy `hide_club_card` key
  // touches a per-viewport hide toggle for the first time, lift the legacy
  // value into whichever viewport key isn't being written, then drop the
  // legacy key. After this, both viewports have explicit booleans and the
  // read-time fallback (`hide_club_card_*` ?? `hide_club_card`) is no longer
  // needed for this member.
  let nextPrefs: Record<string, unknown>;
  const isHideCardKey = key === "hide_club_card_desktop" || key === "hide_club_card_mobile";
  if (isHideCardKey && "hide_club_card" in current) {
    const otherKey =
      key === "hide_club_card_desktop" ? "hide_club_card_mobile" : "hide_club_card_desktop";
    const otherValue = otherKey in current ? current[otherKey] : current.hide_club_card;
    const rest: Record<string, unknown> = { ...current };
    delete rest.hide_club_card;
    nextPrefs = { ...rest, [key]: value, [otherKey]: otherValue };
  } else {
    nextPrefs = { ...current, [key]: value };
  }

  const { error } = await supabase
    .from("club_members")
    .update({ preferences: nextPrefs })
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  invalidateMember(clubId, user.id);

  return { success: true };
}
