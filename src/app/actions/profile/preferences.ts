"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import { mergePreferencesMapped } from "@/lib/utils/merge-preferences";
import type { UserRatingPreferences } from "@/types/user-rating-preferences";
import { DEFAULT_RATING_PREFERENCES } from "@/types/user-rating-preferences";
import type {
  UpdatePrivacySettingsResult,
  UpdateNotificationPreferencesResult,
  UpdateClubNotificationPreferencesResult,
  UpdateRatingPreferencesResult,
  GetRatingPreferencesResult,
  NotificationPreferencesInput,
  ClubNotificationPreferencesInput,
} from "./types";

/**
 * Update user privacy settings
 */
export async function updatePrivacySettings(settings: {
  showProfilePopup?: boolean;
}): Promise<UpdatePrivacySettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get current user profile
  const { data: currentUser, error: fetchError } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  if (fetchError || !currentUser) {
    return { error: "Failed to fetch current settings" };
  }

  const currentSocialLinks = (currentUser.social_links as Record<string, unknown>) || {};

  // Merge privacy settings into social_links
  const updatedSocialLinks = {
    ...currentSocialLinks,
    show_profile_popup: settings.showProfilePopup ?? currentSocialLinks.show_profile_popup ?? true,
  };

  const { error: updateError } = await supabase
    .from("users")
    .update({
      social_links: updatedSocialLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message || "Failed to update privacy settings" };
  }

  revalidatePath("/profile/settings/account");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferencesInput
): Promise<UpdateNotificationPreferencesResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get current user profile
  const { data: currentUser, error: fetchError } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  if (fetchError || !currentUser) {
    return { error: "Failed to fetch current preferences" };
  }

  const currentSocialLinks = (currentUser.social_links as Record<string, unknown>) || {};
  const currentPrefs =
    (currentSocialLinks.notification_preferences as Record<string, unknown>) || {};

  // Merge notification preferences
  const NOTIFICATION_PREF_MAPPING = [
    // [snake_key, camelKey, default]
    ["all_notifications", "allNotifications", true],
    ["all_site_notifications", "allSiteNotifications", true],
    ["all_email_notifications", "allEmailNotifications", true],
    ["all_push_notifications", "allPushNotifications", true],
    ["new_festivals", "newFestivals", true],
    ["festival_updates", "festivalUpdates", true],
    ["deadline_changes", "deadlineChanges", true],
    ["results_revealed", "resultsRevealed", true],
    ["endless_festival", "endlessFestival", true],
    ["club_invites", "clubInvites", true],
    ["club_updates", "clubUpdates", true],
    ["announcements", "announcements", true],
    ["events", "events", true],
    ["polls", "polls", true],
    ["seasons", "seasons", true],
    ["mentions", "mentions", true],
    ["new_messages", "newMessages", true],
    ["badges", "badges", true],
    ["email_notifications", "emailNotifications", false],
    ["digest_frequency", "digestFrequency", "daily"],
    ["email_enabled_clubs", "emailEnabledClubs", []],
    // Email — per-category (all default false, opt-in)
    ["email_new_festivals", "emailNewFestivals", false],
    ["email_festival_updates", "emailFestivalUpdates", false],
    ["email_deadline_changes", "emailDeadlineChanges", false],
    ["email_results_revealed", "emailResultsRevealed", false],
    ["email_endless_festival", "emailEndlessFestival", false],
    ["email_club_invites", "emailClubInvites", false],
    ["email_club_updates", "emailClubUpdates", false],
    ["email_announcements", "emailAnnouncements", false],
    ["email_events", "emailEvents", false],
    ["email_polls", "emailPolls", false],
    ["email_seasons", "emailSeasons", false],
    ["email_mentions", "emailMentions", false],
    ["email_new_messages", "emailNewMessages", false],
    ["email_badges", "emailBadges", false],
  ] as const;

  const updatedPrefs = {
    ...currentPrefs,
    ...mergePreferencesMapped(
      preferences as Record<string, unknown>,
      currentPrefs,
      NOTIFICATION_PREF_MAPPING
    ),
  };

  const updatedSocialLinks = {
    ...currentSocialLinks,
    notification_preferences: updatedPrefs,
  };

  const { error: updateError } = await supabase
    .from("users")
    .update({
      social_links: updatedSocialLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message || "Failed to update notification preferences" };
  }

  revalidatePath("/profile/settings/account");
  return { success: true };
}

/**
 * Update notification preferences for a specific club
 */
