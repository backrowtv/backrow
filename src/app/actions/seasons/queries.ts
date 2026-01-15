"use server";

/**
 * Season Queries
 *
 * Query functions for season data and statistics.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Get season wrap statistics for display in SeasonWrap component
 */
export async function getSeasonWrapStats(
  clubId: string,
  seasonId: string
): Promise<{
  error?: string;
  data?: {
    totalMovies: number;
    totalFestivals: number;
    festivalsWon: number;
    topGenres: Array<{ genre: string; count: number }>;
    topMovies: Array<{ title: string; tmdb_id: number; poster_url: string | null }>;
    totalRatings: number;
    avgRating: number;
  };
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Get season
  const { data: season } = await supabase
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("id", seasonId)
    .eq("club_id", clubId)
    .single();

  if (!season) {
    return { error: "Season not found" };
  }

  // Get all festivals in this season
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", clubId)
    .eq("season_id", seasonId)
    .eq("status", "completed");

  const festivalIds = festivals?.map((f) => f.id) || [];

  if (festivalIds.length === 0) {
    return {
      data: {
        totalMovies: 0,
        totalFestivals: 0,
        festivalsWon: 0,
        topGenres: [],
        topMovies: [],
        totalRatings: 0,
        avgRating: 0,
      },
    };
  }

  // Get all nominations (movies watched)
  const { data: nominations } = await supabase
    .from("nominations")
    .select("tmdb_id, movies:tmdb_id(title, genres, poster_url)")
    .in("festival_id", festivalIds)
    .is("deleted_at", null);

  const totalMovies = new Set(nominations?.map((n) => n.tmdb_id) || []).size;
  const totalFestivals = festivalIds.length;

  // Get genres from movies
  type MovieData = { title: string; genres: string[] | null; poster_url: string | null };
  const genreCounts: Record<string, number> = {};
  nominations?.forEach((nomination) => {
    // Handle Supabase join which may return object or array
    const rawMovie = nomination.movies as MovieData | MovieData[] | null;
    const movie = Array.isArray(rawMovie) ? rawMovie[0] : rawMovie;
    if (movie?.genres && Array.isArray(movie.genres)) {
      movie.genres.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });

  const topGenres = Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get top movies (by ratings)
  const { data: ratings } = await supabase
    .from("ratings")
    .select(
      "nomination_id, rating, nominations:nomination_id(tmdb_id, movies:tmdb_id(title, poster_url))"
    )
    .in("festival_id", festivalIds);

  const movieRatings: Record<
    number,
    { sum: number; count: number; title: string; poster_url: string | null }
  > = {};

  // Type for nested movie data
  type NestedMovieData = { title: string; poster_url: string | null };
  type NestedNominationData = {
    tmdb_id: number;
    movies: NestedMovieData | NestedMovieData[] | null;
  };

  ratings?.forEach((rating) => {
    // Handle Supabase joins which may return objects or arrays
    const rawNominations = rating.nominations as
      | NestedNominationData
      | NestedNominationData[]
      | null;
    const nomination = Array.isArray(rawNominations) ? rawNominations[0] : rawNominations;

    if (nomination?.tmdb_id) {
      const tmdbId = nomination.tmdb_id;
      const rawMovie = nomination.movies;
      const movie = Array.isArray(rawMovie) ? rawMovie[0] : rawMovie;

      if (!movieRatings[tmdbId]) {
        movieRatings[tmdbId] = {
          sum: 0,
          count: 0,
          title: movie?.title || "Unknown",
          poster_url: movie?.poster_url || null,
        };
      }
      movieRatings[tmdbId].sum += Number(rating.rating) || 0;
      movieRatings[tmdbId].count += 1;
    }
  });

  const topMovies = Object.entries(movieRatings)
    .map(([tmdbId, data]) => ({
      tmdb_id: parseInt(tmdbId),
      title: data.title,
      poster_url: data.poster_url,
      avgRating: data.count > 0 ? data.sum / data.count : 0,
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 4)
    .map((m) => ({ tmdb_id: m.tmdb_id, title: m.title, poster_url: m.poster_url }));

  // Calculate average rating
  const totalRatings = ratings?.length || 0;
  const ratingSum = ratings?.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) || 0;
  const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;

  // Get club settings to determine if scoring/wins are applicable
  const { data: club } = await supabase.from("clubs").select("settings").eq("id", clubId).single();

  const clubSettings = (club?.settings as Record<string, unknown>) || {};

  // Only calculate wins for clubs with scoring enabled
  let festivalsWon = 0;
  if (clubSettings.scoring_enabled === true) {
    const { data: standings } = await supabase
      .from("festival_standings")
      .select("user_id, rank")
      .in("festival_id", festivalIds)
      .eq("user_id", user.id)
      .eq("rank", 1);

    festivalsWon = standings?.length || 0;
  }

  return {
    data: {
      totalMovies,
      totalFestivals,
      festivalsWon,
      topGenres,
      topMovies,
      totalRatings,
      avgRating,
    },
  };
}
