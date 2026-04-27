"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import type { GetUserProfileStatsResult, UserProfileStats } from "./types";

// Shape of the JSON `results` column on `festival_results` when used to compute
// guessing accuracy. `nominator_reveals` maps nomination_id → user_id of the
// actual nominator.
type FestivalResultsGuessShape = {
  guesses?: { nominator_reveals?: Record<string, string> };
} | null;

/**
 * Compute guessing accuracy from nomination_guesses + festival_results.
 * Extracted from ProfileStats.tsx for reuse.
 */
async function computeGuessingAccuracy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ correct: number; total: number }> {
  const { data: userGuesses } = await supabase
    .from("nomination_guesses")
    .select("festival_id, guesses")
    .eq("user_id", userId);

  let totalGuessed = 0;
  let totalCorrect = 0;

  if (userGuesses && userGuesses.length > 0) {
    const festivalIds = [...new Set(userGuesses.map((g) => g.festival_id))];
    const { data: results } = await supabase
      .from("festival_results")
      .select("festival_id, results")
      .in("festival_id", festivalIds);

    const resultsMap = new Map(
      (results || []).map((r) => [r.festival_id, r.results as FestivalResultsGuessShape])
    );

    for (const guessRecord of userGuesses) {
      const resultsData = resultsMap.get(guessRecord.festival_id);
      if (!resultsData?.guesses?.nominator_reveals) continue;
      const nominatorReveals = resultsData.guesses.nominator_reveals as Record<string, string>;
      const userGuessesMap = guessRecord.guesses as Record<string, string>;

      for (const [nominationId, guessedUserId] of Object.entries(userGuessesMap)) {
        totalGuessed++;
        if (nominatorReveals[nominationId] === guessedUserId) {
          totalCorrect++;
        }
      }
    }
  }

  return { correct: totalCorrect, total: totalGuessed };
}

