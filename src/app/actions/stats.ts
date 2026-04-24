"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";

// Helper function to format month label (e.g., "2024-01" -> "Jan 2024")
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

import type {
  FestivalParticipationData,
  RatingDistributionData,
  TopRatedMovieData,
  MemberActivityData,
  FestivalCompletionData,
  RatingTrendsData,
} from "./stats.types";

async function _getFestivalParticipationData(
  clubId: string
): Promise<{ data: FestivalParticipationData[] } | { error: string }> {
  try {
    const supabase = await createClient();

    const { data: festivals, error } = await supabase
      .from("festivals")
      .select("created_at")
      .eq("club_id", clubId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      return handleActionError(error, "_getFestivalParticipationData");
    }

    if (!festivals || festivals.length === 0) {
      return { data: [] };
    }

    // Group by month/year
    const monthMap = new Map<string, number>();

    festivals.forEach((festival) => {
      const date = new Date(festival.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });

    // Convert to array and format month labels
    const data: FestivalParticipationData[] = Array.from(monthMap.entries())
      .map(([month, count]) => ({
        month: formatMonthLabel(month),
        count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { data };
  } catch (error) {
    return handleActionError(error, "_getFestivalParticipationData");
  }
}

export async function getFestivalParticipationData(
  clubId: string
): Promise<{ data: FestivalParticipationData[] } | { error: string }> {
  return _getFestivalParticipationData(clubId);
}

async function _getRatingDistributionData(
  clubId: string
): Promise<{ data: RatingDistributionData[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // First get all festivals for this club
    const { data: festivals, error: festivalsError } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .is("deleted_at", null);

    if (festivalsError) {
      return handleActionError(festivalsError, "_getRatingDistributionData");
    }

    if (!festivals || festivals.length === 0) {
      return { data: [] };
    }

    const festivalIds = festivals.map((f) => f.id);

    // Get ratings for these festivals
    const { data: ratings, error } = await supabase
      .from("ratings")
      .select("rating")
      .in("festival_id", festivalIds);

    if (error) {
      return handleActionError(error, "_getRatingDistributionData");
    }

    if (!ratings || ratings.length === 0) {
      return { data: [] };
    }

    // Group into ranges
    const ranges = {
      "0-2": 0,
      "2-4": 0,
      "4-6": 0,
      "6-8": 0,
      "8-10": 0,
    };

    ratings.forEach((rating) => {
      const value = Number(rating.rating);
      if (value < 2) {
        ranges["0-2"]++;
      } else if (value < 4) {
        ranges["2-4"]++;
      } else if (value < 6) {
        ranges["4-6"]++;
      } else if (value < 8) {
        ranges["6-8"]++;
      } else {
        ranges["8-10"]++;
      }
    });

    const data: RatingDistributionData[] = Object.entries(ranges).map(([range, count]) => ({
      range,
      count,
    }));

    return { data };
  } catch (error) {
    return handleActionError(error, "_getRatingDistributionData");
  }
}

export async function getRatingDistributionData(
  clubId: string
): Promise<{ data: RatingDistributionData[] } | { error: string }> {
  return _getRatingDistributionData(clubId);
}

async function _getTopRatedMoviesData(
  clubId: string
): Promise<{ data: TopRatedMovieData[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // First get all festivals for this club
    const { data: festivals, error: festivalsError } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .is("deleted_at", null);

    if (festivalsError) {
      return handleActionError(festivalsError, "_getTopRatedMoviesData");
    }

    if (!festivals || festivals.length === 0) {
      return { data: [] };
    }

    const festivalIds = festivals.map((f) => f.id);

    // Get nominations for these festivals
    const { data: nominations, error: nominationsError } = await supabase
      .from("nominations")
      .select("id, tmdb_id")
      .in("festival_id", festivalIds)
      .is("deleted_at", null);

    if (nominationsError) {
      return handleActionError(nominationsError, "_getTopRatedMoviesData");
    }

    if (!nominations || nominations.length === 0) {
      return { data: [] };
    }

    const nominationIds = nominations.map((n) => n.id);

    // Get ratings for these nominations
    const { data: ratings, error: ratingsError } = await supabase
      .from("ratings")
      .select("rating, nomination_id")
      .in("nomination_id", nominationIds);

    if (ratingsError) {
      return handleActionError(ratingsError, "_getTopRatedMoviesData");
    }

    if (!ratings || ratings.length === 0) {
      return { data: [] };
    }

    // Get unique movie IDs from nominations
    const movieIds = new Set(
      nominations
        .map((n) => n.tmdb_id)
        .filter((id): id is number => id !== null && id !== undefined)
    );

    if (movieIds.size === 0) {
      return { data: [] };
    }

    const { data: movies, error: moviesError } = await supabase
      .from("movies")
      .select("tmdb_id, title")
      .in("tmdb_id", Array.from(movieIds));

    if (moviesError) {
      return handleActionError(moviesError, "_getTopRatedMoviesData");
    }

    // Aggregate ratings by movie
    const movieRatings = new Map<number, number[]>();

    // Create a map of nomination_id to tmdb_id
    const nominationToMovie = new Map<string, number>();
    nominations.forEach((nom) => {
      if (nom.tmdb_id) {
        nominationToMovie.set(nom.id, nom.tmdb_id);
      }
    });

    ratings.forEach((rating) => {
      const movieId = nominationToMovie.get(rating.nomination_id);
      if (movieId) {
        if (!movieRatings.has(movieId)) {
          movieRatings.set(movieId, []);
        }
        movieRatings.get(movieId)!.push(Number(rating.rating));
      }
    });

    // Calculate averages and filter by minimum 3 ratings
    const movieData: Array<{
      tmdb_id: number;
      title: string;
      avgRating: number;
      ratingCount: number;
    }> = [];

    movieRatings.forEach((ratingValues, tmdbId) => {
      if (ratingValues.length >= 3) {
        const avgRating = ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length;
        const movie = movies?.find((m) => m.tmdb_id === tmdbId);
        if (movie) {
          movieData.push({
            tmdb_id: tmdbId,
            title: movie.title,
            avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            ratingCount: ratingValues.length,
          });
        }
      }
    });

    // Sort by average rating descending and limit to top 10
    const data: TopRatedMovieData[] = movieData
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10)
      .map((m) => ({
        title: m.title,
        avgRating: m.avgRating,
        ratingCount: m.ratingCount,
      }));

    return { data };
  } catch (error) {
    return handleActionError(error, "_getTopRatedMoviesData");
  }
}

export async function getTopRatedMoviesData(
  clubId: string
): Promise<{ data: TopRatedMovieData[] } | { error: string }> {
  return _getTopRatedMoviesData(clubId);
}

async function _getMemberActivityData(
  clubId: string
): Promise<{ data: MemberActivityData[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // First get all festivals for this club
    const { data: festivals, error: festivalsError } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .is("deleted_at", null);

    if (festivalsError) {
      return handleActionError(festivalsError, "_getMemberActivityData");
    }

    if (!festivals || festivals.length === 0) {
      return { data: [] };
    }

    const festivalIds = festivals.map((f) => f.id);

    // Fetch nominations and ratings in parallel
    const [nominationsResult, ratingsResult] = await Promise.all([
      supabase
        .from("nominations")
        .select("user_id")
        .in("festival_id", festivalIds)
        .is("deleted_at", null),
      supabase.from("ratings").select("user_id").in("festival_id", festivalIds),
    ]);

    if (nominationsResult.error) {
      return handleActionError(nominationsResult.error, "_getMemberActivityData");
    }

    if (ratingsResult.error) {
      return handleActionError(ratingsResult.error, "_getMemberActivityData");
    }

    // Count activity per user
    const userActivity = new Map<string, number>();

    nominationsResult.data?.forEach((nomination) => {
      const userId = nomination.user_id;
      if (userId) {
        userActivity.set(userId, (userActivity.get(userId) || 0) + 1);
      }
    });

    ratingsResult.data?.forEach((rating) => {
      const userId = rating.user_id;
      if (userId) {
        userActivity.set(userId, (userActivity.get(userId) || 0) + 1);
      }
    });

    if (userActivity.size === 0) {
      return { data: [] };
    }

    // Get user display names
    const userIds = Array.from(userActivity.keys());
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, display_name")
      .in("id", userIds);

    if (usersError) {
      return handleActionError(usersError, "_getMemberActivityData");
    }

    // Create data array with user names
    const data: MemberActivityData[] = Array.from(userActivity.entries())
      .map(([userId, activity]) => {
        const user = users?.find((u) => u.id === userId);
        return {
          name: user?.display_name || "Unknown",
          activity,
        };
      })
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 10); // Top 10 most active members

    return { data };
  } catch (error) {
    return handleActionError(error, "_getMemberActivityData");
  }
}

export async function getMemberActivityData(
  clubId: string
): Promise<{ data: MemberActivityData[] } | { error: string }> {
  return _getMemberActivityData(clubId);
}

async function _getFestivalCompletionData(
  clubId: string
): Promise<{ data: FestivalCompletionData[] } | { error: string }> {
  try {
    const supabase = await createClient();

    const { data: festivals, error } = await supabase
      .from("festivals")
      .select("status")
      .eq("club_id", clubId)
      .is("deleted_at", null);

    if (error) {
      return handleActionError(error, "_getFestivalCompletionData");
    }

    if (!festivals || festivals.length === 0) {
      return { data: [] };
    }

    let completed = 0;
    let incomplete = 0;

    festivals.forEach((festival) => {
      if (festival.status === "completed") {
        completed++;
      } else {
        incomplete++;
      }
    });

    const data: FestivalCompletionData[] = [
      { name: "Completed", value: completed },
      { name: "Incomplete", value: incomplete },
    ];

    return { data };
  } catch (error) {
    return handleActionError(error, "_getFestivalCompletionData");
  }
}

export async function getFestivalCompletionData(
  clubId: string
): Promise<{ data: FestivalCompletionData[] } | { error: string }> {
  return _getFestivalCompletionData(clubId);
}

async function _getRatingTrendsData(
  clubId: string
): Promise<{ data: RatingTrendsData[] } | { error: string }> {
  try {
    const supabase = await createClient();

    // First get all festivals for this club
    const { data: festivals, error: festivalsError } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .is("deleted_at", null);

    if (festivalsError) {
      return handleActionError(festivalsError, "_getRatingTrendsData");
    }

    if (!festivals || festivals.length === 0) {
      return { data: [] };
    }

    const festivalIds = festivals.map((f) => f.id);

    // Get ratings for these festivals
    const { data: ratings, error } = await supabase
      .from("ratings")
      .select("rating, created_at")
      .in("festival_id", festivalIds)
      .order("created_at", { ascending: true });

    if (error) {
      return handleActionError(error, "_getRatingTrendsData");
    }

    if (!ratings || ratings.length === 0) {
      return { data: [] };
    }

    // Group by month and calculate average rating
    const monthRatings = new Map<string, number[]>();

    ratings.forEach((rating) => {
      const date = new Date(rating.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthRatings.has(monthKey)) {
        monthRatings.set(monthKey, []);
      }
      monthRatings.get(monthKey)!.push(Number(rating.rating));
    });

    // Calculate averages
    const data: RatingTrendsData[] = Array.from(monthRatings.entries())
      .map(([month, ratingValues]) => {
        const avgRating = ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length;
        return {
          month: formatMonthLabel(month),
          avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return { data };
  } catch (error) {
    return handleActionError(error, "_getRatingTrendsData");
  }
}

export async function getRatingTrendsData(
  clubId: string
): Promise<{ data: RatingTrendsData[] } | { error: string }> {
  return _getRatingTrendsData(clubId);
}
