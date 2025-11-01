import sharp from "sharp";
import { getTMDBBlurDataURL, getBackdropBlurDataURL } from "./blur-placeholder";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const MAX_CACHE_SIZE = 500;

// In-memory LRU cache — TMDB image paths are immutable so entries never invalidate
const cache = new Map<string, string>();

function evictIfNeeded() {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entry (first key in Map insertion order)
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

/**
 * Generate a blur data URL from a TMDB image path.
 * Fetches the w92 thumbnail and creates a tiny blurred base64 JPEG.
 * Falls back to static placeholder on any error.
 */
export async function generateBlurDataURL(
  tmdbPath: string,
  type: "poster" | "profile" | "backdrop" = "poster"
): Promise<string> {
  if (!tmdbPath) {
    return type === "backdrop" ? getBackdropBlurDataURL() : getTMDBBlurDataURL();
  }

  const cacheKey = `${type}:${tmdbPath}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    // Move to end for LRU behavior
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return cached;
  }

  try {
    const size = type === "backdrop" ? "w300" : "w92";
    const url = `${TMDB_IMAGE_BASE}/${size}${tmdbPath}`;

    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    const [width, height] = type === "backdrop" ? [16, 9] : type === "profile" ? [8, 12] : [8, 12];

    const blurBuffer = await sharp(buffer)
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 20 })
      .toBuffer();

    const dataURL = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

    evictIfNeeded();
    cache.set(cacheKey, dataURL);

    return dataURL;
  } catch {
    return type === "backdrop" ? getBackdropBlurDataURL() : getTMDBBlurDataURL();
  }
}

/**
 * Batch generate blur data URLs for multiple TMDB image paths.
 * Useful for passing blur URLs to client components.
 */
export async function generateBlurDataURLs(
  paths: Array<{ path: string; type?: "poster" | "profile" | "backdrop" }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const promises = paths.map(async ({ path, type }) => {
    const dataURL = await generateBlurDataURL(path, type);
    results.set(path, dataURL);
  });
  await Promise.all(promises);
  return results;
}
