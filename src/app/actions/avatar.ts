"use server";

/**
 * Avatar Server Actions
 *
 * Dedicated server actions for saving avatar changes immediately
 * from the AvatarEditor component, without needing the parent form.
 *
 * Image resize is offloaded to the `image-processing` queue worker so the
 * HTTP response returns as soon as the raw upload lands. HEIC format
 * conversion stays inline (browsers can't render HEIC, so the uploaded
 * bytes must already be a browser-renderable format before the URL ships
 * to the row). The worker then overwrites the same storage path with a
 * 1024×1024 mozjpeg; hard refresh surfaces the optimized copy.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSharp } from "@/lib/image/sharp-loader";
import { handleActionError } from "@/lib/errors/handler";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { enqueueImageProcessing } from "@/lib/jobs/producers";

const MAX_AVATAR_BYTES = 15 * 1024 * 1024;
const ALLOWED_AVATAR_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ALLOWED_AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"];

function isHeif(file: File): boolean {
  const ext = file.name?.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "heic" || ext === "heif") return true;
  const type = file.type?.toLowerCase() ?? "";
  return type === "image/heic" || type === "image/heif";
}

/**
 * Update user avatar settings (icon, color, border, or photo upload)
 */
export async function updateUserAvatar(
  formData: FormData
): Promise<{ success: boolean; error?: string; avatarUrl?: string }> {
  const rateCheck = await actionRateLimit("updateUserAvatar", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const emailGate = requireVerifiedEmail(user);
  if (!emailGate.ok) return { success: false, error: emailGate.error };

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

  if (avatarIcon !== null) {
    updateData.avatar_icon = avatarIcon || null;
  }

  if (avatarColorIndexStr !== null && avatarColorIndexStr !== "") {
    const idx = parseInt(avatarColorIndexStr, 10);
    if (!isNaN(idx)) updateData.avatar_color_index = idx;
  }

  if (avatarBorderColorIndexStr !== null) {
    if (avatarBorderColorIndexStr === "") {
      updateData.avatar_border_color_index = null;
    } else {
      const idx = parseInt(avatarBorderColorIndexStr, 10);
      if (!isNaN(idx)) updateData.avatar_border_color_index = idx;
    }
  }

  let avatarUrl: string | undefined;
  let uploadedPath: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { success: false, error: "Avatar file size must be less than 15MB" };
    }

    const fileExtension = avatarFile.name
      ? "." + avatarFile.name.split(".").pop()?.toLowerCase()
      : "";
    const hasValidType =
      avatarFile.type && ALLOWED_AVATAR_MIMES.includes(avatarFile.type.toLowerCase());
    const hasValidExtension = ALLOWED_AVATAR_EXTENSIONS.includes(fileExtension);

    if (!hasValidType && !hasValidExtension) {
      return {
        success: false,
        error: "Avatar must be an image file (JPEG, PNG, GIF, WebP, or HEIC)",
      };
    }

    try {
      const { data: currentProfile } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

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

      // HEIC must be converted inline — browsers can't render it. Everything
      // else ships to storage as-is; the image-processing worker handles the
      // heavy resize/re-encode pass.
      const arrayBuffer = await avatarFile.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);
      const heif = isHeif(avatarFile);
      const uploadBuffer = heif
        ? await (await getSharp())(rawBuffer).rotate().jpeg({ quality: 90 }).toBuffer()
        : rawBuffer;
      const finalExt = heif ? "jpg" : fileExtension.replace(".", "") || "jpg";
      const contentType = heif ? "image/jpeg" : avatarFile.type || "application/octet-stream";

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
        uploadedPath = fileName;
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
    updateData.avatar_url = null;
  }

  const { error: updateError } = await supabase.from("users").update(updateData).eq("id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (uploadedPath) {
    await enqueueImageProcessing({
      variant: "user-avatar",
      bucket: "avatars",
      rawPath: uploadedPath,
      ownerId: user.id,
    });
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
  const rateCheck = await actionRateLimit("updateClubAvatar", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { success: false, error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const emailGate = requireVerifiedEmail(user);
  if (!emailGate.ok) return { success: false, error: emailGate.error };

  const clubId = formData.get("clubId") as string;
  if (!clubId) {
    return { success: false, error: "Club ID is required" };
  }

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

  if (avatarIcon !== null) {
    updateData.avatar_icon = avatarIcon || null;
  }

  if (avatarColorIndexStr !== null && avatarColorIndexStr !== "") {
    const idx = parseInt(avatarColorIndexStr, 10);
    if (!isNaN(idx)) updateData.avatar_color_index = idx;
  }

  if (avatarBorderColorIndexStr !== null) {
    if (avatarBorderColorIndexStr === "") {
      updateData.avatar_border_color_index = null;
    } else {
      const idx = parseInt(avatarBorderColorIndexStr, 10);
      if (!isNaN(idx)) updateData.avatar_border_color_index = idx;
    }
  }

  let pictureUrl: string | undefined;
  let uploadedPath: string | undefined;
  if (pictureFile && pictureFile.size > 0) {
    if (membership.role !== "producer") {
      return { success: false, error: "Only the club producer can upload a club picture" };
    }

    if (pictureFile.size > MAX_AVATAR_BYTES) {
      return { success: false, error: "Picture file size must be less than 15MB" };
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(pictureFile.type)) {
      return { success: false, error: "Picture must be an image file (JPEG, PNG, GIF, or WebP)" };
    }

    try {
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

      // Upload the raw bytes; the image-processing worker handles resize.
      const arrayBuffer = await pictureFile.arrayBuffer();
      const uploadBuffer = Buffer.from(arrayBuffer);
      const ext = pictureFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${clubId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("club-pictures")
        .upload(fileName, uploadBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: pictureFile.type,
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
        uploadedPath = fileName;
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
    updateData.picture_url = null;
  }

  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();

  const { error: updateError } = await supabase.from("clubs").update(updateData).eq("id", clubId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (uploadedPath) {
    await enqueueImageProcessing({
      variant: "club-picture",
      bucket: "club-pictures",
      rawPath: uploadedPath,
      ownerId: clubId,
    });
  }

  if (club?.slug) {
    revalidatePath(`/club/${club.slug}`);
    revalidatePath(`/club/${club.slug}/settings`);
  }
  revalidatePath("/");

  return { success: true, pictureUrl };
}
