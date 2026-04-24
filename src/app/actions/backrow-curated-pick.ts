"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { invalidateMarketing } from "@/lib/cache/invalidate";
import { addEndlessMovie, advanceEndlessFestival } from "./endless-festival";
import { refreshMovie, cacheMovie } from "./movies";
import { createPlayingMovieThread } from "./discussions/auto";
import { handleActionError } from "@/lib/errors/handler";

// BackRow Featured club slug - this is the official BackRow club for homepage features
const BACKROW_FEATURED_SLUG = "backrow-featured";

// Check if user is a site admin (BackRow Featured club producer)
async function isBackRowAdmin(userId: string) {
  const supabase = await createClient();

  // Check both old and new slug for backwards compatibility
  const { data, error } = await supabase
    .from("clubs")
    .select("producer_id")
    .or(`slug.eq.${BACKROW_FEATURED_SLUG},slug.eq.backrow`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check BackRow admin status:", error);
    return false;
  }

  return data?.producer_id === userId;
}

// Get the BackRow Featured club data
async function getBackRowFeaturedClub(): Promise<{
  id: string;
  slug: string;
  name: string;
} | null> {
  const supabase = await createClient();

  // Try the new slug first, then fall back to old slugs
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .or(`slug.eq.${BACKROW_FEATURED_SLUG},slug.eq.backrow,name.ilike.%backrow%featured%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch BackRow Featured club:", error);
    return null;
  }

  return data;
}

// Get the BackRow club ID (legacy function)
async function getBackRowClubId(): Promise<string | null> {
  const club = await getBackRowFeaturedClub();
  return club?.id || null;
}

// Get the current featured movie
export async function getCurrentFeaturedMovie() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("backrow_matinee")
    .select(
      `
      id,
      tmdb_id,
      curator_note,
      featured_at,
      expires_at,
      club_id,
      movie:tmdb_id (
        tmdb_id,
        title,
        year,
        poster_url
      )
    `
    )
    .gt("expires_at", new Date().toISOString())
    .order("featured_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return data;
}

// Set a new featured movie (admin only)
// Now uses the new endless festival system which auto-creates discussion threads
export async function setFeaturedMovie(
  tmdbId: number,
  curatorNote: string,
  durationDays: number = 7
) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check admin status
  const isAdmin = await isBackRowAdmin(user.id);
  if (!isAdmin) {
    return { error: "Only BackRow admins can set the featured movie" };
  }

  // Get the BackRow club ID
  const clubId = await getBackRowClubId();
  if (!clubId) {
    return { error: "BackRow club not found" };
  }

  // Use the new endless festival system to add the movie
  // This will:
  // 1. Complete any existing festival
  // 2. Create a new festival
  // 3. Create the nomination
  // 4. Auto-create a discussion thread
  const result = await addEndlessMovie(clubId, tmdbId, curatorNote);

  if ("error" in result) {
    return { error: result.error };
  }

  // Get movie title for the backrow_matinee entry
  const { data: movie, error: movieError } = await supabase
    .from("movies")
    .select("title")
    .eq("tmdb_id", tmdbId)
    .single();

  if (movieError) {
    console.error("Failed to fetch movie title for matinee entry:", movieError);
  }

  // Expire any existing backrow_matinee entries
  await supabase
    .from("backrow_matinee")
    .update({ expires_at: new Date().toISOString() })
    .gt("expires_at", new Date().toISOString());

  // Create new backrow_matinee entry (for the home page widget)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const { error: matineeError } = await supabase.from("backrow_matinee").insert({
    tmdb_id: tmdbId,
    curator_note: curatorNote,
    featured_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    club_id: clubId,
  });

  if (matineeError) {
    console.error("Matinee entry error:", matineeError);
    // Don't fail the whole operation, the festival was created successfully
  }

  // Log activity
  await supabase.from("activity_log").insert({
    club_id: clubId,
    user_id: user.id,
    action: "movie_of_week_set",
    details: {
      tmdb_id: tmdbId,
      movie_title: movie?.title,
      curator_note: curatorNote,
      discussion_thread_id: result.threadId,
    },
  });

  invalidateMarketing("curated-pick");
  revalidatePath("/club/backrow");

  return { success: true, threadId: result.threadId };
}

// Advance to the next featured movie (admin only)
// This completes the current festival and allows setting a new one
export async function advanceFeaturedMovie() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check admin status
  const isAdmin = await isBackRowAdmin(user.id);
  if (!isAdmin) {
    return { error: "Only BackRow admins can advance the featured movie" };
  }

  // Get the BackRow club ID
  const clubId = await getBackRowClubId();
  if (!clubId) {
    return { error: "BackRow club not found" };
  }

  // Use the new endless festival system to advance
  const result = await advanceEndlessFestival(clubId);

  if ("error" in result) {
    return { error: result.error };
  }

  // Expire the current backrow_matinee entry
  await supabase
    .from("backrow_matinee")
    .update({ expires_at: new Date().toISOString() })
    .eq("club_id", clubId)
    .gt("expires_at", new Date().toISOString());

  invalidateMarketing("curated-pick");
  revalidatePath("/club/backrow");

  return { success: true, message: "Festival completed. Ready to set new featured movie." };
}

// Get featured movie history
export async function getFeaturedMovieHistory(limit: number = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("backrow_matinee")
    .select(
      `
      id,
      tmdb_id,
      curator_note,
      featured_at,
      expires_at,
      movie:tmdb_id (
        tmdb_id,
        title,
        year,
        poster_url
      )
    `
    )
    .order("featured_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: "Failed to fetch history" };
  }

  return { data };
}

/**
 * Refresh the current featured movie data from TMDB
 * This updates backdrop_url and overview fields
 */
export async function refreshCurrentFeaturedMovie() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the current featured movie
  const current = await getCurrentFeaturedMovie();
  if (!current) {
    return { error: "No current featured movie found" };
  }

  // Refresh the movie data from TMDB
  const result = await refreshMovie(current.tmdb_id);

  if (result.error) {
    return { error: result.error };
  }

  invalidateMarketing("curated-pick");
  revalidatePath("/club/backrow");

  return { success: true, movie: result.movie };
}

// ============================================
// DUAL MOVIE SYSTEM (Featured + Throwback)
// ============================================

type MovieSlot = "featured" | "throwback";

const SLOT_THEMES: Record<MovieSlot, string> = {
  featured: "Featured New Release",
  throwback: "Throwback Movie",
};

/**
 * Set a movie in a specific slot (Featured or Throwback)
 * This creates/updates a festival with the appropriate theme
 * Multiple festivals can be active simultaneously
 */
export async function setMovieInSlot(slot: MovieSlot, tmdbId: number, curatorNote?: string) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check admin status
  const isAdmin = await isBackRowAdmin(user.id);
  if (!isAdmin) {
    return { error: "Only BackRow admins can set movies" };
  }

  // Get the BackRow Featured club
  const club = await getBackRowFeaturedClub();
  if (!club) {
    return { error: "BackRow Featured club not found" };
  }

  const theme = SLOT_THEMES[slot];

  // Get the current season
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("club_id", club.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) {
    console.error("Failed to fetch season for slot:", seasonError);
    return { error: "Failed to fetch season" };
  }

  if (!season) {
    return { error: "No season found. Please create a season first." };
  }

  // Cache the movie from TMDB
  const cacheResult = await cacheMovie(tmdbId);
  if ("error" in cacheResult) {
    return { error: `Failed to fetch movie: ${cacheResult.error}` };
  }

  // Also refresh to get backdrop and overview
  await refreshMovie(tmdbId);

  // Get movie details
  const { data: movie, error: movieFetchError } = await supabase
    .from("movies")
    .select("tmdb_id, title, year")
    .eq("tmdb_id", tmdbId)
    .single();

  if (movieFetchError) {
    console.error("Failed to fetch movie details for slot:", movieFetchError);
  }

  if (!movie) {
    return { error: "Movie not found after caching." };
  }

  // Check if there's already a festival for this slot (by theme)
  const { data: existingFestival, error: existingFestivalError } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", club.id)
    .eq("theme", theme)
    .eq("status", "watching")
    .maybeSingle();

  if (existingFestivalError) {
    console.error("Failed to check existing festival for slot:", existingFestivalError);
    return { error: "Failed to check existing festival" };
  }

  if (existingFestival) {
    // Complete the existing festival for this slot
    await supabase
      .from("festivals")
      .update({
        status: "completed",
        phase: "results",
        results_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingFestival.id);
  }

  // Create new festival for this slot
  const { data: newFestival, error: festivalError } = await supabase
    .from("festivals")
    .insert({
      club_id: club.id,
      season_id: season.id,
      theme: theme,
      status: "watching",
      phase: "watch_rate",
      member_count_at_creation: 1,
      start_date: new Date().toISOString(),
      auto_advance: false,
      slug: `${slot}-${Date.now()}`,
    })
    .select("id")
    .single();

  if (festivalError || !newFestival) {
    return handleActionError(festivalError || new Error("Festival not created"), {
      action: "setMovieInSlot",
      metadata: { slot },
    });
  }

  // Create nomination
  const { error: nominationError } = await supabase.from("nominations").insert({
    festival_id: newFestival.id,
    user_id: user.id,
    tmdb_id: tmdbId,
    pitch: curatorNote || null,
  });

  if (nominationError) {
    await supabase.from("festivals").delete().eq("id", newFestival.id);
    return handleActionError(nominationError, {
      action: "setMovieInSlot",
      metadata: { slot, step: "nomination" },
    });
  }

  // Create discussion thread if one doesn't exist for this movie in this club
  await createPlayingMovieThread({
    clubId: club.id,
    tmdbId,
    movieTitle: movie.title,
    movieYear: movie.year ?? null,
    authorId: user.id,
    isPinned: true,
  });

  invalidateMarketing("curated-pick");
  revalidatePath(`/club/${club.slug}`);
  revalidatePath(`/club/${BACKROW_FEATURED_SLUG}`);

  return {
    success: true,
    slot,
    movie: { tmdbId, title: movie.title },
    festivalId: newFestival.id,
  };
}

/**
 * Set the Featured New Release (movies currently in theaters)
 */
export async function setFeaturedNewRelease(tmdbId: number, curatorNote?: string) {
  return setMovieInSlot("featured", tmdbId, curatorNote);
}

/**
 * Set the Throwback Movie (a classic film)
 */
export async function setThrowbackMovie(tmdbId: number, curatorNote?: string) {
  return setMovieInSlot("throwback", tmdbId, curatorNote);
}

/**
 * Fix the BackRow Featured club slug to match its name
 */
export async function fixBackRowFeaturedSlug() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Find the BackRow Featured club by name pattern
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .or(`name.ilike.%backrow%featured%,name.ilike.%back row%featured%`)
    .limit(1)
    .maybeSingle();

  if (clubError) {
    console.error("Failed to find BackRow Featured club:", clubError);
    return { error: "Failed to find BackRow Featured club" };
  }

  if (!club) {
    return { error: "BackRow Featured club not found" };
  }

  // Generate correct slug
  const correctSlug = club.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (club.slug === correctSlug) {
    return { success: true, message: "Slug already correct", slug: club.slug };
  }

  // Update slug
  const { error } = await supabase.from("clubs").update({ slug: correctSlug }).eq("id", club.id);

  if (error) {
    return { error: error.message };
  }

  invalidateMarketing("curated-pick");
  revalidatePath(`/club/${correctSlug}`);

  return { success: true, oldSlug: club.slug, newSlug: correctSlug };
}

/**
 * Initialize BackRow Featured with both movies
 * This sets up the dual-movie system with placeholder movies if needed
 */
export async function initializeBackRowFeatured() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // First fix the slug
  const slugResult = await fixBackRowFeaturedSlug();
  if (slugResult.error) {
    console.warn("Slug fix warning:", slugResult.error);
  }

  // Check if both slots already have movies
  const club = await getBackRowFeaturedClub();
  if (!club) {
    return { error: "BackRow Featured club not found" };
  }

  // Check existing festivals
  const { data: existingFestivals, error: existingFestivalsError } = await supabase
    .from("festivals")
    .select("id, theme")
    .eq("club_id", club.id)
    .eq("status", "watching");

  if (existingFestivalsError) {
    console.error("Failed to check existing festivals:", existingFestivalsError);
    return { error: "Failed to check existing festivals" };
  }

  const hasFeatured = existingFestivals?.some((f) => f.theme === "Featured New Release");
  const hasThrowback = existingFestivals?.some((f) => f.theme === "Throwback Movie");

  const results: { featured?: unknown; throwback?: unknown; slug?: unknown } = {};

  // Set up Featured New Release if not exists (Venom: The Last Dance - TMDB ID 912649)
  if (!hasFeatured) {
    results.featured = await setFeaturedMovie(
      912649,
      "Eddie and Venom are on the run in this final chapter of the trilogy."
    );
  }

  // Set up Throwback Movie if not exists (Jaws - TMDB ID 578)
  if (!hasThrowback) {
    results.throwback = await setThrowbackMovie(
      578,
      "Spielberg's classic that made everyone afraid of the water."
    );
  }

  results.slug = slugResult;

  invalidateMarketing("curated-pick");

  return { success: true, ...results };
}
