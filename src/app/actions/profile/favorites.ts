"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateUser } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import type { FavoriteItemType, UserFavorite } from "@/types/favorites";
import { cachePerson } from "@/app/actions/persons";
import { cacheMovie } from "@/app/actions/movies";

const MAX_FEATURED = 4;

/**
 * Get all favorites for a user, ordered by sort_order
 */
export async function getUserFavorites(
  userId?: string
): Promise<{ data?: UserFavorite[]; error?: string }> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in" };
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) return handleActionError(error, "getUserFavorites");

  const favorites = (data as UserFavorite[]) || [];

  // Enrich movie favorites with cached metadata from movies table
  const movieFavs = favorites.filter((f) => f.item_type === "movie");
  if (movieFavs.length > 0) {
    const tmdbIds = movieFavs.map((f) => f.tmdb_id);
    const { data: movies } = await supabase
      .from("movies")
      .select("tmdb_id, director, certification, runtime, genres")
      .in("tmdb_id", tmdbIds);

    const cachedMovieIds = new Set(movies?.map((m) => m.tmdb_id) || []);
    const missingMovieIds = tmdbIds.filter((id) => !cachedMovieIds.has(id));

    // Cache missing movies
    if (missingMovieIds.length > 0) {
      await Promise.allSettled(missingMovieIds.map((id) => cacheMovie(id)));
      const { data: newMovies } = await supabase
        .from("movies")
        .select("tmdb_id, director, certification, runtime, genres")
        .in("tmdb_id", missingMovieIds);
      if (newMovies) movies?.push(...newMovies);
    }

    if (movies) {
      const movieMap = new Map(movies.map((m) => [m.tmdb_id, m]));
      for (const fav of favorites) {
        if (fav.item_type === "movie") {
          const movie = movieMap.get(fav.tmdb_id);
          if (movie) {
            fav.director = movie.director;
            fav.certification = movie.certification;
            fav.runtime = movie.runtime;
            fav.genres = movie.genres;
          }
        }
      }
    }
  }

  // Enrich person favorites with cached metadata from persons table
  const personFavs = favorites.filter((f) => f.item_type === "person");
  if (personFavs.length > 0) {
    const tmdbIds = personFavs.map((f) => f.tmdb_id);

    // First query to find which persons are already cached
    const { data: persons } = await supabase
      .from("persons")
      .select("tmdb_id, birthday, deathday, place_of_birth, known_for_department")
      .in("tmdb_id", tmdbIds);

    const cachedIds = new Set(persons?.map((p) => p.tmdb_id) || []);
    const missingIds = tmdbIds.filter((id) => !cachedIds.has(id));

    // Cache missing persons (fire and forget — don't block on failure)
    if (missingIds.length > 0) {
      await Promise.allSettled(missingIds.map((id) => cachePerson(id)));
      // Re-query to get the newly cached data
      const { data: newPersons } = await supabase
        .from("persons")
        .select("tmdb_id, birthday, deathday, place_of_birth, known_for_department")
        .in("tmdb_id", missingIds);
      if (newPersons) persons?.push(...newPersons);
    }

    if (persons) {
      const personMap = new Map(persons.map((p) => [p.tmdb_id, p]));
      for (const fav of favorites) {
        if (fav.item_type === "person") {
          const person = personMap.get(fav.tmdb_id);
          if (person) {
            fav.birthday = person.birthday;
            fav.deathday = person.deathday;
            fav.place_of_birth = person.place_of_birth;
            fav.known_for_department = person.known_for_department;
          }
        }
      }
    }
  }

  return { data: favorites };
}

/**
 * Get only featured favorites (for ID card display)
 */
export async function getFeaturedFavorites(
  userId?: string
): Promise<{ data?: UserFavorite[]; error?: string }> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in" };
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true });

  if (error) return handleActionError(error, "getFeaturedFavorites");
  return { data: (data as UserFavorite[]) || [] };
}

/**
 * Add a new favorite
 */
export async function addFavorite(
  tmdbId: number,
  itemType: FavoriteItemType,
  title: string,
  imagePath: string | null,
  subtitle: string | null
): Promise<{ success?: boolean; error?: string; data?: UserFavorite }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in" };

  // Get the next sort_order
  const { data: maxRow } = await supabase
    .from("user_favorites")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("user_favorites")
    .insert({
      user_id: user.id,
      tmdb_id: tmdbId,
      item_type: itemType,
      title,
      image_path: imagePath,
      subtitle,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This item is already in your favorites" };
    }
    return handleActionError(error, "addFavorite");
  }

  // Enrich the new favorite with cached metadata
  const fav = data as UserFavorite;
  if (itemType === "movie") {
    await cacheMovie(tmdbId).catch(() => {});
    const { data: movie } = await supabase
      .from("movies")
      .select("director, certification, runtime, genres")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();
    if (movie) {
      fav.director = movie.director;
      fav.certification = movie.certification;
      fav.runtime = movie.runtime;
      fav.genres = movie.genres;
    }
  } else {
    await cachePerson(tmdbId).catch(() => {});
    const { data: person } = await supabase
      .from("persons")
      .select("birthday, deathday, place_of_birth, known_for_department")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();
    if (person) {
      fav.birthday = person.birthday;
      fav.deathday = person.deathday;
      fav.place_of_birth = person.place_of_birth;
      fav.known_for_department = person.known_for_department;
    }
  }

  invalidateUser(user.id);
  return { success: true, data: fav };
}

/**
 * Remove a favorite
 */
export async function removeFavorite(
  favoriteId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in" };

  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("id", favoriteId)
    .eq("user_id", user.id);

  if (error) return handleActionError(error, "removeFavorite");

  invalidateUser(user.id);
  return { success: true };
}

/**
 * Toggle featured status for a favorite (max 4 featured)
 */
export async function toggleFeatured(
  favoriteId: string,
  featured: boolean
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in" };

  // Check featured count if trying to feature
  if (featured) {
    const { count } = await supabase
      .from("user_favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_featured", true);

    if ((count ?? 0) >= MAX_FEATURED) {
      return { error: `Maximum ${MAX_FEATURED} featured items allowed` };
    }
  }

  const { error } = await supabase
    .from("user_favorites")
    .update({ is_featured: featured })
    .eq("id", favoriteId)
    .eq("user_id", user.id);

  if (error) return handleActionError(error, "toggleFeatured");

  invalidateUser(user.id);
  return { success: true };
}

/**
 * Reorder favorites by providing the full ordered list of IDs
 */
export async function reorderFavorites(
  orderedIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in" };

  // Update each favorite's sort_order to match its position in the array
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("user_favorites")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("user_id", user.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return handleActionError(failed.error, "reorderFavorites");

  invalidateUser(user.id);
  return { success: true };
}
