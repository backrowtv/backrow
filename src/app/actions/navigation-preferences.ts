"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateUser } from "@/lib/cache/invalidate";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { handleActionError } from "@/lib/errors/handler";
import {
  VALID_NAV_ITEMS,
  SIDEBAR_NAV_ITEMS,
  DEFAULT_NAV_PREFERENCES,
  DEFAULT_SIDEBAR_PREFERENCES,
  MOVIE_LINK_TYPES,
  DEFAULT_VISIBLE_MOVIE_LINKS,
  type NavItemId,
  type SidebarNavItemId,
  type MobileNavPreferences,
  type SidebarNavPreferences,
  type MovieLinkPreferences,
} from "@/lib/navigation-constants";

/**
 * Get the current user's mobile nav preferences
 */
export async function getNavPreferences(): Promise<MobileNavPreferences> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return DEFAULT_NAV_PREFERENCES;
  }

  const { data: userData, error } = await supabase
    .from("users")
    .select("mobile_nav_preferences")
    .eq("id", user.id)
    .single();

  if (error || !userData?.mobile_nav_preferences) {
    return DEFAULT_NAV_PREFERENCES;
  }

  // Validate and return preferences
  const prefs = userData.mobile_nav_preferences as MobileNavPreferences;

  // Ensure all items are valid
  const validItems = (prefs.items || []).filter((item) =>
    VALID_NAV_ITEMS.includes(item as NavItemId)
  ) as NavItemId[];

  // Ensure count is valid (3-5)
  const itemCount = Math.max(3, Math.min(5, prefs.itemCount || validItems.length));

  return {
    items: validItems.length >= 3 ? validItems.slice(0, itemCount) : DEFAULT_NAV_PREFERENCES.items,
    itemCount,
    favoriteClubId: prefs.favoriteClubId || null,
    hideLabels: prefs.hideLabels ?? false,
    menuPosition: prefs.menuPosition ?? "right",
  };
}

/**
 * Update the current user's mobile nav preferences
 */
export async function updateNavPreferences(
  preferences: Partial<MobileNavPreferences>
): Promise<{ success: boolean; error?: string }> {
  const rateCheck = await actionRateLimit("updateNavPreferences", { limit: 30, windowMs: 60_000 });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { success: false, error: verified.error };

  // Validate items
  if (preferences.items) {
    const invalidItems = preferences.items.filter((item) => !VALID_NAV_ITEMS.includes(item));
    if (invalidItems.length > 0) {
      return { success: false, error: `Invalid nav items: ${invalidItems.join(", ")}` };
    }

    // Ensure 3-5 items
    if (preferences.items.length < 3 || preferences.items.length > 5) {
      return { success: false, error: "Must have between 3 and 5 nav items" };
    }
  }

  // Validate itemCount
  if (preferences.itemCount !== undefined) {
    if (preferences.itemCount < 3 || preferences.itemCount > 5) {
      return { success: false, error: "Item count must be between 3 and 5" };
    }
  }

  // Validate menuPosition
  if (preferences.menuPosition !== undefined) {
    if (!["left", "right"].includes(preferences.menuPosition)) {
      return { success: false, error: 'Menu position must be "left" or "right"' };
    }
  }

  // If favorite_club is in items, validate the club exists and user has access.
  // club_members uses a composite primary key (club_id, user_id) and has no
  // `id` column — selecting non-existent columns silently nulls the result,
  // which previously rejected producers even when they owned the club.
  if (preferences.items?.includes("favorite_club") && preferences.favoriteClubId) {
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("club_id", preferences.favoriteClubId)
      .maybeSingle();

    const { data: club } = await supabase
      .from("clubs")
      .select("producer_id")
      .eq("id", preferences.favoriteClubId)
      .maybeSingle();

    const isMember = !!membership;
    const isProducer = club?.producer_id === user.id;

    if (!isMember && !isProducer) {
      return { success: false, error: "You must be a member of the club to add it to navigation" };
    }
  }

  // Get current preferences to merge
  const currentPrefs = await getNavPreferences();
  const newPrefs: MobileNavPreferences = {
    ...currentPrefs,
    ...preferences,
    itemCount: preferences.itemCount ?? preferences.items?.length ?? currentPrefs.itemCount,
  };

  const { error } = await supabase
    .from("users")
    .update({ mobile_nav_preferences: newPrefs })
    .eq("id", user.id);

  if (error) {
    return { success: false, ...handleActionError(error, "updateNavPreferences") };
  }

  invalidateUser(user.id);
  return { success: true };
}