export async function getUserProfileStats(userId: string): Promise<GetUserProfileStatsResult> {
  try {
    const supabase = await createClient();

    // Parallel batch 1: independent queries
    const [
      userStatsResult,
      clubsResult,
      userResult,
      guessingAccuracy,
      ratingsResult,
      nominationsResult,
      standingsResult,
      allClubFestivalsResult,
    ] = await Promise.all([
      // 1. user_stats row
      supabase
        .from("user_stats")
        .select(
          "festivals_played, festivals_won, nominations_total, ratings_total, average_rating_given, total_points, highest_rated_movie_id, lowest_rated_movie_id"
        )
        .eq("user_id", userId)
        .maybeSingle(),

      // 2. clubs joined count
      supabase
        .from("club_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),

      // 3. movies watched count
      supabase.from("users").select("movies_watched_count").eq("id", userId).single(),

      // 4. guessing accuracy
      computeGuessingAccuracy(supabase, userId),

      // 5. all ratings by user (for distribution + timing)
      supabase
        .from("ratings")
        .select("rating, created_at, festival_id, nomination_id")
        .eq("user_id", userId),

      // 6. all nominations by user (for timing, genres, fun stats)
      supabase
        .from("nominations")
        .select("id, festival_id, tmdb_id, created_at, completed_at")
        .eq("user_id", userId)
        .is("deleted_at", null),

      // 7. all festival standings for podium + hot streak
      supabase
        .from("festival_standings")
        .select("festival_id, rank, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),

      // 8. all clubs user is in → all festivals (for participation rate)
      supabase.from("club_members").select("club_id").eq("user_id", userId),
    ]);

    const us = userStatsResult.data;
    const ratings = ratingsResult.data || [];
    const nominations = nominationsResult.data || [];
    const standings = standingsResult.data || [];

    // --- Overview ---
    const moviesWatched = userResult.data?.movies_watched_count || 0;
    const clubsJoined = clubsResult.count || 0;
    const festivalsPlayed = us?.festivals_played || 0;
    const festivalsWon = us?.festivals_won || 0;
    const nominationsTotal = us?.nominations_total || 0;
    const totalPoints = Number(us?.total_points || 0);

    // --- Ratings ---
    const ratingsGiven = us?.ratings_total || 0;
    const averageRatingGiven = Number(us?.average_rating_given || 0);

    // Rating distribution
    const ranges: Record<string, number> = { "0-2": 0, "2-4": 0, "4-6": 0, "6-8": 0, "8-10": 0 };
    for (const r of ratings) {
      const v = Number(r.rating);
      if (v < 2) ranges["0-2"]++;
      else if (v < 4) ranges["2-4"]++;
      else if (v < 6) ranges["4-6"]++;
      else if (v < 8) ranges["6-8"]++;
      else ranges["8-10"]++;
    }
    const ratingDistribution = Object.entries(ranges).map(([range, count]) => ({ range, count }));

    // Avg rating received on user's nominations
    const nominationIds = nominations.map((n) => n.id);
    let averageRatingReceived = 0;
    if (nominationIds.length > 0) {
      const { data: receivedRatings } = await supabase
        .from("ratings")
        .select("rating")
        .in("nomination_id", nominationIds);
      if (receivedRatings && receivedRatings.length > 0) {
        averageRatingReceived =
          receivedRatings.reduce((sum, r) => sum + Number(r.rating), 0) / receivedRatings.length;
      }
    }

    // Highest/lowest rated movies
    const movieIds = [us?.highest_rated_movie_id, us?.lowest_rated_movie_id].filter(
      (id): id is number => id != null && id > 0
    );
    let highestRatedMovie: UserProfileStats["highestRatedMovie"] = null;
    let lowestRatedMovie: UserProfileStats["lowestRatedMovie"] = null;
    if (movieIds.length > 0) {
      const { data: movies } = await supabase
        .from("movies")
        .select("tmdb_id, title, poster_path")
        .in("tmdb_id", movieIds);
      if (movies) {
        if (us?.highest_rated_movie_id) {
          const m = movies.find((mv) => mv.tmdb_id === us.highest_rated_movie_id);
          if (m)
            highestRatedMovie = {
              title: m.title,
              tmdbId: m.tmdb_id,
              posterPath: m.poster_path ?? undefined,
              rating: 0,
            };
        }
        if (us?.lowest_rated_movie_id) {
          const m = movies.find((mv) => mv.tmdb_id === us.lowest_rated_movie_id);
          if (m)
            lowestRatedMovie = {
              title: m.title,
              tmdbId: m.tmdb_id,
              posterPath: m.poster_path ?? undefined,
              rating: 0,
            };
        }
      }
    }

    // --- Festival Performance ---
    const winRate = festivalsPlayed > 0 ? festivalsWon / festivalsPlayed : 0;

    // Podium finishes
    const podium = { first: 0, second: 0, third: 0 };
    for (const s of standings) {
      if (s.rank === 1) podium.first++;
      else if (s.rank === 2) podium.second++;
      else if (s.rank === 3) podium.third++;
    }

    // Hot streak (consecutive wins)
    let hotStreak = 0;
    let currentStreak = 0;
    for (const s of standings) {
      if (s.rank === 1) {
        currentStreak++;
        hotStreak = Math.max(hotStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // --- Genres ---
    const tmdbIds = [
      ...new Set(nominations.map((n) => n.tmdb_id).filter((id): id is number => id != null)),
    ];
    let topGenres: { genre: string; count: number }[] = [];
    let genreLoyalty: UserProfileStats["genreLoyalty"] = null;
    let totalWatchTimeMinutes = 0;
    let longestMovie: UserProfileStats["longestMovie"] = null;
    let shortestMovie: UserProfileStats["shortestMovie"] = null;
    let averageMovieYear: number | null = null;
    const years: number[] = [];

    if (tmdbIds.length > 0) {
      const { data: movies } = await supabase
        .from("movies")
        .select("tmdb_id, title, genres, runtime, year")
        .in("tmdb_id", tmdbIds);

      if (movies) {
        // Genre counts
        const genreCounts: Record<string, number> = {};
        let totalGenreEntries = 0;

        for (const movie of movies) {
          if (movie.genres && Array.isArray(movie.genres)) {
            for (const genre of movie.genres) {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
              totalGenreEntries++;
            }
          }
          if (movie.runtime && movie.runtime > 0) {
            totalWatchTimeMinutes += movie.runtime;
            if (!longestMovie || movie.runtime > longestMovie.runtime) {
              longestMovie = { title: movie.title, runtime: movie.runtime };
            }
            if (!shortestMovie || movie.runtime < shortestMovie.runtime) {
              shortestMovie = { title: movie.title, runtime: movie.runtime };
            }
          }
          if (movie.year) years.push(movie.year);
        }

        topGenres = Object.entries(genreCounts)
          .map(([genre, count]) => ({ genre, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        // Genre loyalty
        if (topGenres.length > 0 && totalGenreEntries > 0) {
          genreLoyalty = {
            genre: topGenres[0].genre,
            percent: Math.round((topGenres[0].count / tmdbIds.length) * 100),
          };
        }

        // Average movie year
        if (years.length > 0) {
          averageMovieYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
        }
      }
    }

    // --- Timing Stats ---
    // Need festival data for timing calculations
    const festivalIds = [
      ...new Set([...nominations.map((n) => n.festival_id), ...ratings.map((r) => r.festival_id)]),
    ];

    let avgTimeToNominateHours: number | null = null;
    let avgTimeToRateHours: number | null = null;
    let earlyBirdPercent: number | null = null;
    let avgWatchTimeHours: number | null = null;

    if (festivalIds.length > 0) {
      const { data: festivals } = await supabase
        .from("festivals")
        .select("id, start_date, nomination_deadline, watch_deadline, rating_deadline")
        .in("id", festivalIds);

      if (festivals) {
        const festivalMap = new Map(festivals.map((f) => [f.id, f]));

        // Avg time to nominate (hours from festival start to nomination)
        const nominationDeltas: number[] = [];
        let earlyCount = 0;
        let totalWithDeadline = 0;

        for (const nom of nominations) {
          const fest = festivalMap.get(nom.festival_id);
          if (!fest?.start_date || !nom.created_at) continue;
          const delta = new Date(nom.created_at).getTime() - new Date(fest.start_date).getTime();
          if (delta >= 0) {
            nominationDeltas.push(delta / (1000 * 60 * 60));
          }
          // Early bird: nominated in first half of nomination window
          if (fest.nomination_deadline) {
            totalWithDeadline++;
            const windowMs =
              new Date(fest.nomination_deadline).getTime() - new Date(fest.start_date).getTime();
            if (windowMs > 0 && delta < windowMs / 2) {
              earlyCount++;
            }
          }
        }

        if (nominationDeltas.length > 0) {
          avgTimeToNominateHours = Math.round(
            nominationDeltas.reduce((a, b) => a + b, 0) / nominationDeltas.length
          );
        }
        if (totalWithDeadline > 0) {
          earlyBirdPercent = Math.round((earlyCount / totalWithDeadline) * 100);
        }

        // Avg time to rate (hours from watch deadline to rating)
        const ratingDeltas: number[] = [];
        for (const r of ratings) {
          const fest = festivalMap.get(r.festival_id);
          if (!fest?.watch_deadline || !r.created_at) continue;
          const delta = new Date(r.created_at).getTime() - new Date(fest.watch_deadline).getTime();
          if (delta >= 0) {
            ratingDeltas.push(delta / (1000 * 60 * 60));
          }
        }
        if (ratingDeltas.length > 0) {
          avgTimeToRateHours = Math.round(
            ratingDeltas.reduce((a, b) => a + b, 0) / ratingDeltas.length
          );
        }
      }
    }

    // Speed watcher: avg hours from nomination created_at to completed_at
    const watchDeltas: number[] = [];
    for (const nom of nominations) {
      if (nom.created_at && nom.completed_at) {
        const delta = new Date(nom.completed_at).getTime() - new Date(nom.created_at).getTime();
        if (delta > 0) {
          watchDeltas.push(delta / (1000 * 60 * 60));
        }
      }
    }
    if (watchDeltas.length > 0) {
      avgWatchTimeHours = Math.round(watchDeltas.reduce((a, b) => a + b, 0) / watchDeltas.length);
    }

    // --- Crowd Pleaser Score ---
    // % of user's nominations that scored above the festival average
    let crowdPleasePercent: number | null = null;
    if (nominationIds.length > 0 && festivalIds.length > 0) {
      // Get all ratings for these festivals to compute festival averages
      const { data: allFestivalRatings } = await supabase
        .from("ratings")
        .select("rating, nomination_id, festival_id")
        .in("festival_id", festivalIds);

      if (allFestivalRatings && allFestivalRatings.length > 0) {
        // Compute per-nomination average
        const nomAvgs = new Map<string, number[]>();
        for (const r of allFestivalRatings) {
          if (!nomAvgs.has(r.nomination_id)) nomAvgs.set(r.nomination_id, []);
          nomAvgs.get(r.nomination_id)!.push(Number(r.rating));
        }

        // Compute per-festival average
        const festAvgs = new Map<string, number>();
        const festRatingLists = new Map<string, number[]>();
        for (const r of allFestivalRatings) {
          if (!festRatingLists.has(r.festival_id)) festRatingLists.set(r.festival_id, []);
          festRatingLists.get(r.festival_id)!.push(Number(r.rating));
        }
        for (const [fid, rList] of festRatingLists) {
          festAvgs.set(fid, rList.reduce((a, b) => a + b, 0) / rList.length);
        }

        // Check each of user's nominations
        let aboveAvg = 0;
        let totalChecked = 0;
        for (const nom of nominations) {
          const nomRatings = nomAvgs.get(nom.id);
          const festAvg = festAvgs.get(nom.festival_id);
          if (nomRatings && nomRatings.length > 0 && festAvg != null) {
            const nomAvg = nomRatings.reduce((a, b) => a + b, 0) / nomRatings.length;
            totalChecked++;
            if (nomAvg >= festAvg) aboveAvg++;
          }
        }
        if (totalChecked > 0) {
          crowdPleasePercent = Math.round((aboveAvg / totalChecked) * 100);
        }
      }
    }

    // --- Participation Rate ---
    let participationRate: number | null = null;
    if (allClubFestivalsResult.data && allClubFestivalsResult.data.length > 0) {
      const clubIds = allClubFestivalsResult.data.map((m) => m.club_id);
      const { count: totalFestivals } = await supabase
        .from("festivals")
        .select("*", { count: "exact", head: true })
        .in("club_id", clubIds)
        .eq("status", "completed")
        .is("deleted_at", null);

      if (totalFestivals && totalFestivals > 0) {
        participationRate = Math.round((festivalsPlayed / totalFestivals) * 100);
      }
    }

    // --- Additional Fun Stats ---
    // Perfect scores (10.0 ratings given)
    const perfectScores = ratings.filter((r) => Number(r.rating) === 10).length;

    // Highest / lowest rating given
    const highestRatingGiven =
      ratings.length > 0 ? Math.max(...ratings.map((r) => Number(r.rating))) : null;
    const lowestRatingGiven =
      ratings.length > 0 ? Math.min(...ratings.map((r) => Number(r.rating))) : null;

    // Rating consistency (std dev of ratings — lower = more consistent)
    let ratingConsistency: number | null = null;
    if (ratings.length >= 3) {
      const ratingValues = ratings.map((r) => Number(r.rating));
      const mean = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
      const variance =
        ratingValues.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratingValues.length;
      ratingConsistency = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    // Favorite decade
    let favoriteDecade: string | null = null;
    if (years.length > 0) {
      const decadeCounts: Record<string, number> = {};
      for (const y of years) {
        const decade = `${Math.floor(y / 10) * 10}s`;
        decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
      }
      const sorted = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) favoriteDecade = sorted[0][0];
    }

    // Avg nominations per festival
    const festivalNomCounts = new Map<string, number>();
    for (const n of nominations) {
      festivalNomCounts.set(n.festival_id, (festivalNomCounts.get(n.festival_id) || 0) + 1);
    }
    const avgNominationsPerFestival =
      festivalNomCounts.size > 0
        ? Math.round((nominations.length / festivalNomCounts.size) * 10) / 10
        : null;

    // Unique genres explored
    const allGenres = new Set<string>();
    if (tmdbIds.length > 0) {
      for (const g of topGenres) allGenres.add(g.genre);
    }
    const uniqueGenresExplored = allGenres.size;

    // Movies from this year vs before 1980
    const currentYear = new Date().getFullYear();
    const moviesFromThisYear = years.filter((y) => y === currentYear).length;
    const moviesFromBefore1980 = years.filter((y) => y < 1980).length;

    return {
      data: {
        moviesWatched,
        clubsJoined,
        festivalsPlayed,
        festivalsWon,
        nominationsTotal,
        totalPoints,
        ratingsGiven,
        averageRatingGiven,
        averageRatingReceived: Math.round(averageRatingReceived * 10) / 10,
        ratingDistribution,
        highestRatedMovie,
        lowestRatedMovie,
        winRate,
        podiumFinishes: podium,
        guessingAccuracy,
        hotStreak,
        topGenres,
        avgTimeToNominateHours,
        avgTimeToRateHours,
        earlyBirdPercent,
        avgWatchTimeHours,
        totalWatchTimeMinutes,
        longestMovie,
        shortestMovie,
        averageMovieYear,
        crowdPleasePercent,
        genreLoyalty,
        participationRate,
        perfectScores,
        highestRatingGiven,
        lowestRatingGiven,
        ratingConsistency,
        favoriteDecade,
        avgNominationsPerFestival,
        uniqueGenresExplored,
        moviesFromThisYear,
        moviesFromBefore1980,
      },
    };
  } catch (error) {
    return handleActionError(error, "getUserProfileStats");
  }
}
