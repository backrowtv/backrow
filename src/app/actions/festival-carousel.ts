"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import type { CarouselMovie } from "@/components/festivals";

export interface FestivalCarouselData {
  festivalId: string;
  movies: CarouselMovie[];
  theme: string;
  phase: string;
  ratingDeadline: string | null;
  guessingEnabled: boolean;
}

/**
 * Get nominations for a standard festival in Watch & Rate phase
 * Returns data formatted for MovieCarousel
 */
export async function getFestivalCarouselMovies(
  festivalId: string
): Promise<FestivalCarouselData | { error: string }> {
  const supabase = await createClient();

  try {
    // Get festival details
    const { data: festival, error: festivalError } = await supabase
      .from("festivals")
      .select("id, theme, phase, rating_deadline, club_id")
      .eq("id", festivalId)
      .single();

    if (festivalError || !festival) {
      return { error: "Festival not found" };
    }

    // Get club settings for guessing
    const { data: club } = await supabase
      .from("clubs")
      .select("settings")
      .eq("id", festival.club_id)
      .single();

    const settings = (club?.settings as Record<string, unknown>) || {};
    const guessingEnabled = (settings.guessing_enabled as boolean) ?? false;

    // Get all nominations with movie and nominator data
    const { data: nominations, error } = await supabase
      .from("nominations")
      .select(
        `
        id,
        tmdb_id,
        pitch,
        created_at,
        user_id,
        movie:movies!inner(
          tmdb_id,
          slug,
          title,
          year,
          poster_url,
          runtime,
          director,
          genres
        ),
        nominator:users!nominations_user_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq("festival_id", festivalId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      return handleActionError(error, {
        action: "getFestivalCarouselMovies",
        metadata: { festivalId },
      });
    }

    // Transform to CarouselMovie format
    const movies: CarouselMovie[] = (nominations || []).map((nom) => {
      const movie = Array.isArray(nom.movie) ? nom.movie[0] : nom.movie;
      const nominator = Array.isArray(nom.nominator) ? nom.nominator[0] : nom.nominator;

      // Parse runtime to number
      const runtimeNum = movie.runtime
        ? typeof movie.runtime === "string"
          ? parseInt(movie.runtime, 10)
          : movie.runtime
        : null;

      return {
        id: nom.id,
        tmdb_id: movie.tmdb_id,
        slug: movie.slug || null,
        title: movie.title,
        year: movie.year,
        poster_url: movie.poster_url,
        curator_note: nom.pitch,
        runtime: runtimeNum,
        director: movie.director,
        genres: movie.genres || null,
        nominator: nominator
          ? {
              id: nominator.id,
              display_name: nominator.display_name,
              avatar_url: nominator.avatar_url,
            }
          : null,
      };
    });

    return {
      festivalId: festival.id,
      movies,
      theme: festival.theme || "Festival",
      phase: festival.phase,
      ratingDeadline: festival.rating_deadline,
      guessingEnabled,
    };
  } catch (error) {
    return handleActionError(error, {
      action: "getFestivalCarouselMovies",
      metadata: { festivalId },
    });
  }
}

/**
 * Get watched movies for a user (returns set of tmdb_ids)
 */
export async function getWatchedMoviesForUser(tmdbIds: number[]): Promise<Set<number>> {
  if (tmdbIds.length === 0) return new Set();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("watch_history")
    .select("tmdb_id")
    .eq("user_id", user.id)
    .in("tmdb_id", tmdbIds);

  return new Set((data || []).map((w) => w.tmdb_id));
}

/**
 * Get user ratings for nominations in a festival
 */
export async function getUserRatingsForFestival(
  nominationIds: string[],
  festivalId: string
): Promise<Map<string, number>> {
  if (nominationIds.length === 0) return new Map();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data } = await supabase
    .from("ratings")
    .select("nomination_id, rating")
    .eq("user_id", user.id)
    .eq("festival_id", festivalId)
    .in("nomination_id", nominationIds);

  const ratingsMap = new Map<string, number>();
  for (const r of data || []) {
    ratingsMap.set(r.nomination_id, r.rating);
  }
  return ratingsMap;
}