export async function resetNavPreferences(): Promise<{ success: boolean; error?: string }> {
  const rateCheck = await actionRateLimit("resetNavPreferences", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { success: false, error: verified.error };

  const { error } = await supabase
    .from("users")
    .update({ mobile_nav_preferences: null })
    .eq("id", user.id);

  if (error) {
    return { success: false, ...handleActionError(error, "resetNavPreferences") };
  }

  invalidateUser(user.id);
  return { success: true };
}

/**
 * Get user's favorited clubs for the favorite club nav selector
 * Only returns clubs the user has explicitly favorited (starred)
 */
export async function getUserClubsForNav(): Promise<
  Array<{ id: string; name: string; slug: string | null }>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  // Get clubs user has favorited (starred)
  const { data: favorites } = await supabase
    .from("favorite_clubs")
    .select("club_id")
    .eq("user_id", user.id);

  if (!favorites || favorites.length === 0) {
    return [];
  }

  const clubIds = favorites.map((f) => f.club_id);
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .in("id", clubIds)
    .eq("archived", false)
    .order("name");

  return clubs || [];
}

/**
 * Get the current user's sidebar nav preferences (desktop)
 */
export async function getSidebarPreferences(): Promise<SidebarNavPreferences> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return DEFAULT_SIDEBAR_PREFERENCES;
  }

  const { data: userData, error } = await supabase
    .from("users")
    .select("sidebar_nav_preferences")
    .eq("id", user.id)
    .single();

  if (error || !userData?.sidebar_nav_preferences) {
    return DEFAULT_SIDEBAR_PREFERENCES;
  }

  const prefs = userData.sidebar_nav_preferences as SidebarNavPreferences;

  // Validate items - must include all sidebar items (can't remove, only reorder)
  const validItems = (prefs.itemOrder || []).filter((item) =>
    SIDEBAR_NAV_ITEMS.includes(item as SidebarNavItemId)
  ) as SidebarNavItemId[];

  // Ensure all items are present (in case new items were added)
  const missingItems = SIDEBAR_NAV_ITEMS.filter((item) => !validItems.includes(item));
  const completeOrder = [...validItems, ...missingItems];

  return {
    itemOrder:
      completeOrder.length === SIDEBAR_NAV_ITEMS.length
        ? completeOrder
        : DEFAULT_SIDEBAR_PREFERENCES.itemOrder,
  };
}

/**
 * Update the current user's sidebar nav preferences (desktop)
 */
