"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import { revalidatePath } from "next/cache";
import { cacheMovie } from "./movies";

interface ImportMovie {
  tmdbId: number;
  dateWatched?: string; // ISO date string
}

interface ImportResult {
  success: true;
  imported: number;
  skipped: number;
}

/**
 * Get or create a dedicated import festival for a club.
 * Unlike getOrCreateEndlessFestival, this creates the festival with status "completed"
 * so it only appears in the club's history page — not as an active endless festival.
 */
async function getOrCreateImportFestival(clubId: string): Promise<string | { error: string }> {
  const supabase = await createClient();

  // Look for an existing import festival
  const { data: existing } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", clubId)
    .eq("theme", "Imported Watch History")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create a new import festival with completed status
  const { data: newFestival, error } = await supabase
    .from("festivals")
    .insert({
      club_id: clubId,
      season_id: null,
      theme: "Imported Watch History",
      status: "completed",
      phase: "results",
      member_count_at_creation: 1,
      start_date: new Date().toISOString(),
      auto_advance: false,
      slug: `import-history-${clubId.slice(0, 8)}-${Date.now()}`,
    })
    .select("id")
    .single();

  if (error || !newFestival) {
    return { error: `Failed to create import festival: ${error?.message || "Unknown error"}` };
  }

  return newFestival.id;
}

/**
 * Bulk import movies into a club's watch history.
 * Each movie becomes a completed nomination in a dedicated import festival.
 */
export async function importClubWatchHistory(
  clubId: string,
  movies: ImportMovie[]
): Promise<ImportResult | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only producers and directors can import watch history" };
  }

  if (movies.length === 0) {
    return { error: "No movies to import" };
  }

  // Get or create a dedicated import festival (status: "completed" so it only shows in history)
  const festivalResult = await getOrCreateImportFestival(clubId);
  if (typeof festivalResult === "object" && "error" in festivalResult) {
    return { error: festivalResult.error };
  }
  const festivalId = festivalResult;

  // Get existing nominations to skip duplicates
  const { data: existingNominations } = await supabase
    .from("nominations")
    .select("tmdb_id")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  const existingTmdbIds = new Set(existingNominations?.map((n) => n.tmdb_id) ?? []);

  let imported = 0;
  let skipped = 0;

  for (const movie of movies) {
    // Skip duplicates
    if (existingTmdbIds.has(movie.tmdbId)) {
      skipped++;
      continue;
    }

    // Cache the movie in our movies table
    const cacheResult = await cacheMovie(movie.tmdbId);
    if ("error" in cacheResult) {
      // Skip movies that fail to cache (invalid TMDB ID, etc.)
      skipped++;
      continue;
    }

    // Create nomination as completed
    const completedAt = movie.dateWatched || new Date().toISOString();

    const { error } = await supabase.from("nominations").insert({
      festival_id: festivalId,
      user_id: user.id,
      tmdb_id: movie.tmdbId,
      endless_status: "completed",
      completed_at: completedAt,
      hidden_from_history: false,
    });

    if (error) {
      console.error("Failed to import movie:", { tmdbId: movie.tmdbId, error });
      skipped++;
      continue;
    }

    // Track so we don't double-import within the same batch
    existingTmdbIds.add(movie.tmdbId);
    imported++;
  }

  revalidatePath(`/club/[slug]`);

  return { success: true, imported, skipped };
}

/**
 * Search TMDB for a movie by title, optionally filtering by year.
 * Used by the CSV import to match rows to TMDB entries.
 */
export async function searchMovieForImport(
  title: string,
  year?: number
): Promise<
  | Array<{
      id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
    }>
  | { error: string }
> {
  if (!title || title.trim().length < 2) {
    return [];
  }

  try {
    const { searchMovies } = await import("@/lib/tmdb/client");
    const results = await searchMovies(title.trim(), year);

    return results.slice(0, 5).map((movie) => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster_path: movie.poster_path,
    }));
  } catch (error) {
    return handleActionError(error, "searchMovieForImport");
  }
}

/**
 * Verify a TMDB ID is valid and return movie info.
 */
export async function verifyTmdbId(tmdbId: number): Promise<
  | {
      id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
    }
  | { error: string }
> {
  try {
    const { getMovieDetails } = await import("@/lib/tmdb/client");
    const movie = await getMovieDetails(tmdbId);

    return {
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster_path: movie.poster_path,
    };
  } catch {
    return { error: `Invalid TMDB ID: ${tmdbId}` };
  }
}
