"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import { getMovieDetails } from "@/lib/tmdb/client";

import type { CuratedMovie, CuratedCollection } from "./curated-collections.types";

const ADMIN_EMAIL = "stephen@backrow.tv";

// Helper to check if user is admin
async function checkAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAdmin: false, error: "Not authenticated" };
  if (user.email !== ADMIN_EMAIL) return { isAdmin: false, error: "Unauthorized" };

  return { isAdmin: true };
}

/**
 * Get all curated collections
 */
export async function getCuratedCollections(): Promise<{
  data: CuratedCollection[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("curated_collections")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return { data: [], ...handleActionError(error, "getCuratedCollections") };
  }

  return { data: data || [] };
}

/**
 * Get active curated collections for search page
 */
export async function getActiveCuratedCollections(): Promise<CuratedCollection[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("curated_collections")
    .select("*")
    .eq("is_active", true)
    .eq("show_on_search", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching active curated collections:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new curated collection
 */
export async function createCuratedCollection(collection: {
  name: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  movies: CuratedMovie[];
  showOnSearch?: boolean;
  showOnHome?: boolean;
}): Promise<{ data?: CuratedCollection; error?: string }> {
  const { isAdmin, error: authError } = await checkAdmin();
  if (!isAdmin) return { error: authError };

  const supabase = await createClient();

  // Generate slug from name
  const slug = collection.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Get the max display_order
  const { data: maxOrderData } = await supabase
    .from("curated_collections")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const displayOrder = (maxOrderData?.display_order || 0) + 1;

  const { data, error } = await supabase
    .from("curated_collections")
    .insert({
      name: collection.name,
      slug,
      title: collection.title,
      subtitle: collection.subtitle || null,
      emoji: collection.emoji || null,
      movies: collection.movies,
      is_active: true,
      display_order: displayOrder,
      show_on_search: collection.showOnSearch ?? true,
      show_on_home: collection.showOnHome ?? false,
    })
    .select()
    .single();

  if (error) {
    return handleActionError(error, "createCuratedCollection");
  }

  revalidatePath("/admin");
  revalidatePath("/search");

  return { data };
}

/**
 * Update a curated collection
 */
export async function updateCuratedCollection(
  id: string,
  updates: {
    name?: string;
    title?: string;
    subtitle?: string | null;
    emoji?: string | null;
    movies?: CuratedMovie[];
    isActive?: boolean;
    displayOrder?: number;
    showOnSearch?: boolean;
    showOnHome?: boolean;
  }
): Promise<{ data?: CuratedCollection; error?: string }> {
  const { isAdmin, error: authError } = await checkAdmin();
  if (!isAdmin) return { error: authError };

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
    updateData.slug = updates.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.subtitle !== undefined) updateData.subtitle = updates.subtitle;
  if (updates.emoji !== undefined) updateData.emoji = updates.emoji;
  if (updates.movies !== undefined) updateData.movies = updates.movies;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
  if (updates.showOnSearch !== undefined) updateData.show_on_search = updates.showOnSearch;
  if (updates.showOnHome !== undefined) updateData.show_on_home = updates.showOnHome;

  const { data, error } = await supabase
    .from("curated_collections")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return handleActionError(error, "updateCuratedCollection");
  }

  revalidatePath("/admin");
  revalidatePath("/search");

  return { data };
}

/**
 * Delete a curated collection
 */
export async function deleteCuratedCollection(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const { isAdmin, error: authError } = await checkAdmin();
  if (!isAdmin) return { error: authError };

  const supabase = await createClient();

  const { error } = await supabase.from("curated_collections").delete().eq("id", id);

  if (error) {
    return handleActionError(error, "deleteCuratedCollection");
  }

  revalidatePath("/admin");
  revalidatePath("/search");

  return { success: true };
}

/**
 * Add a movie to a collection
 */