export async function updateClubNotificationPreferences(
  clubId: string,
  preferences: ClubNotificationPreferencesInput
): Promise<UpdateClubNotificationPreferencesResult> {
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
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You are not a member of this club" };
  }

  // Get current user profile with club notification preferences
  const { data: currentUser, error: fetchError } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  if (fetchError || !currentUser) {
    return { error: "Failed to fetch current preferences" };
  }

  const currentSocialLinks = (currentUser.social_links as Record<string, unknown>) || {};
  const clubPrefs =
    (currentSocialLinks.club_notification_preferences as Record<string, Record<string, unknown>>) ||
    {};
  const currentPrefs = clubPrefs[clubId] || {};

  // Merge preferences
  const CLUB_NOTIFICATION_PREF_MAPPING = [
    ["all_club_notifications", "allClubNotifications", true],
    ["festival_updates", "festivalUpdates", true],
    ["new_festivals", "newFestivals", true],
    ["new_nominations", "newNominations", true],
    ["phase_changes", "phaseChanges", true],
    ["deadline_changes", "deadlineChanges", true],
    ["results_revealed", "resultsRevealed", true],
    ["endless_festival", "endlessFestival", true],
    ["club_updates", "clubUpdates", true],
    ["announcements", "announcements", true],
    ["events", "events", true],
    ["polls", "polls", true],
    ["seasons", "seasons", true],
    ["new_messages", "newMessages", true],
    ["mentions", "mentions", true],
    // Email — per-club per-category (all default false, opt-in)
    ["email_enabled", "emailEnabled", false],
    ["email_festival_updates", "emailFestivalUpdates", false],
    ["email_new_festivals", "emailNewFestivals", false],
    ["email_new_nominations", "emailNewNominations", false],
    ["email_phase_changes", "emailPhaseChanges", false],
    ["email_deadline_changes", "emailDeadlineChanges", false],
    ["email_results_revealed", "emailResultsRevealed", false],
    ["email_endless_festival", "emailEndlessFestival", false],
    ["email_club_updates", "emailClubUpdates", false],
    ["email_announcements", "emailAnnouncements", false],
    ["email_events", "emailEvents", false],
    ["email_polls", "emailPolls", false],
    ["email_seasons", "emailSeasons", false],
    ["email_new_messages", "emailNewMessages", false],
    ["email_mentions", "emailMentions", false],
  ] as const;

  const updatedPrefs = {
    ...currentPrefs,
    ...mergePreferencesMapped(
      preferences as Record<string, unknown>,
      currentPrefs,
      CLUB_NOTIFICATION_PREF_MAPPING
    ),
  };

  const updatedSocialLinks = {
    ...currentSocialLinks,
    club_notification_preferences: {
      ...clubPrefs,
      [clubId]: updatedPrefs,
    },
  };

  const { error: updateError } = await supabase
    .from("users")
    .update({
      social_links: updatedSocialLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message || "Failed to update notification preferences" };
  }

  revalidatePath(`/club/[slug]/settings/notifications`);
  return { success: true };
}

/**
 * Update user rating preferences
 */
export async function updateRatingPreferences(
  preferences: Partial<UserRatingPreferences>
): Promise<UpdateRatingPreferencesResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get current preferences first
  const { data: currentUser, error: fetchError } = await supabase
    .from("users")
    .select("rating_preferences")
    .eq("id", user.id)
    .single();

  if (fetchError) {
    return handleActionError(fetchError, "updateRatingPreferences");
  }

  const currentPrefs =
    (currentUser?.rating_preferences as UserRatingPreferences) || DEFAULT_RATING_PREFERENCES;

  // Merge preferences
  const updatedPrefs: UserRatingPreferences = {
    ...currentPrefs,
    ...preferences,
  };

  // Validate increment is one of the allowed values
  const validIncrements = [0.1, 0.5, 1];
  if (!validIncrements.includes(updatedPrefs.rating_increment)) {
    updatedPrefs.rating_increment = 0.5;
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      rating_preferences: updatedPrefs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return handleActionError(updateError, "updateRatingPreferences");
  }

  revalidatePath("/profile/settings/ratings");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Get user rating preferences
 */
export async function getRatingPreferences(): Promise<GetRatingPreferencesResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("users")
    .select("rating_preferences")
    .eq("id", user.id)
    .single();

  if (error) {
    return handleActionError(error, "getRatingPreferences");
  }

  const prefs = (data?.rating_preferences as UserRatingPreferences) || DEFAULT_RATING_PREFERENCES;

  return { data: prefs };
}

/**
 * Get current user's privacy settings
 */
export async function getUserPrivacySettings(): Promise<{
  showProfilePopup: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { showProfilePopup: true, error: "You must be signed in" };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { showProfilePopup: true, error: "Failed to fetch privacy settings" };
  }

  const socialLinks = (profile.social_links as Record<string, unknown>) || {};
  const showProfilePopup = (socialLinks.show_profile_popup as boolean) ?? true;

  return { showProfilePopup };
}

/**
 * Get target user's privacy settings
 */
export async function getTargetUserPrivacySettings(targetUserId: string): Promise<{
  showProfilePopup: boolean;
}> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", targetUserId)
    .single();

  if (!profile) {
    return { showProfilePopup: true };
  }

  const socialLinks = (profile.social_links as Record<string, unknown>) || {};
  const showProfilePopup = (socialLinks.show_profile_popup as boolean) ?? true;

  return { showProfilePopup };
}
