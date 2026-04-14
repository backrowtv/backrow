/**
 * Worker body for the `image-processing` topic.
 *
 * Downloads a raw upload from storage, runs the sharp() pipeline that used
 * to happen inline in the server action (rotate, resize, mozjpeg q85, strip
 * metadata), and overwrites the same storage path so the pre-computed URL
 * kept on the user/club row continues to work without a schema change.
 */

import sharp from "sharp";
import { claimJob } from "../dedup";
import type { ImageProcessingPayload } from "../types";
import { createServiceClient } from "@/lib/supabase/server";

const USER_AVATAR_DIM = 1024;
const CLUB_PICTURE_DIM = 512;

export async function handleImageProcessing(payload: ImageProcessingPayload): Promise<void> {
  const claim = await claimJob(payload.dedupId, "image-processing");
  if (!claim.claimed) {
    console.info(`[jobs/image-processing] skip — already processed ${payload.dedupId}`);
    return;
  }

  const supabase = createServiceClient();

  const { data: rawBlob, error: downloadError } = await supabase.storage
    .from(payload.bucket)
    .download(payload.rawPath);
  if (downloadError || !rawBlob) {
    console.error("[jobs/image-processing] download failed", downloadError);
    throw downloadError ?? new Error("download returned empty blob");
  }

  const dim = payload.variant === "user-avatar" ? USER_AVATAR_DIM : CLUB_PICTURE_DIM;
  const inputBuffer = Buffer.from(await rawBlob.arrayBuffer());
  const optimizedBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(dim, dim, { fit: "cover", position: "centre" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const { error: uploadError } = await supabase.storage
    .from(payload.bucket)
    .upload(payload.rawPath, optimizedBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/jpeg",
    });

  if (uploadError) {
    console.error("[jobs/image-processing] upload failed", uploadError);
    throw uploadError;
  }
}
