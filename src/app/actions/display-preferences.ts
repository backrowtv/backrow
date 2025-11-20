"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DEFAULT_THEME_PREFERENCES,
  type DateFormat,
  type DisplayPreferences,
  type ThemePreferences,
} from "@/lib/display-preferences-constants";

/**
 * Get the current user's display preferences
 */
export async function getDisplayPreferences(): Promise<DisplayPreferences> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return DEFAULT_DISPLAY_PREFERENCES;
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("social_links")
      .eq("id", user.id)
      .single();

    if (error || !userData?.social_links) {
      return DEFAULT_DISPLAY_PREFERENCES;
    }

    const socialLinks = userData.social_links as Record<string, unknown>;
    const displayPrefs = socialLinks.display_preferences as Partial<DisplayPreferences> | undefined;

    if (!displayPrefs) {
      return DEFAULT_DISPLAY_PREFERENCES;
    }

    return {
      timeFormat: displayPrefs.timeFormat === "24h" ? "24h" : "12h",
      dateFormat: ["MDY", "DMY", "YMD"].includes(displayPrefs.dateFormat || "")
        ? (displayPrefs.dateFormat as DateFormat)
        : "MDY",
    };
  } catch (error) {
    console.error("Error fetching display preferences:", error);
    return DEFAULT_DISPLAY_PREFERENCES;
  }
}

/**
 * Update the current user's display preferences
 */
export async function updateDisplayPreferences(
  preferences: Partial<DisplayPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate time format
    if (preferences.timeFormat && !["12h", "24h"].includes(preferences.timeFormat)) {
      return { success: false, error: "Invalid time format" };
    }

    // Validate date format
    if (preferences.dateFormat && !["MDY", "DMY", "YMD"].includes(preferences.dateFormat)) {
      return { success: false, error: "Invalid date format" };
    }

    // Get current social_links to merge
    const { data: userData } = await supabase
      .from("users")
      .select("social_links")
      .eq("id", user.id)
      .single();

    const currentSocialLinks = (userData?.social_links as Record<string, unknown>) || {};
    const currentDisplayPrefs =
      (currentSocialLinks.display_preferences as DisplayPreferences) || DEFAULT_DISPLAY_PREFERENCES;

    const newSocialLinks = {
      ...currentSocialLinks,
      display_preferences: {
        ...currentDisplayPrefs,
        ...preferences,
      },
    };

    const { error } = await supabase
      .from("users")
      .update({ social_links: newSocialLinks })
      .eq("id", user.id);

    if (error) {
      const result = handleActionError(error, { action: "updateDisplayPreferences" });
      return { success: false, error: result.error };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    const result = handleActionError(error, { action: "updateDisplayPreferences" });
    return { success: false, error: result.error };
  }
}

/**
 * Get the current user's theme preferences from the database
 */
export async function getThemePreferences(): Promise<ThemePreferences> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return DEFAULT_THEME_PREFERENCES;
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("social_links")
      .eq("id", user.id)
      .single();

    if (error || !userData?.social_links) {
      return DEFAULT_THEME_PREFERENCES;
    }

    const socialLinks = userData.social_links as Record<string, unknown>;
    const themePrefs = socialLinks.theme_preferences as Partial<ThemePreferences> | undefined;

    if (!themePrefs) {
      return DEFAULT_THEME_PREFERENCES;
    }

    return {
      theme: themePrefs.theme === "light" ? "light" : "dark",
      colorTheme: typeof themePrefs.colorTheme === "string" ? themePrefs.colorTheme : "default",
    };
  } catch (error) {
    console.error("Error fetching theme preferences:", error);
    return DEFAULT_THEME_PREFERENCES;
  }
}

/**
 * Update the current user's theme preferences in the database
 */
export async function updateThemePreferences(
  preferences: Partial<ThemePreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current social_links to merge
    const { data: userData } = await supabase
      .from("users")
      .select("social_links")
      .eq("id", user.id)
      .single();

    const currentSocialLinks = (userData?.social_links as Record<string, unknown>) || {};
    const currentThemePrefs =
      (currentSocialLinks.theme_preferences as ThemePreferences) || DEFAULT_THEME_PREFERENCES;

    const newSocialLinks = {
      ...currentSocialLinks,
      theme_preferences: {
        ...currentThemePrefs,
        ...preferences,
      },
    };

    const { error } = await supabase
      .from("users")
      .update({ social_links: newSocialLinks })
      .eq("id", user.id);

    if (error) {
      const result = handleActionError(error, { action: "updateThemePreferences" });
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    const result = handleActionError(error, { action: "updateThemePreferences" });
    return { success: false, error: result.error };
  }
}
