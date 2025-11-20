"use server";

import { createClient } from "@/lib/supabase/server";
import type { GetUserYearWrapStatsResult } from "./types";

/**
 * Check if two users share mutual club membership
 */
export async function checkMutualClubMembership(targetUserId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  if (user.id === targetUserId) return true;

  const { data, error } = await supabase.rpc("have_mutual_clubs", {
    user_a_id: user.id,
    user_b_id: targetUserId,
  });

  if (error) {
    console.error("Error checking mutual clubs:", error);
    return false;
  }

  return !!data;
}

/**
 * Get year-in-review stats for a user
 */
export async function getUserYearWrapStats(
  userId: string,
  year: number
): Promise<GetUserYearWrapStatsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Calculate year start and end dates
  const yearStart = new Date(year, 0, 1).toISOString();
  const yearEnd = new Date(year + 1, 0, 1).toISOString();

  // Get all festivals completed in this year
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("status", "completed")
    .gte("end_date", yearStart)
    .lt("end_date", yearEnd);

  const festivalIds = festivals?.map((f) => f.id) || [];

  // Get all nominations (movies watched) in this year
  const { data: nominations } = await supabase
    .from("nominations")
    .select("tmdb_id, movies:tmdb_id(genres)")
    .in(
      "festival_id",
      festivalIds.length > 0 ? festivalIds : ["00000000-0000-0000-0000-000000000000"]
    )
    .is("deleted_at", null);

  // Count unique movies watched
  const moviesWatched = new Set(nominations?.map((n) => n.tmdb_id) || []).size;

  // Get festivals won (rank 1 in festival_standings)
  const { data: standings } = await supabase
    .from("festival_standings")
    .select("festival_id")
    .eq("user_id", userId)
    .eq("rank", 1)
    .in(
      "festival_id",
      festivalIds.length > 0 ? festivalIds : ["00000000-0000-0000-0000-000000000000"]
    );

  const festivalsWon = standings?.length || 0;

  // Get ratings for movies watched this year
  const { data: ratings } = await supabase
    .from("ratings")
    .select("rating, nominations:nomination_id(tmdb_id)")
    .eq("user_id", userId)
    .gte("created_at", yearStart)
    .lt("created_at", yearEnd);

  // Calculate average rating
  const validRatings = ratings?.filter((r) => r.rating && r.nominations) || [];
  const averageRating =
    validRatings.length > 0
      ? validRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / validRatings.length
      : 0;

  // Get top genres from movies watched
  const genreCounts: Record<string, number> = {};
  nominations?.forEach((nom) => {
    const moviesRelation = Array.isArray(nom.movies) ? nom.movies[0] : nom.movies;
    const movie = moviesRelation as { genres?: string[] } | null;
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

  return {
    data: {
      moviesWatched,
      festivalsWon,
      topGenres,
      averageRating,
    },
  };
}
