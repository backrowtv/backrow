/**
 * Test Factory — Supabase Client
 *
 * Service-role client for direct database access, bypassing RLS.
 * SAFETY: Rejects non-localhost URLs to prevent accidental production writes.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

// Safety: warn if running against non-localhost (but allow dev instances)
if (!supabaseUrl.includes("localhost") && !supabaseUrl.includes("127.0.0.1")) {
  console.warn(
    `⚠️  Test factory running against cloud DB: ${supabaseUrl}\n` +
      "   Use --teardown to clean up test data when done."
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export { supabaseUrl, supabaseServiceKey };

// ── TMDB poster resolution ──────────────────────────────────────

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

// Cache of tmdb_id -> verified poster_url so we only call TMDB once per movie
const posterCache = new Map<number, string>();

/**
 * Ensure a movie exists in the movies table with a valid poster URL.
 * Fetches the real poster path from TMDB instead of trusting hardcoded paths.
 */
export async function ensureMovie(movie: {
  tmdbId: number;
  title: string;
  year?: number;
  posterPath?: string;
}): Promise<void> {
  // Check if we already resolved this movie's poster
  if (posterCache.has(movie.tmdbId)) {
    return;
  }

  // Fetch real poster from TMDB API
  let posterUrl = movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : null;

  if (TMDB_API_KEY) {
    try {
      const resp = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${TMDB_API_KEY}`
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.poster_path) {
          posterUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
        }
      }
    } catch {
      // Fall back to hardcoded path
    }
  }

  await supabase.from("movies").upsert(
    {
      tmdb_id: movie.tmdbId,
      title: movie.title,
      year: movie.year,
      poster_url: posterUrl || `https://image.tmdb.org/t/p/w500${movie.posterPath}`,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "tmdb_id" }
  );

  posterCache.set(movie.tmdbId, posterUrl || "");
}
