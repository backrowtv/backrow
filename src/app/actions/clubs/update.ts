"use server";

/**
 * Club Update Action
 *
 * Server action for updating existing clubs.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateClub } from "@/lib/cache/invalidate";
import { logClubActivity } from "@/lib/activity/logger";
import { handleActionError } from "@/lib/errors/handler";
import { validateGenres } from "@/lib/genres/constants";
import { getClubSlug } from "./_helpers";
import { createNotificationsForUsers } from "../notifications";

/**
 * Update an existing club
 */
export async function updateClub(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const clubId = formData.get("clubId") as string;
  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;
  const privacy = formData.get("privacy") as string | null;
  const themeColor = formData.get("theme_color") as string | null;
  // Checkbox sends 'on' when checked, hidden input sends 'off' when unchecked
  const themeSubmissionsLockedValue = formData.get("themeSubmissionsLocked");
  const themeSubmissionsLocked = themeSubmissionsLockedValue === "on";
  // New avatar icon + color fields (stored in settings)
  const avatarIcon = formData.get("avatar_icon") as string | null;
  const avatarColorIndexStr = formData.get("avatar_color_index") as string | null;
  const avatarBorderColorIndexStr = formData.get("avatar_border_color_index") as string | null;
  const genresJson = formData.get("genres") as string | null;

  if (!clubId) {
    return { error: "Club ID is required" };
  }

  // Get current club to check existing privacy
  const { data: currentClub, error: currentClubError } = await supabase
    .from("clubs")
    .select(
      "name, privacy, theme_submissions_locked, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .eq("id", clubId)
    .single();

  if (currentClubError || !currentClub) {
    return { error: "Club not found" };
  }

  // Check user's role (must be producer or director)
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to edit this club" };
  }

  // Check if user is producer (only producer can upload/change club picture)
  const isProducer = membership.role === "producer";

  // Validate inputs
  if (name && name.trim().length < 3) {
    return { error: "Club name must be at least 3 characters" };
  }

  if (name && name.length > 30) {
    return { error: "Club name must be less than 30 characters" };
  }

  const validPrivacyLevels = ["public_open", "public_moderated", "private"];
  if (privacy && !validPrivacyLevels.includes(privacy)) {
    return { error: "Invalid privacy level" };
  }

  // Check name uniqueness if name is being changed
  if (name) {
    const { data: existingClub, error: existingClubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("name", name.trim())
      .neq("id", clubId)
      .maybeSingle();

    if (existingClubError) {
      return { error: existingClubError.message };
    }

    if (existingClub) {
      return { error: "A club with this name already exists" };
    }
  }

  // Handle picture upload if provided (producer only)
  let pictureUrl: string | null = null;
  const pictureFile = formData.get("picture") as File | null;

  if (pictureFile && pictureFile.size > 0) {
    // Only producer can upload/change club picture
    if (!isProducer) {
      return { error: "Only the club producer can upload or change the club picture" };
    }

    // Validate file size (15MB = 15 * 1024 * 1024 bytes)
    const maxSize = 15 * 1024 * 1024;
    if (pictureFile.size > maxSize) {
      return { error: "Picture file size must be less than 15MB" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(pictureFile.type)) {
      return { error: "Picture must be an image file (JPEG, PNG, GIF, or WebP)" };
    }

    try {
      // Delete old picture if it exists
      if (currentClub.picture_url) {
        // Extract filename from full URL (format: .../club-pictures/filename)
        const urlParts = currentClub.picture_url.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "club-pictures");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          const oldPicturePath = urlParts[filenameIndex + 1];
          // Try to delete old picture (ignore errors if file doesn't exist)
          try {
            await supabase.storage.from("club-pictures").remove([oldPicturePath]);
          } catch {
            // Ignore errors - file might not exist
          }
        }
      }

      // Generate unique filename
      const fileExt = pictureFile.name.split(".").pop();
      const fileName = `${clubId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("club-pictures")
        .upload(filePath, pictureFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        handleActionError(uploadError, {
          action: "updateClub",
          metadata: { step: "pictureUpload" },
          silent: true,
        });
        // Check if bucket doesn't exist
        if (
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("not found")
        ) {
          return {
            error:
              'Storage bucket "club-pictures" does not exist. Please create it in Supabase Dashboard → Storage.',
          };
        }
        return { error: `Failed to upload picture: ${uploadError.message || "Please try again."}` };
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("club-pictures").getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        pictureUrl = urlData.publicUrl;
      }
    } catch (error) {
      return handleActionError(error, {
        action: "updateClub",
        metadata: { step: "pictureUpload" },
      });
    }
  }

  // Update club
  const updateData: {
    name?: string;
    description?: string | null;
    privacy?: string;
    theme_color?: string | null;
    theme_submissions_locked?: boolean;
    picture_url?: string | null;
    settings?: Record<string, unknown>;
    updated_at?: string;
    genres?: string[] | null;
    // Avatar columns (stored as proper columns, not in settings JSON)
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
  } = {};

  if (name) updateData.name = name.trim();
  // Always update description - formData.get() returns null if field doesn't exist
  // For editing forms, description field always exists (even if empty)
  // Check if description was actually provided in the form (not null)
  if (description !== null && description !== undefined) {
    // Trim and convert empty string to null
    const trimmedDescription = description.trim();
    updateData.description = trimmedDescription || null;
  }
  if (privacy) updateData.privacy = privacy;

  // Handle theme color
  if (themeColor !== undefined) {
    updateData.theme_color = themeColor || null;
  }

  // Handle theme submissions lock
  updateData.theme_submissions_locked = themeSubmissionsLocked;

  // Add picture URL if uploaded
  if (pictureUrl !== null) {
    updateData.picture_url = pictureUrl;
  }

  // Handle genres
  if (genresJson !== null) {
    try {
      const parsedGenres = JSON.parse(genresJson) as string[];
      const genreValidation = validateGenres(parsedGenres);
      if (!genreValidation.isValid) {
        return { error: genreValidation.errors.join(", ") };
      }
      updateData.genres =
        genreValidation.validGenres.length > 0 ? genreValidation.validGenres : null;
    } catch {
      return { error: "Invalid genres format" };
    }
  }

  // Handle avatar icon + color + border color (stored as proper columns, not settings JSON)
  const avatarColorIndex = avatarColorIndexStr ? parseInt(avatarColorIndexStr, 10) : undefined;
  const avatarBorderColorIndex = avatarBorderColorIndexStr
    ? parseInt(avatarBorderColorIndexStr, 10)
    : undefined;

  if (avatarIcon !== null) {
    updateData.avatar_icon = avatarIcon || null;
  }
  if (avatarColorIndex !== undefined && !isNaN(avatarColorIndex)) {
    updateData.avatar_color_index = avatarColorIndex;
  }
  if (avatarBorderColorIndex !== undefined && !isNaN(avatarBorderColorIndex)) {
    updateData.avatar_border_color_index = avatarBorderColorIndex;
  }

  // If using default avatar (icon + color), clear picture_url
  if (avatarIcon && pictureUrl === null) {
    updateData.picture_url = null;
  }

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase.from("clubs").update(updateData).eq("id", clubId);

  if (error) {
    return { error: error.message };
  }

  // Log and notify club members if the club name changed
  if (name && currentClub.name !== name.trim()) {
    // Log club activity
    await logClubActivity(clubId, "club_name_changed", {
      old_name: currentClub.name,
      new_name: name.trim(),
    });

    const { data: members } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .neq("user_id", user.id); // Don't notify the admin who made the change

    if (members && members.length > 0) {
      const clubSlugForLink = await getClubSlug(supabase, clubId);
      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id),
        type: "club_name_changed",
        title: "Club Renamed",
        message: `"${currentClub.name}" has been renamed to "${name.trim()}"`,
        link: `/club/${clubSlugForLink}`,
        clubId: clubId,
      });
    }
  }

  invalidateClub(clubId);
  return { success: true };
}
