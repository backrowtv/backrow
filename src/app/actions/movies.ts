"use server";

import { createClient, createPublicClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import { getMovieDetails, getPosterUrl, extractUSCertification } from "@/lib/tmdb/client";

// Generate movie slug from title and year
function generateMovieSlug(title: string, year: number | string | null): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  const yearNum = typeof year === "string" ? parseInt(year, 10) : year;
  return yearNum && !isNaN(yearNum) ? `${slug}-${yearNum}` : slug;
}

export async function cacheMovie(tmdbId: number) {
  const supabase = await createClient();

  // Check if movie already cached
  const { data: existingMovie } = await supabase
    .from("movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  // If cached recently (within 7 days), return it (but ensure slug exists)
  if (existingMovie) {
    const cachedAt = new Date(existingMovie.cached_at || 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (cachedAt > sevenDaysAgo) {
      // Ensure slug exists, generate if missing
      if (!existingMovie.slug) {
        const slug = generateMovieSlug(existingMovie.title, existingMovie.year);
        await supabase.from("movies").update({ slug }).eq("tmdb_id", tmdbId);
        existingMovie.slug = slug;
      }
      return { success: true, movie: existingMovie };
    }
  }

  // Fetch from TMDB
  try {
    const tmdbMovie = await getMovieDetails(tmdbId);

    // Extract director from crew
    const director =
      tmdbMovie.credits?.crew?.find((person: { job: string }) => person.job === "Director")?.name ||
      null;

    // Extract cast names (first 10)
    const cast = tmdbMovie.credits?.cast.slice(0, 10).map((actor) => actor.name) || [];

    // Extract genres
    const genres = tmdbMovie.genres.map((g) => g.name);

    // Get year from release_date
    const year = tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null;

    // Generate slug
    const slug = generateMovieSlug(tmdbMovie.title, year);

    // Get backdrop URL if available
    const backdropUrl = tmdbMovie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}`
      : null;

    // Extract MPAA certification
    const certification = extractUSCertification(tmdbMovie.release_dates);

    const movieData = {
      tmdb_id: tmdbId,
      title: tmdbMovie.title,
      year: year || null,
      slug,
      poster_url: getPosterUrl(tmdbMovie.poster_path),
      backdrop_url: backdropUrl,
      overview: tmdbMovie.overview || null,
      tagline: tmdbMovie.tagline || null,
      runtime: tmdbMovie.runtime?.toString() || null,
      director: director,
      genres: genres,
      cast: cast,
      certification: certification,
      popularity_score: 0, // Could calculate from TMDB popularity
      cached_at: new Date().toISOString(),
    };

    // Upsert movie
    const { data: movie, error } = await supabase
      .from("movies")
      .upsert(movieData, {
        onConflict: "tmdb_id",
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { success: true, movie };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch movie from TMDB",
    };
  }
}

/**
 * Ensure a movie exists in the database
 * Creates a minimal record if it doesn't exist, or returns existing
 * Used before operations that require foreign key reference (watch_history, ratings)
 */
export async function ensureMovieExists(
  tmdbId: number,
  title: string,
  year?: number,
  posterPath?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if movie already exists
  const { data: existingMovie } = await supabase
    .from("movies")
    .select("tmdb_id")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (existingMovie) {
    return { success: true };
  }

  // Create minimal movie record
  const slug = generateMovieSlug(title, year || null);
  const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;

  const { error } = await supabase.from("movies").insert({
    tmdb_id: tmdbId,
    title,
    year: year || null,
    slug,
    poster_url: posterUrl,
    cached_at: new Date().toISOString(),
  });

  if (error) {
    return { ...handleActionError(error, "ensureMovieExists"), success: false };
  }

  return { success: true };
}

/**
 * Force refresh a movie's data from TMDB, bypassing the cache
 * This is useful for updating movies that are missing backdrop_url or overview
 */
export async function refreshMovie(tmdbId: number) {
  const supabase = await createClient();

  // Fetch fresh data from TMDB
  try {
    const tmdbMovie = await getMovieDetails(tmdbId);

    // Extract director from crew
    const director =
      tmdbMovie.credits?.crew?.find((person: { job: string }) => person.job === "Director")?.name ||
      null;

    // Extract cast names (first 10)
    const cast = tmdbMovie.credits?.cast.slice(0, 10).map((actor) => actor.name) || [];

    // Extract genres
    const genres = tmdbMovie.genres.map((g) => g.name);

    // Get year from release_date
    const year = tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null;

    // Generate slug
    const slug = generateMovieSlug(tmdbMovie.title, year);

    // Get backdrop URL if available
    const backdropUrl = tmdbMovie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}`
      : null;

    // Extract MPAA certification
    const certification = extractUSCertification(tmdbMovie.release_dates);

    const movieData = {
      tmdb_id: tmdbId,
      title: tmdbMovie.title,
      year: year || null,
      slug,
      poster_url: getPosterUrl(tmdbMovie.poster_path),
      backdrop_url: backdropUrl,
      overview: tmdbMovie.overview || null,
      tagline: tmdbMovie.tagline || null,
      runtime: tmdbMovie.runtime?.toString() || null,
      director: director,
      genres: genres,
      cast: cast,
      certification: certification,
      popularity_score: 0,
      cached_at: new Date().toISOString(),
    };

    // Upsert movie
    const { data: movie, error } = await supabase
      .from("movies")
      .upsert(movieData, {
        onConflict: "tmdb_id",
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { success: true, movie };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch movie from TMDB",
    };
  }
}

/**
 * Pure cached read - fetches movie data by TMDB ID
 * No side effects, safe for 'use cache'
 */
async function getCachedMovieData(tmdbId: number) {
  const supabase = createPublicClient();

  const { data: movie, error: movieError } = await supabase
    .from("movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (movieError) {
    return { error: movieError.message, movie: null };
  }

  return { movie, error: null };
}

/**
 * Get movie by TMDB ID with caching and slug migration
 * NOT cached itself - orchestrates cached reads and writes separately
 */
export async function getMovie(tmdbId: number) {
  // First try cached read
  const { movie, error } = await getCachedMovieData(tmdbId);

  if (error) {
    return { error };
  }

  if (!movie) {
    // Movie not in DB - fetch from TMDB and cache
    const result = await cacheMovie(tmdbId);
    if (result.error) {
      return { error: result.error };
    }
    return { movie: result.movie };
  }

  // Ensure slug exists (migration for old records)
  if (!movie.slug) {
    const supabase = await createClient();
    const slug = generateMovieSlug(movie.title, movie.year);
    await supabase.from("movies").update({ slug }).eq("tmdb_id", tmdbId);
    movie.slug = slug;
  }

  return { movie };
}

/**
 * Pure cached read - fetches movie data by slug
 * No side effects, safe for 'use cache'
 */
export async function getMovieBySlug(slug: string) {
  const supabase = createPublicClient();

  const { data: movie, error: movieError } = await supabase
    .from("movies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (movieError) {
    return { error: movieError.message };
  }

  if (!movie) {
    return { error: "Movie not found" };
  }

  return { movie };
}

/**
 * Fetch movie overviews and years for a list of TMDB IDs
 * Used for adding tooltips to movie carousels
 */
export async function getMovieOverviews(
  tmdbIds: number[]
): Promise<Map<number, { overview: string | null; year: number | null }>> {
  if (tmdbIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data: movies, error } = await supabase
    .from("movies")
    .select("tmdb_id, overview, year")
    .in("tmdb_id", tmdbIds);

  if (error || !movies) {
    console.error("Error fetching movie overviews:", error);
    return new Map();
  }

  const overviewMap = new Map<number, { overview: string | null; year: number | null }>();
  for (const movie of movies) {
    overviewMap.set(movie.tmdb_id, {
      overview: movie.overview,
      year: movie.year,
    });
  }

  return overviewMap;
}
