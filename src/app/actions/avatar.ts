"use server";

/**
 * Avatar Server Actions
 *
 * Dedicated server actions for saving avatar changes immediately
 * from the AvatarEditor component, without needing the parent form.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { handleActionError } from "@/lib/errors/handler";

/**
 * Update user avatar settings (icon, color, border, or photo upload)
 */
export async function updateUserAvatar(
  formData: FormData
): Promise<{ success: boolean; error?: string; avatarUrl?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const avatarIcon = formData.get("avatar_icon") as string | null;
  const avatarColorIndexStr = formData.get("avatar_color_index") as string | null;
  const avatarBorderColorIndexStr = formData.get("avatar_border_color_index") as string | null;
  const avatarFile = formData.get("avatar") as File | null;

  const updateData: {
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    avatar_url?: string | null;
  } = {};

  // Avatar icon
  if (avatarIcon !== null) {
    updateData.avatar_icon = avatarIcon || null;
  }

  // Avatar color index
  if (avatarColorIndexStr !== null && avatarColorIndexStr !== "") {
    const idx = parseInt(avatarColorIndexStr, 10);
    if (!isNaN(idx)) updateData.avatar_color_index = idx;
  }

  // Avatar border color index
  if (avatarBorderColorIndexStr !== null) {
    if (avatarBorderColorIndexStr === "") {
      updateData.avatar_border_color_index = null;
    } else {
      const idx = parseInt(avatarBorderColorIndexStr, 10);
      if (!isNaN(idx)) updateData.avatar_border_color_index = idx;
    }
  }

  // Handle file upload
  let avatarUrl: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    const maxSize = 15 * 1024 * 1024;
    if (avatarFile.size > maxSize) {
      return { success: false, error: "Avatar file size must be less than 15MB" };
    }

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
    const fileExtension = avatarFile.name
      ? "." + avatarFile.name.split(".").pop()?.toLowerCase()
      : "";
    const hasValidType = avatarFile.type && allowedTypes.includes(avatarFile.type.toLowerCase());
    const hasValidExtension = allowedExtensions.includes(fileExtension);

    if (!hasValidType && !hasValidExtension) {
      return {
        success: false,
        error: "Avatar must be an image file (JPEG, PNG, GIF, WebP, or HEIC)",
      };
    }

    try {
      // Get current avatar to clean up old file
      const { data: currentProfile } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      // Delete old avatar if it exists
      if (currentProfile?.avatar_url) {
        const urlParts = currentProfile.avatar_url.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "avatars");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          const oldAvatarPath = urlParts[filenameIndex + 1];
          try {
            await supabase.storage.from("avatars").remove([oldAvatarPath]);
          } catch {
            // Ignore - file might not exist
          }
        }
      }

      // Decode any format (HEIC/JPEG/PNG/WebP/GIF), honor EXIF orientation,
      // cap at 1024×1024 (avatars render ≤ 112px), strip metadata (privacy),
      // re-encode as mozjpeg q85 for a small, fast-loading avatar.
      const arrayBuffer = await avatarFile.arrayBuffer();
      const uploadBuffer = await sharp(Buffer.from(arrayBuffer))
        .rotate()
        .resize(1024, 1024, { fit: "cover", position: "centre" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      const finalExt = "jpg";
      const contentType = "image/jpeg";

      const fileName = `${user.id}-${Date.now()}.${finalExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, uploadBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType,
        });

      if (uploadError) {
        if (
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("not found")
        ) {
          return { success: false, error: 'Storage bucket "avatars" does not exist.' };
        }
        return { success: false, error: `Failed to upload avatar: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        avatarUrl = urlData.publicUrl;
        updateData.avatar_url = avatarUrl;
        updateData.avatar_icon = "photo";
      }
    } catch (error) {
      return handleActionError(error, { action: "updateUserAvatar" }) as {
        success: boolean;
        error: string;
      };
    }
  } else if (avatarIcon && avatarIcon !== "photo") {
    // Selecting a non-photo icon clears the uploaded avatar URL
    updateData.avatar_url = null;
  }

  const { error: updateError } = await supabase.from("users").update(updateData).eq("id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/");

  return { success: true, avatarUrl };
}