export async function addMovieToCollection(
  collectionId: string,
  movie: CuratedMovie
): Promise<{ error?: string }> {
  const { isAdmin, error: authError } = await checkAdmin();
  if (!isAdmin) return { error: authError };

  const supabase = await createClient();

  // Get current collection
  const { data: collection, error: fetchError } = await supabase
    .from("curated_collections")
    .select("movies")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { error: "Collection not found" };
  }

  // Check if movie already exists
  const movies = collection.movies as CuratedMovie[];
  if (movies.some((m) => m.tmdbId === movie.tmdbId)) {
    return { error: "Movie already in collection" };
  }

  // Add movie
  const updatedMovies = [...movies, movie];

  const { error } = await supabase
    .from("curated_collections")
    .update({
      movies: updatedMovies,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/search");

  return {};
}

/**
 * Remove a movie from a collection
 */
export async function removeMovieFromCollection(
  collectionId: string,
  tmdbId: number
): Promise<{ error?: string }> {
  const { isAdmin, error: authError } = await checkAdmin();
  if (!isAdmin) return { error: authError };

  const supabase = await createClient();

  // Get current collection
  const { data: collection, error: fetchError } = await supabase
    .from("curated_collections")
    .select("movies")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { error: "Collection not found" };
  }

  // Remove movie
  const movies = collection.movies as CuratedMovie[];
  const updatedMovies = movies.filter((m) => m.tmdbId !== tmdbId);

  const { error } = await supabase
    .from("curated_collections")
    .update({
      movies: updatedMovies,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/search");

  return {};
}

/**
 * Refresh poster data from TMDB for all movies in a collection
 * This is useful when TMDB updates poster paths
 */
export async function refreshCollectionPosters(
  collectionId: string
): Promise<{ updated: number; failed: number; error?: string }> {
  const { isAdmin, error: authError } = await checkAdmin();
  if (!isAdmin) return { updated: 0, failed: 0, error: authError };

  const supabase = await createClient();

  // Get current collection
  const { data: collection, error: fetchError } = await supabase
    .from("curated_collections")
    .select("movies")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { updated: 0, failed: 0, error: "Collection not found" };
  }

  const movies = collection.movies as CuratedMovie[];
  let updated = 0;
  let failed = 0;

  // Fetch fresh data from TMDB for each movie
  const updatedMovies = await Promise.all(
    movies.map(async (movie) => {
      try {
        const tmdbData = await getMovieDetails(movie.tmdbId);
        if (tmdbData.poster_path !== movie.posterPath) {
          updated++;
        }
        return {
          ...movie,
          posterPath: tmdbData.poster_path,
          overview: tmdbData.overview || movie.overview,
        };
      } catch (error) {
        console.error(`Failed to fetch TMDB data for movie ${movie.tmdbId}:`, error);
        failed++;
        return movie; // Keep existing data on failure
      }
    })
  );

  // Update collection with refreshed data
  const { error: updateError } = await supabase
    .from("curated_collections")
    .update({
      movies: updatedMovies,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId);

  if (updateError) {
    return { updated: 0, failed: 0, error: updateError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/search");

  return { updated, failed };
}

/**
 * Refresh poster data for ALL curated collections
 */
export async function refreshAllCollectionPosters(): Promise<{
  collections: number;
  updated: number;
  failed: number;
  error?: string;
}> {
  const { isAdmin, error: authError } = await checkAdmin();
  if (!isAdmin) return { collections: 0, updated: 0, failed: 0, error: authError };

  const supabase = await createClient();

  // Get all collections
  const { data: collections, error: fetchError } = await supabase
    .from("curated_collections")
    .select("id, name, movies");

  if (fetchError) {
    return { collections: 0, updated: 0, failed: 0, error: fetchError.message };
  }

  let totalUpdated = 0;
  let totalFailed = 0;

  // Process each collection
  for (const collection of collections || []) {
    const movies = collection.movies as CuratedMovie[];

    // Fetch fresh data from TMDB for each movie
    const updatedMovies = await Promise.all(
      movies.map(async (movie) => {
        try {
          const tmdbData = await getMovieDetails(movie.tmdbId);
          if (tmdbData.poster_path !== movie.posterPath) {
            totalUpdated++;
          }
          return {
            ...movie,
            posterPath: tmdbData.poster_path,
            overview: tmdbData.overview || movie.overview,
          };
        } catch (error) {
          console.error(`Failed to fetch TMDB data for movie ${movie.tmdbId}:`, error);
          totalFailed++;
          return movie; // Keep existing data on failure
        }
      })
    );

    // Update collection
    await supabase
      .from("curated_collections")
      .update({
        movies: updatedMovies,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collection.id);
  }

  revalidatePath("/admin");
  revalidatePath("/search");

  return {
    collections: collections?.length || 0,
    updated: totalUpdated,
    failed: totalFailed,
  };
}