export async function updateSidebarPreferences(
  preferences: Partial<SidebarNavPreferences>
): Promise<{ success: boolean; error?: string }> {
  const rateCheck = await actionRateLimit("updateSidebarPreferences", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { success: false, error: verified.error };

  // Validate itemOrder
  if (preferences.itemOrder) {
    // Must contain all sidebar items
    const hasAllItems = SIDEBAR_NAV_ITEMS.every((item) => preferences.itemOrder!.includes(item));
    if (!hasAllItems) {
      return { success: false, error: "Must include all sidebar items" };
    }

    // Must only contain valid items
    const invalidItems = preferences.itemOrder.filter(
      (item) => !SIDEBAR_NAV_ITEMS.includes(item as SidebarNavItemId)
    );
    if (invalidItems.length > 0) {
      return { success: false, error: `Invalid sidebar items: ${invalidItems.join(", ")}` };
    }

    // Must not have duplicates
    const uniqueItems = new Set(preferences.itemOrder);
    if (uniqueItems.size !== preferences.itemOrder.length) {
      return { success: false, error: "Duplicate items not allowed" };
    }
  }

  // Get current preferences to merge
  const currentPrefs = await getSidebarPreferences();
  const newPrefs: SidebarNavPreferences = {
    ...currentPrefs,
    ...preferences,
  };

  const { error } = await supabase
    .from("users")
    .update({ sidebar_nav_preferences: newPrefs })
    .eq("id", user.id);

  if (error) {
    return { success: false, ...handleActionError(error, "updateSidebarPreferences") };
  }

  invalidateUser(user.id);
  return { success: true };
}

export async function resetSidebarPreferences(): Promise<{ success: boolean; error?: string }> {
  const rateCheck = await actionRateLimit("resetSidebarPreferences", {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { success: false, error: verified.error };

  const { error } = await supabase
    .from("users")
    .update({ sidebar_nav_preferences: null })
    .eq("id", user.id);

  if (error) {
    return { success: false, ...handleActionError(error, "resetSidebarPreferences") };
  }

  invalidateUser(user.id);
  return { success: true };
}

/**
 * Get the current user's movie link preferences (which external links to show on movie pages)
 */
export async function getMovieLinkPreferences(): Promise<MovieLinkPreferences> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { visibleLinks: DEFAULT_VISIBLE_MOVIE_LINKS };
  }

  const { data: userData, error } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  if (error || !userData?.social_links) {
    return { visibleLinks: DEFAULT_VISIBLE_MOVIE_LINKS };
  }

  const socialLinks = userData.social_links as Record<string, unknown>;
  const movieLinkPrefs = socialLinks.movie_link_preferences as MovieLinkPreferences | undefined;

  if (!movieLinkPrefs?.visibleLinks) {
    return { visibleLinks: DEFAULT_VISIBLE_MOVIE_LINKS };
  }

  // Validate and return preferences — an empty array means user explicitly hid all links
  const validLinks = movieLinkPrefs.visibleLinks.filter((link) => MOVIE_LINK_TYPES.includes(link));

  return { visibleLinks: validLinks };
}

/**
 * Update the current user's movie link preferences
 */
export async function updateMovieLinkPreferences(
  preferences: MovieLinkPreferences
): Promise<{ success: boolean; error?: string }> {
  const rateCheck = await actionRateLimit("updateMovieLinkPreferences", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { success: false, error: verified.error };

  // Validate that all links are valid types
  const invalidLinks = preferences.visibleLinks.filter((link) => !MOVIE_LINK_TYPES.includes(link));
  if (invalidLinks.length > 0) {
    return { success: false, error: `Invalid link types: ${invalidLinks.join(", ")}` };
  }

  // Get current social_links to merge
  const { data: userData } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  const currentSocialLinks = (userData?.social_links as Record<string, unknown>) || {};

  const newSocialLinks = {
    ...currentSocialLinks,
    movie_link_preferences: preferences,
  };

  const { error } = await supabase
    .from("users")
    .update({ social_links: newSocialLinks })
    .eq("id", user.id);

  if (error) {
    return { success: false, ...handleActionError(error, "updateMovieLinkPreferences") };
  }

  invalidateUser(user.id);
  return { success: true };
}

export async function resetMovieLinkPreferences(): Promise<{ success: boolean; error?: string }> {
  const rateCheck = await actionRateLimit("resetMovieLinkPreferences", {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { success: false, error: verified.error };

  // Get current social_links and remove movie_link_preferences
  const { data: userData } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .single();

  const currentSocialLinks = (userData?.social_links as Record<string, unknown>) || {};

  const { movie_link_preferences: _, ...restSocialLinks } = currentSocialLinks;

  const { error } = await supabase
    .from("users")
    .update({ social_links: restSocialLinks })
    .eq("id", user.id);

  if (error) {
    return { success: false, ...handleActionError(error, "resetMovieLinkPreferences") };
  }

  invalidateUser(user.id);
  return { success: true };
}
