"use server";

/**
 * Profile Management Actions
 *
 * Functions for managing user profiles.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache/invalidate";
import { getSharp } from "@/lib/image/sharp-loader";
import { handleActionError } from "@/lib/errors/handler";
import { enqueueImageProcessing } from "@/lib/jobs/producers";

export async function updateProfile(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to update your profile" };
  }

  const displayName = formData.get("display_name") as string | null;
  const bio = formData.get("bio") as string | null;
  const avatarFile = formData.get("avatar") as File | null;
  const defaultAvatarIndexStr = formData.get("default_avatar_index") as string | null;
  // New avatar icon + color fields
  const avatarIcon = formData.get("avatar_icon") as string | null;
  const avatarColorIndexStr = formData.get("avatar_color_index") as string | null;
  const avatarBorderColorIndexStr = formData.get("avatar_border_color_index") as string | null;
  const watchHistoryPrivate = formData.get("watch_history_private") === "on";
  const favoriteGenresJson = formData.get("favorite_genres") as string | null;
  const socialLinksJson = formData.get("social_links_json") as string | null;
  const favoriteClubId = formData.get("favorite_club_id") as string | null;
  const favoriteMovieIdStr = formData.get("favorite_movie_tmdb_id") as string | null;
  // DB columns kept as-is: director_tmdb_id=person1, composer_tmdb_id=person2, actor_tmdb_id=person3
  const favoriteDirectorIdStr = formData.get("favorite_director_tmdb_id") as string | null;
  const favoriteComposerIdStr = formData.get("favorite_composer_tmdb_id") as string | null;
  const allowPublicProfileStr = formData.get("allow_public_profile") as string | null;
  // Watch settings fields (for partial updates)
  const watchProviderRegion = formData.get("watch_provider_region") as string | null;
  const showWatchProvidersStr = formData.get("show_watch_providers") as string | null;
  const hiddenProvidersJson = formData.get("hidden_providers") as string | null;

  // Suppress unused variable warning - favoriteClubId is read but not used
  void favoriteClubId;

  // Check if this is a partial update (only updating specific settings, not core profile fields)
  // Partial updates include: watch settings, social links only, linked accounts visibility
  const isPartialUpdate =
    !displayName &&
    (watchProviderRegion !== null ||
      showWatchProvidersStr !== null ||
      hiddenProvidersJson !== null ||
      socialLinksJson !== null);

  // Validate display name (only if provided or not a partial update)
  if (!isPartialUpdate) {
    if (!displayName || displayName.trim().length < 2) {
      return { error: "Display name must be at least 2 characters" };
    }

    if (displayName.length > 50) {
      return { error: "Display name must be less than 50 characters" };
    }

    // Check 6-month cooldown on display name changes
    const { data: currentUserProfile } = await supabase
      .from("users")
      .select("display_name, last_display_name_change")
      .eq("id", user.id)
      .maybeSingle();

    const trimmedName = displayName.trim();
    if (
      currentUserProfile &&
      currentUserProfile.display_name !== trimmedName &&
      currentUserProfile.last_display_name_change
    ) {
      const lastChange = new Date(currentUserProfile.last_display_name_change);
      const sixMonthsLater = new Date(lastChange);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      if (new Date() < sixMonthsLater) {
        const nextChangeDate = sixMonthsLater.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return {
          error: `You can only change your username once every 6 months. You can change it again on ${nextChangeDate}.`,
        };
      }
    }
  }

  // Validate quote/motto
  if (bio && bio.length > 100) {
    return { error: "Quote / motto must be 100 characters or less" };
  }

  // Handle avatar upload if provided
  let avatarUrl: string | null = null;
  if (avatarFile && avatarFile.size > 0) {
    // Validate file size (15MB = 15 * 1024 * 1024 bytes)
    const maxSize = 15 * 1024 * 1024;
    if (avatarFile.size > maxSize) {
      return { error: "Avatar file size must be less than 15MB" };
    }

    // Validate file type - support HEIC/HEIF for iOS and handle empty type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"];

    // Get file extension from filename (mobile browsers sometimes don't set type)
    const fileExtension = avatarFile.name
      ? "." + avatarFile.name.split(".").pop()?.toLowerCase()
      : "";
    const hasValidType = avatarFile.type && allowedTypes.includes(avatarFile.type.toLowerCase());
    const hasValidExtension = allowedExtensions.includes(fileExtension);

    if (!hasValidType && !hasValidExtension) {
      return { error: "Avatar must be an image file (JPEG, PNG, GIF, WebP, or HEIC)" };
    }

    try {
      // Get current user profile to check for existing avatar
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (currentProfileError) {
        handleActionError(currentProfileError, { action: "updateProfile", silent: true });
        // Continue - avatar upload can still proceed
      }

      // Delete old avatar if it exists
      if (currentProfile?.avatar_url) {
        // Extract filename from full URL (format: .../avatars/filename)
        const urlParts = currentProfile.avatar_url.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "avatars");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          const oldAvatarPath = urlParts[filenameIndex + 1];
          // Try to delete old avatar (ignore errors if file doesn't exist)
          try {
            await supabase.storage.from("avatars").remove([oldAvatarPath]);
          } catch {
            // Ignore errors - file might not exist
          }
        }
      }

      // Check if file is HEIF/HEIC (iPhone format) - needs conversion for browser compatibility
      const originalExt = avatarFile.name.split(".").pop()?.toLowerCase() || "";
      const isHeif =
        ["heic", "heif"].includes(originalExt) ||
        ["image/heic", "image/heif"].includes(avatarFile.type?.toLowerCase() || "");

      let uploadBuffer: Buffer;
      let finalExt: string;
      let contentType: string;

      if (isHeif) {
        // Convert HEIF/HEIC to JPEG using sharp (browsers don't support HEIF)
        const arrayBuffer = await avatarFile.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        const sharp = await getSharp();
        uploadBuffer = await sharp(inputBuffer).jpeg({ quality: 90 }).toBuffer();

        finalExt = "jpg";
        contentType = "image/jpeg";
      } else {
        // Use original file as-is
        const arrayBuffer = await avatarFile.arrayBuffer();
        uploadBuffer = Buffer.from(arrayBuffer);
        finalExt = originalExt;
        contentType = avatarFile.type || "application/octet-stream";
      }

      // Generate unique filename with correct extension
      const fileName = `${user.id}-${Date.now()}.${finalExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, uploadBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType,
        });

      if (uploadError) {
        // Check if bucket doesn't exist
        if (
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("not found")
        ) {
          return {
            error:
              'Storage bucket "avatars" does not exist. Please create it in Supabase Dashboard → Storage.',
          };
        }
        return handleActionError(uploadError, { action: "updateProfile" });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        avatarUrl = urlData.publicUrl;
      }

      // Offload the 1024×1024 mozjpeg resize to the image-processing worker;
      // the request returns as soon as the raw upload lands. The worker
      // overwrites the same storage path, so the URL is stable.
      await enqueueImageProcessing({
        variant: "user-avatar",
        bucket: "avatars",
        rawPath: filePath,
        ownerId: user.id,
      });
    } catch (error) {
      return handleActionError(error, { action: "updateProfile" });
    }
  }

  // Handle default avatar selection
  // If default avatar is selected and no file is uploaded, generate avatar URL
  let defaultAvatarUrl: string | null = null;
  if (defaultAvatarIndexStr && !avatarFile) {
    const avatarIndex = parseInt(defaultAvatarIndexStr, 10);
    if (!isNaN(avatarIndex) && avatarIndex >= 0 && avatarIndex < 8) {
      // Generate a deterministic avatar URL based on user ID and index
      // This will be handled client-side by the Avatar component using initials
      // For now, we'll set avatar_url to null and let the Avatar component handle it
      // But we could store the index in social_links for reference
      defaultAvatarUrl = null; // Will be handled by Avatar component with initials
    }
  }

  // Suppress unused variable warning
  void defaultAvatarUrl;

  // Prepare update object - using proper columns instead of social_links JSON
  const updateData: {
    display_name?: string;
    bio?: string | null;
    avatar_url?: string | null;
    favorite_movie_tmdb_id?: number | null;
    favorite_director_tmdb_id?: number | null;
    favorite_composer_tmdb_id?: number | null;
    allow_public_profile?: boolean;
    // Avatar settings - proper columns
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    // Privacy/preferences - proper columns
    watch_history_private?: boolean;
    watch_provider_region?: string;
    show_watch_providers?: boolean;
    hidden_providers?: number[] | null;
    favorite_genres?: string[] | null;
    show_profile_popup?: boolean;
    // social_links now only for ACTUAL social links (Twitter, Letterboxd, etc.)
    social_links?: Record<string, unknown>;
    last_display_name_change?: string;
  } = {};

  // Only include display_name and bio if not a watch-settings-only update
  if (!isPartialUpdate) {
    const trimmedName = displayName!.trim();
    updateData.display_name = trimmedName;
    updateData.bio = bio?.trim() || null;

    // Track display name change timestamp for 6-month cooldown
    // currentUserProfile was fetched during validation above
    const { data: nameCheckProfile } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    if (nameCheckProfile && nameCheckProfile.display_name !== trimmedName) {
      updateData.last_display_name_change = new Date().toISOString();
    }
  }

  // Add favorite IDs only if explicitly provided in form data
  // Don't clear if not in form - the display case editor manages these via dedicated server actions
  // DB columns: favorite_director_tmdb_id=person1, favorite_composer_tmdb_id=person2
  if (favoriteMovieIdStr && favoriteMovieIdStr.trim()) {
    updateData.favorite_movie_tmdb_id = parseInt(favoriteMovieIdStr, 10) || null;
  }

  if (favoriteDirectorIdStr && favoriteDirectorIdStr.trim()) {
    updateData.favorite_director_tmdb_id = parseInt(favoriteDirectorIdStr, 10) || null;
  }

  if (favoriteComposerIdStr && favoriteComposerIdStr.trim()) {
    updateData.favorite_composer_tmdb_id = parseInt(favoriteComposerIdStr, 10) || null;
  }

  // Add avatar URL if uploaded, or clear if default avatar selected
  if (avatarUrl !== null) {
    updateData.avatar_url = avatarUrl;
  } else if ((defaultAvatarIndexStr || avatarIcon) && !avatarFile?.size) {
    // If default avatar selected (old or new picker) and no file uploaded, clear avatar_url
    // This allows the icon+color picker to take effect
    updateData.avatar_url = null;
  }

  // Parse avatar color indices
  const avatarColorIndex = avatarColorIndexStr ? parseInt(avatarColorIndexStr, 10) : undefined;
  const avatarBorderColorIndex = avatarBorderColorIndexStr
    ? parseInt(avatarBorderColorIndexStr, 10)
    : undefined;

  // Parse hidden providers if provided
  let hiddenProviders: number[] | undefined;
  if (hiddenProvidersJson) {
    try {
      hiddenProviders = JSON.parse(hiddenProvidersJson) as number[];
    } catch {
      // Ignore parse errors
    }
  }

  // Parse favorite genres if provided
  let favoriteGenres: string[] | undefined;
  if (favoriteGenresJson) {
    try {
      const parsed = JSON.parse(favoriteGenresJson) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        favoriteGenres = parsed;
      }
    } catch (parseError) {
      handleActionError(parseError, { action: "updateProfile", silent: true });
    }
  }

  // ============================================
  // SET PROPER COLUMN VALUES (not JSON!)
  // ============================================

  // Avatar settings - write to proper columns
  if (avatarIcon !== null) {
    updateData.avatar_icon = avatarIcon;
  }
  if (avatarColorIndex !== undefined && !isNaN(avatarColorIndex)) {
    updateData.avatar_color_index = avatarColorIndex;
  }
  if (avatarBorderColorIndex !== undefined && !isNaN(avatarBorderColorIndex)) {
    updateData.avatar_border_color_index = avatarBorderColorIndex;
  }

  // Privacy/preferences - write to proper columns
  if (!isPartialUpdate) {
    updateData.watch_history_private = watchHistoryPrivate;
  }
  if (watchProviderRegion !== null) {
    updateData.watch_provider_region = watchProviderRegion;
  }
  if (showWatchProvidersStr !== null) {
    updateData.show_watch_providers = showWatchProvidersStr === "true";
  }
  if (hiddenProviders !== undefined) {
    updateData.hidden_providers = hiddenProviders;
  }
  if (favoriteGenres !== undefined) {
    updateData.favorite_genres = favoriteGenres;
  }
  // Handle ACTUAL social links (Twitter, Letterboxd, etc.) - only this stays in JSON
  if (socialLinksJson) {
    try {
      const parsed = JSON.parse(socialLinksJson) as Record<string, unknown>;
      // Get current social_links to merge
      const { data: currentUser } = await supabase
        .from("users")
        .select("social_links")
        .eq("id", user.id)
        .maybeSingle();
      const currentSocialLinks = (currentUser?.social_links as Record<string, unknown>) || {};

      // Only keep actual social link fields (not settings that moved to columns)
      const socialLinkFields = [
        "twitter",
        "letterboxd",
        "instagram",
        "discord",
        "website",
        "imdb",
        "trakt",
      ];
      const cleanSocialLinks: Record<string, unknown> = {};
      for (const field of socialLinkFields) {
        if (parsed[field] !== undefined) {
          cleanSocialLinks[field] = parsed[field];
        } else if (currentSocialLinks[field] !== undefined) {
          cleanSocialLinks[field] = currentSocialLinks[field];
        }
      }
      if (Object.keys(cleanSocialLinks).length > 0) {
        updateData.social_links = cleanSocialLinks;
      }
    } catch (parseError) {
      handleActionError(parseError, { action: "updateProfile", silent: true });
    }
  }

  // Handle allow_public_profile if provided
  if (allowPublicProfileStr !== null) {
    updateData.allow_public_profile = allowPublicProfileStr === "true";
  }

  // Update user profile
  const { error: updateError } = await supabase.from("users").update(updateData).eq("id", user.id);

  if (updateError) {
    return handleActionError(updateError, "updateProfile");
  }

  // Note: Favorite clubs are managed separately via toggleFavoriteClub() in clubs/membership.ts
  // and navigation preferences are managed via updateNavPreferences() in navigation-preferences.ts

  // Revalidate profile pages
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/");

  return { success: true, message: "Profile updated successfully" };
}

// ============================================
// CACHED QUERY HELPERS
// ============================================

/**
 * Get user profile (cached for 5 minutes)
 */
export async function getUserProfile(userId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.user(userId));

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("users")
    .select(
      `
      id, email, username, display_name, avatar_url, bio, social_links,
      email_verified, created_at, updated_at,
      favorite_movie_tmdb_id, favorite_director_tmdb_id, favorite_composer_tmdb_id,
      sidebar_nav_preferences, mobile_nav_preferences, rating_preferences,
      favorite_actor_tmdb_id, accessibility_preferences,
      avatar_icon, avatar_color_index, avatar_border_color_index,
      watch_history_private, watch_provider_region, show_watch_providers,
      hidden_providers, favorite_genres,
      show_profile_popup, featured_badge_ids, id_card_settings,
      clubs_count, movies_watched_count, allow_public_profile
    `
    )
    .eq("id", userId)
    .single();

  if (error) {
    handleActionError(error, { action: "getUserProfile", silent: true });
    return null;
  }

  return profile;
}
