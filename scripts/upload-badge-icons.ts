/**
 * Bulk upload badge art icons to Supabase Storage.
 *
 * Usage:
 *   bun run scripts/upload-badge-icons.ts
 *
 * Expected folder structure:
 *   badge-art/
 *     user/
 *       festivals_won-1.png      (tier 1 = lowest threshold)
 *       festivals_won-2.png
 *       ...
 *       movies_watched-1.png
 *       ...
 *     club/
 *       festivals_completed-1.png
 *       ...
 *
 * Each image is processed through sharp to:
 * - Resize to 256x256 (contain, transparent background)
 * - Convert to WebP (quality 90)
 * - Strip ALL metadata (EXIF, XMP, ICC profiles, SynthID watermarks)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, join, extname, basename } from "path";
import { readdirSync, existsSync } from "fs";
import { readFile } from "fs/promises";
import sharp from "sharp";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables");
  console.error("Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BADGE_ART_DIR = resolve(process.cwd(), "badge-art");
const BADGE_SIZE = 256;
const WEBP_QUALITY = 90;
const VALID_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

interface BadgeRecord {
  id: string;
  name: string;
  badge_type: string;
  category: string;
  threshold: number;
  tier: number; // 1-based tier within category
}

async function processImage(filePath: string): Promise<Buffer> {
  const buffer = await readFile(filePath);
  return sharp(buffer)
    .resize(BADGE_SIZE, BADGE_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function loadBadges(): Promise<BadgeRecord[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("id, name, badge_type, requirements_jsonb")
    .in("badge_type", ["site", "club_challenge"])
    .order("badge_type")
    .order("requirements_jsonb->category")
    .order("requirements_jsonb->threshold");

  if (error) {
    console.error("Failed to load badges:", error);
    process.exit(1);
  }

  // Assign tier numbers within each (badge_type, category) group
  const records: BadgeRecord[] = [];
  const tierCounters: Record<string, number> = {};

  for (const badge of data || []) {
    const req = badge.requirements_jsonb as { category?: string; threshold?: number };
    const category = req?.category || "unknown";
    const key = `${badge.badge_type}:${category}`;
    tierCounters[key] = (tierCounters[key] || 0) + 1;

    records.push({
      id: badge.id,
      name: badge.name,
      badge_type: badge.badge_type,
      category,
      threshold: req?.threshold || 0,
      tier: tierCounters[key],
    });
  }

  return records;
}

async function main() {
  console.log("Badge Art Bulk Uploader\n");

  if (!existsSync(BADGE_ART_DIR)) {
    console.error(`badge-art/ directory not found at: ${BADGE_ART_DIR}`);
    console.error("Create this structure:");
    console.error("  badge-art/");
    console.error("    user/");
    console.error("      festivals_won-1.png");
    console.error("      festivals_won-2.png");
    console.error("      ...");
    console.error("    club/");
    console.error("      festivals_completed-1.png");
    console.error("      ...");
    process.exit(1);
  }

  // Load all badges and build lookup
  const badges = await loadBadges();
  console.log(`Loaded ${badges.length} badges from database\n`);

  // Build lookup: "user/festivals_won-1" -> BadgeRecord
  const lookup = new Map<string, BadgeRecord>();
  for (const badge of badges) {
    const typePrefix = badge.badge_type === "site" ? "user" : "club";
    const key = `${typePrefix}/${badge.category}-${badge.tier}`;
    lookup.set(key, badge);
  }

  // Scan badge-art directory
  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  for (const typeDir of ["user", "club"]) {
    const dirPath = join(BADGE_ART_DIR, typeDir);
    if (!existsSync(dirPath)) {
      console.log(`Skipping ${typeDir}/ (directory not found)`);
      continue;
    }

    const files = readdirSync(dirPath).filter((f) =>
      VALID_EXTENSIONS.includes(extname(f).toLowerCase())
    );

    console.log(`Found ${files.length} images in ${typeDir}/`);

    for (const file of files) {
      const nameWithoutExt = basename(file, extname(file));
      const lookupKey = `${typeDir}/${nameWithoutExt}`;
      const badge = lookup.get(lookupKey);

      if (!badge) {
        console.log(`  SKIP  ${file} (no matching badge for "${lookupKey}")`);
        skipped++;
        continue;
      }

      const filePath = join(dirPath, file);
      const storagePath = `${typeDir}/${nameWithoutExt}.webp`;

      try {
        // Process image
        const processed = await processImage(filePath);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("badge-icons")
          .upload(storagePath, processed, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true,
          });

        if (uploadError) {
          console.error(`  FAIL  ${file}: ${uploadError.message}`);
          failed++;
          continue;
        }

        // Get public URL and update badge record
        const { data: urlData } = supabase.storage.from("badge-icons").getPublicUrl(storagePath);

        const { error: updateError } = await supabase
          .from("badges")
          .update({ icon_url: urlData.publicUrl })
          .eq("id", badge.id);

        if (updateError) {
          console.error(`  FAIL  ${file}: DB update failed - ${updateError.message}`);
          failed++;
          continue;
        }

        console.log(`  OK    ${file} -> ${badge.name}`);
        uploaded++;
      } catch (err) {
        console.error(`  FAIL  ${file}: ${err}`);
        failed++;
      }
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Failed: ${failed}, Skipped: ${skipped}`);
}

main().catch(console.error);