/**
 * Update club avatar settings (icon, color, border, or photo upload)
 */
export async function updateClubAvatar(
  formData: FormData
): Promise<{ success: boolean; error?: string; pictureUrl?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const clubId = formData.get("clubId") as string;
  if (!clubId) {
    return { success: false, error: "Club ID is required" };
  }

  // Check membership (producer or director)
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { success: false, error: "You do not have permission to edit this club" };
  }

  const avatarIcon = formData.get("avatar_icon") as string | null;
  const avatarColorIndexStr = formData.get("avatar_color_index") as string | null;
  const avatarBorderColorIndexStr = formData.get("avatar_border_color_index") as string | null;
  const pictureFile = formData.get("picture") as File | null;

  const updateData: {
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    picture_url?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  // Avatar icon
  if (avatarIcon !== null) {
    updateData.avatar_icon = avatarIcon || null;
  }

  // Avatar color index
  if (avatarColorIndexStr !== null && avatarColorIndexStr !== "") {
    const idx = parseInt(avatarColorIndexStr, 10);
    if (!isNaN(idx)) updateData.avatar_color_index = idx;
  }

  // Avatar border color index
  if (avatarBorderColorIndexStr !== null) {
    if (avatarBorderColorIndexStr === "") {
      updateData.avatar_border_color_index = null;
    } else {
      const idx = parseInt(avatarBorderColorIndexStr, 10);
      if (!isNaN(idx)) updateData.avatar_border_color_index = idx;
    }
  }

  // Handle file upload
  let pictureUrl: string | undefined;
  if (pictureFile && pictureFile.size > 0) {
    if (membership.role !== "producer") {
      return { success: false, error: "Only the club producer can upload a club picture" };
    }

    const maxSize = 15 * 1024 * 1024;
    if (pictureFile.size > maxSize) {
      return { success: false, error: "Picture file size must be less than 15MB" };
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(pictureFile.type)) {
      return { success: false, error: "Picture must be an image file (JPEG, PNG, GIF, or WebP)" };
    }

    try {
      // Get current club to clean up old picture
      const { data: currentClub } = await supabase
        .from("clubs")
        .select("picture_url")
        .eq("id", clubId)
        .single();

      if (currentClub?.picture_url) {
        const urlParts = currentClub.picture_url.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "club-pictures");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          const oldPicturePath = urlParts[filenameIndex + 1];
          try {
            await supabase.storage.from("club-pictures").remove([oldPicturePath]);
          } catch {
            // Ignore
          }
        }
      }

      // Cap at 512×512 (clubs render ≤ 96px), strip metadata, re-encode mozjpeg q85.
      const arrayBuffer = await pictureFile.arrayBuffer();
      const uploadBuffer = await sharp(Buffer.from(arrayBuffer))
        .rotate()
        .resize(512, 512, { fit: "cover", position: "centre" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      const fileName = `${clubId}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("club-pictures")
        .upload(fileName, uploadBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        if (
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("not found")
        ) {
          return { success: false, error: 'Storage bucket "club-pictures" does not exist.' };
        }
        return { success: false, error: `Failed to upload picture: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage.from("club-pictures").getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        pictureUrl = urlData.publicUrl;
        updateData.picture_url = pictureUrl;
        updateData.avatar_icon = "photo";
      }
    } catch (error) {
      return handleActionError(error, { action: "updateClubAvatar" }) as {
        success: boolean;
        error: string;
      };
    }
  } else if (avatarIcon && avatarIcon !== "photo") {
    // Selecting a non-photo icon clears the uploaded picture URL
    updateData.picture_url = null;
  }

  // Get club slug for revalidation
  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();

  const { error: updateError } = await supabase.from("clubs").update(updateData).eq("id", clubId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (club?.slug) {
    revalidatePath(`/club/${club.slug}`);
    revalidatePath(`/club/${club.slug}/settings`);
  }
  revalidatePath("/");

  return { success: true, pictureUrl };
}
