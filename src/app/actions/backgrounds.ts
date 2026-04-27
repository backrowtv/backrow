"use server";

import { getSharp } from "@/lib/image/sharp-loader";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  invalidateClub,
  invalidateFestival,
  invalidatePath,
  invalidateUser,
} from "@/lib/cache/invalidate";
import { isAdmin } from "./admin";
import type { EntityType, BackgroundImage, BackgroundInput } from "@/lib/backgrounds";

// Theater frame aspect ratio (1.85:1 standard theatrical widescreen)
const THEATER_ASPECT = 1.85;

// Get a single background by entity type and id
export async function getBackground(
  entityType: EntityType,
  entityId: string
): Promise<{ data: BackgroundImage | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("background_images")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned, which is fine
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Get all backgrounds for a specific entity type
export async function getBackgroundsByType(
  entityType: EntityType
): Promise<{ data: BackgroundImage[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("background_images")
    .select("*")
    .eq("entity_type", entityType)
    .order("entity_id");

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

// Create or update a background
export async function upsertBackground(
  input: BackgroundInput
): Promise<{ data: BackgroundImage | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated" };
  }

  // For site pages, require admin
  if (input.entity_type === "site_page") {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { data: null, error: "Admin access required" };
    }
  }

  // Check if exists
  const { data: existing } = await supabase
    .from("background_images")
    .select("id")
    .eq("entity_type", input.entity_type)
    .eq("entity_id", input.entity_id)
    .single();

  const backgroundData = {
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    image_url: input.image_url,
    height_preset: input.height_preset,
    height_px: input.height_preset === "custom" ? input.height_px : null,
    opacity: input.opacity,
    object_position: input.object_position,
    scale: input.scale ?? 1,
    vignette_opacity: input.vignette_opacity ?? 0.4,
    extend_past_content: input.extend_past_content ?? false,
    // Mobile-specific settings
    mobile_height_preset: input.mobile_height_preset ?? null,
    mobile_height_px: input.mobile_height_preset === "custom" ? input.mobile_height_px : null,
    mobile_scale: input.mobile_scale ?? null,
    mobile_object_position: input.mobile_object_position ?? null,
    mobile_opacity: input.mobile_opacity ?? null,
    credit_title: input.credit_title || null,
    credit_year: input.credit_year || null,
    credit_studio: input.credit_studio || null,
    credit_actor: input.credit_actor || null,
    is_active: input.is_active ?? true,
  };

  let result;

  if (existing) {
    // Update
    result = await supabase
      .from("background_images")
      .update(backgroundData)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    // Insert
    result = await supabase.from("background_images").insert(backgroundData).select().single();
  }

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  // Invalidate the affected entity's cache
  if (input.entity_type === "site_page") {
    invalidatePath(input.entity_id);
  } else if (input.entity_type === "club") {
    invalidateClub(input.entity_id);
  } else if (input.entity_type === "festival") {
    await invalidateFestival(input.entity_id);
  } else if (input.entity_type === "profile") {
    invalidateUser(input.entity_id);
  }

  revalidatePath("/admin");

  return { data: result.data, error: null };
}

// Delete a background
export async function deleteBackground(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the background first to check permissions
  const { data: background, error: fetchError } = await supabase
    .from("background_images")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !background) {
    return { success: false, error: "Background not found" };
  }

  // For site pages, require admin
  if (background.entity_type === "site_page") {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { success: false, error: "Admin access required" };
    }
  }

  const { error } = await supabase.from("background_images").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Invalidate the affected entity's cache
  if (background.entity_type === "site_page") {
    invalidatePath(background.entity_id);
  } else if (background.entity_type === "club") {
    invalidateClub(background.entity_id);
  } else if (background.entity_type === "festival") {
    await invalidateFestival(background.entity_id);
  } else if (background.entity_type === "profile") {
    invalidateUser(background.entity_id);
  }
  revalidatePath("/admin");

  return { success: true, error: null };
}

// Upload background image to storage
export async function uploadBackgroundImage(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { url: null, error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { url: null, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" };
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: "File too large. Maximum size is 5MB" };
  }

  // Center-crop to 1.85:1 theater aspect ratio before upload.
  // Animated GIFs are uploaded as-is (sharp animated crop is unreliable).
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let outputBuffer: Buffer = inputBuffer;

  if (file.type !== "image/gif") {
    try {
      const sharp = await getSharp();
      const pipeline = sharp(inputBuffer);
      const meta = await pipeline.metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;

      if (!width || !height) {
        return { url: null, error: "Could not read image dimensions" };
      }

      const currentRatio = width / height;
      let cropW = width;
      let cropH = height;
      if (currentRatio > THEATER_ASPECT) {
        cropW = Math.round(height * THEATER_ASPECT);
      } else if (currentRatio < THEATER_ASPECT) {
        cropH = Math.round(width / THEATER_ASPECT);
      }
      const left = Math.floor((width - cropW) / 2);
      const top = Math.floor((height - cropH) / 2);

      // Cap at ~1920 wide (theater displays don't need more) and re-encode
      // mozjpeg q85. sharp strips EXIF by default when not calling .withMetadata().
      outputBuffer = await pipeline
        .rotate()
        .extract({ left, top, width: cropW, height: cropH })
        .resize({ width: Math.min(cropW, 1920), withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    } catch (err) {
      return { url: null, error: err instanceof Error ? err.message : "Image processing failed" };
    }
  }

  // Non-GIF input was re-encoded to JPEG above; GIF stays as GIF.
  const isAnimatedGif = file.type === "image/gif";
  const ext = isAnimatedGif ? "gif" : "jpg";
  const contentType = isAnimatedGif ? "image/gif" : "image/jpeg";
  const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const path = `${user.id}/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("backgrounds")
    .upload(path, outputBuffer, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("backgrounds").getPublicUrl(path);

  return { url: publicUrl, error: null };
}
