"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import {
  DEFAULT_DISCUSSION_PREFERENCES,
  type DiscussionPreferences,
} from "@/lib/discussion-preferences";

/**
 * Get the current user's discussion preferences
 */
export async function getDiscussionPreferences(): Promise<DiscussionPreferences> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return DEFAULT_DISCUSSION_PREFERENCES;
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("discussion_preferences")
      .eq("id", user.id)
      .single();

    if (error || !userData?.discussion_preferences) {
      return DEFAULT_DISCUSSION_PREFERENCES;
    }

    const prefs = userData.discussion_preferences as Partial<DiscussionPreferences>;

    return {
      collapseOnTap: prefs.collapseOnTap ?? DEFAULT_DISCUSSION_PREFERENCES.collapseOnTap,
      collapseOnUpvote: prefs.collapseOnUpvote ?? DEFAULT_DISCUSSION_PREFERENCES.collapseOnUpvote,
    };
  } catch (error) {
    console.error("Error fetching discussion preferences:", error);
    return DEFAULT_DISCUSSION_PREFERENCES;
  }
}

/**
 * Update the current user's discussion preferences
 */
export async function updateDiscussionPreferences(
  preferences: Partial<DiscussionPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current preferences to merge
    const { data: userData } = await supabase
      .from("users")
      .select("discussion_preferences")
      .eq("id", user.id)
      .single();

    const currentPrefs =
      (userData?.discussion_preferences as DiscussionPreferences) || DEFAULT_DISCUSSION_PREFERENCES;

    const newPrefs = {
      ...currentPrefs,
      ...preferences,
    };

    const { error } = await supabase
      .from("users")
      .update({ discussion_preferences: newPrefs })
      .eq("id", user.id);

    if (error) {
      const result = handleActionError(error, { action: "updateDiscussionPreferences" });
      return { success: false, error: result.error };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    const result = handleActionError(error, { action: "updateDiscussionPreferences" });
    return { success: false, error: result.error };
  }
}
