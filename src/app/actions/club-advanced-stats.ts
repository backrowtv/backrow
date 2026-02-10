"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import type { ClubAdvancedStats, GetClubAdvancedStatsResult } from "./profile/types";

export async function getClubAdvancedStats(clubId: string): Promise<GetClubAdvancedStatsResult> {
  try {
    const supabase = await createClient();

    // Parallel batch: independent queries
    const [
      festivalsResult,
      _nominationsResult,
      _ratingsResult,
      membersResult,
      _standingsResult,
      _guessesResult,
    ] = await Promise.all([
      // All completed festivals with timing data
      supabase
        .from("festivals")
        .select(
          "id, theme, start_date, nomination_deadline, watch_deadline, rating_deadline, results_date, created_at, status"
        )
        .eq("club_id", clubId)
        .is("deleted_at", null),

      // All nominations in club festivals
      supabase
        .from("nominations")
        .select("id, festival_id, user_id, tmdb_id, created_at, completed_at")
        .eq("festival_id.club_id" as never, clubId) // will re-query below
        .is("deleted_at", null),

      // Placeholder — we'll query ratings after getting festival IDs
      Promise.resolve(null),

      // Club members for display names
      supabase
        .from("club_members")
        .select("user_id, users:user_id(id, display_name)")
        .eq("club_id", clubId),

      // Festival standings for guessing
      supabase
        .from("festival_standings")
        .select("festival_id, user_id, guessing_accuracy")
        .eq("festival_id.club_id" as never, clubId), // will re-query

      // Nomination guesses
      Promise.resolve(null),
    ]);

    const festivals = festivalsResult.data || [];
    const completedFestivals = festivals.filter((f) => f.status === "completed");
    const festivalIds = festivals.map((f) => f.id);
    const completedFestivalIds = completedFestivals.map((f) => f.id);

    if (festivalIds.length === 0) {
      return { data: emptyStats() };
    }

    // Batch 2: queries that depend on festival IDs
    const [nomsResult, allRatingsResult, festStandingsResult] = await Promise.all([
      supabase
        .from("nominations")
        .select("id, festival_id, user_id, tmdb_id, created_at, completed_at")
        .in("festival_id", festivalIds)
        .is("deleted_at", null),

      supabase
        .from("ratings")
        .select("rating, nomination_id, user_id, festival_id, created_at")
        .in("festival_id", festivalIds),

      supabase
        .from("festival_standings")
        .select("festival_id, user_id, guessing_accuracy")
        .in(
          "festival_id",
          completedFestivalIds.length > 0
            ? completedFestivalIds
            : ["00000000-0000-0000-0000-000000000000"]
        ),
    ]);

    const nominations = nomsResult.data || [];
    const allRatings = allRatingsResult.data || [];
    const allStandings = festStandingsResult.data || [];
    const members = membersResult.data || [];

    // Member name lookup
    const memberNames = new Map<string, string>();
    for (const m of members) {
      const user = m.users as unknown as { id: string; display_name: string } | null;
      if (user) memberNames.set(user.id, user.display_name);
    }

    // --- TIMING STATS ---
    // Avg festival duration
    const durations: number[] = [];
    let fastestFest: ClubAdvancedStats["fastestFestival"] = null;
    let slowestFest: ClubAdvancedStats["slowestFestival"] = null;

    for (const f of completedFestivals) {
      if (f.start_date && f.results_date) {
        const days =
          (new Date(f.results_date).getTime() - new Date(f.start_date).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days > 0) {
          durations.push(days);
          if (!fastestFest || days < fastestFest.days) {
            fastestFest = { theme: f.theme || "Untitled", days: Math.round(days) };
          }
          if (!slowestFest || days > slowestFest.days) {
            slowestFest = { theme: f.theme || "Untitled", days: Math.round(days) };
          }
        }
      }
    }
    const avgFestivalDurationDays =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    // Avg time to first nomination per festival
    const firstNomDeltas: number[] = [];
    const festivalNomMap = new Map<string, Date[]>();
    for (const n of nominations) {
      if (!n.created_at) continue;
      if (!festivalNomMap.has(n.festival_id)) festivalNomMap.set(n.festival_id, []);
      festivalNomMap.get(n.festival_id)!.push(new Date(n.created_at));
    }
    for (const f of festivals) {
      if (!f.start_date) continue;
      const noms = festivalNomMap.get(f.id);
      if (!noms || noms.length === 0) continue;
      const earliest = noms.reduce((min, d) => (d < min ? d : min));
      const delta = (earliest.getTime() - new Date(f.start_date).getTime()) / (1000 * 60 * 60);
      if (delta >= 0) firstNomDeltas.push(delta);
    }
    const avgTimeToFirstNominationHours =
      firstNomDeltas.length > 0
        ? Math.round(firstNomDeltas.reduce((a, b) => a + b, 0) / firstNomDeltas.length)
        : null;

    // Avg watch phase days + rating turnaround days
    const watchPhases: number[] = [];
    const ratingTurnarounds: number[] = [];
    for (const f of completedFestivals) {
      if (f.nomination_deadline && f.watch_deadline) {
        const days =
          (new Date(f.watch_deadline).getTime() - new Date(f.nomination_deadline).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days > 0) watchPhases.push(days);
      }
      if (f.watch_deadline && f.rating_deadline) {
        const days =
          (new Date(f.rating_deadline).getTime() - new Date(f.watch_deadline).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days > 0) ratingTurnarounds.push(days);
      }
    }
    const avgWatchPhaseDays =
      watchPhases.length > 0
        ? Math.round(watchPhases.reduce((a, b) => a + b, 0) / watchPhases.length)
        : null;
    const avgRatingTurnaroundDays =
      ratingTurnarounds.length > 0
        ? Math.round(ratingTurnarounds.reduce((a, b) => a + b, 0) / ratingTurnarounds.length)
        : null;

    // --- RATING ANALYTICS ---
    // Per-nomination rating stats for consensus/controversy
    const nomRatingMap = new Map<string, number[]>();
    const nomToFestival = new Map<string, string>();
    for (const n of nominations) {
      nomToFestival.set(n.id, n.festival_id);
    }
    for (const r of allRatings) {
      if (!nomRatingMap.has(r.nomination_id)) nomRatingMap.set(r.nomination_id, []);
      nomRatingMap.get(r.nomination_id)!.push(Number(r.rating));
    }

    // Need movie titles for controversial/unanimous
    const nomTmdbMap = new Map<string, number>();
    for (const n of nominations) {
      if (n.tmdb_id) nomTmdbMap.set(n.id, n.tmdb_id);
    }
    const allTmdbIds = [
      ...new Set(nominations.map((n) => n.tmdb_id).filter((id): id is number => id != null)),
    ];

    const movieTitleMap = new Map<number, string>();
    const movieMetaMap = new Map<
      number,
      {
        runtime: number | null;
        year: number | null;
        genres: string[] | null;
        director: string | null;
        cast: string[] | null;
      }
    >();

    if (allTmdbIds.length > 0) {
      const { data: movies } = await supabase
        .from("movies")
        .select("tmdb_id, title, runtime, year, genres, director, cast")
        .in("tmdb_id", allTmdbIds);
      if (movies) {
        for (const m of movies) {
          movieTitleMap.set(m.tmdb_id, m.title);
          movieMetaMap.set(m.tmdb_id, {
            runtime: m.runtime,
            year: m.year,
            genres: m.genres as string[] | null,
            director: m.director as string | null,
            cast: m.cast as string[] | null,
          });
        }
      }
    }

    // Compute std devs per nomination (min 3 ratings)
    const nomStdDevs: { nomId: string; stdDev: number; avg: number; tmdbId: number }[] = [];
    for (const [nomId, rList] of nomRatingMap) {
      if (rList.length < 3) continue;
      const avg = rList.reduce((a, b) => a + b, 0) / rList.length;
      const variance = rList.reduce((sum, r) => sum + (r - avg) ** 2, 0) / rList.length;
      const stdDev = Math.sqrt(variance);
      const tmdbId = nomTmdbMap.get(nomId);
      if (tmdbId) {
        nomStdDevs.push({ nomId, stdDev, avg, tmdbId });
      }
    }

    const ratingConsensusScore =
      nomStdDevs.length > 0
        ? Math.round((nomStdDevs.reduce((sum, s) => sum + s.stdDev, 0) / nomStdDevs.length) * 10) /
          10
        : null;

    // Most controversial (highest std dev)
    let mostControversialMovie: ClubAdvancedStats["mostControversialMovie"] = null;
    let mostUnanimousMovie: ClubAdvancedStats["mostUnanimousMovie"] = null;
    if (nomStdDevs.length > 0) {
      const sorted = [...nomStdDevs].sort((a, b) => b.stdDev - a.stdDev);
      const controversial = sorted[0];
      mostControversialMovie = {
        title: movieTitleMap.get(controversial.tmdbId) || "Unknown",
        stdDev: Math.round(controversial.stdDev * 10) / 10,
        avgRating: Math.round(controversial.avg * 10) / 10,
      };
      // Most unanimous: highest avg with lowest std dev (sort by stdDev ascending, break ties by avg descending)
      const unanimousSorted = [...nomStdDevs].sort((a, b) => a.stdDev - b.stdDev || b.avg - a.avg);
      const unanimous = unanimousSorted[0];
      mostUnanimousMovie = {
        title: movieTitleMap.get(unanimous.tmdbId) || "Unknown",
        stdDev: Math.round(unanimous.stdDev * 10) / 10,
        avgRating: Math.round(unanimous.avg * 10) / 10,
      };
    }

    // --- MOVIE STATS ---
    const totalMoviesWatched = allTmdbIds.length;
    let totalWatchTimeMinutes = 0;
    let avgMovieRuntime: number | null = null;
    let oldestMovie: ClubAdvancedStats["oldestMovie"] = null;
    let newestMovie: ClubAdvancedStats["newestMovie"] = null;
    let averageMovieYear: number | null = null;
    const genreCounts: Record<string, number> = {};
    const runtimes: number[] = [];
    const years: number[] = [];

    for (const [tmdbId, meta] of movieMetaMap) {
      if (meta.runtime && meta.runtime > 0) {
        totalWatchTimeMinutes += meta.runtime;
        runtimes.push(meta.runtime);
      }
      if (meta.year) {
        years.push(meta.year);
        const title = movieTitleMap.get(tmdbId) || "Unknown";
        if (!oldestMovie || meta.year < oldestMovie.year) {
          oldestMovie = { title, year: meta.year };
        }
        if (!newestMovie || meta.year > newestMovie.year) {
          newestMovie = { title, year: meta.year };
        }
      }
      if (meta.genres) {
        for (const g of meta.genres) {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
      }
    }
    if (runtimes.length > 0) {
      avgMovieRuntime = Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length);
    }
    if (years.length > 0) {
      averageMovieYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
    }
    const genreBreakdown = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top director and actor
    const directorCounts: Record<string, number> = {};
    const actorCounts: Record<string, number> = {};
    for (const [, meta] of movieMetaMap) {
      if (meta.director) {
        directorCounts[meta.director] = (directorCounts[meta.director] || 0) + 1;
      }
      if (meta.cast) {
        for (const actor of meta.cast) {
          actorCounts[actor] = (actorCounts[actor] || 0) + 1;
        }
      }
    }
    let topDirector: ClubAdvancedStats["topDirector"] = null;
    const directorEntries = Object.entries(directorCounts).sort((a, b) => b[1] - a[1]);
    if (directorEntries.length > 0) {
      topDirector = { name: directorEntries[0][0], count: directorEntries[0][1] };
    }
    let topActor: ClubAdvancedStats["topActor"] = null;
    const actorEntries = Object.entries(actorCounts).sort((a, b) => b[1] - a[1]);
    if (actorEntries.length > 0) {
      topActor = { name: actorEntries[0][0], count: actorEntries[0][1] };
    }

    // --- FUN / MEMBER SUPERLATIVES ---
    // Biggest crowd pleaser: member whose nominations get highest avg rating
    const memberNomRatings = new Map<string, number[]>();
    for (const n of nominations) {
      if (!n.user_id) continue;
      const nomRatings = nomRatingMap.get(n.id);
      if (!nomRatings || nomRatings.length === 0) continue;
      const avg = nomRatings.reduce((a, b) => a + b, 0) / nomRatings.length;
      if (!memberNomRatings.has(n.user_id)) memberNomRatings.set(n.user_id, []);
      memberNomRatings.get(n.user_id)!.push(avg);
    }

    let biggestCrowdPleaser: ClubAdvancedStats["biggestCrowdPleaser"] = null;
    if (memberNomRatings.size > 0) {
      let bestAvg = -1;
      let bestUserId = "";
      for (const [uid, avgs] of memberNomRatings) {
        if (avgs.length < 2) continue; // need at least 2 nominations
        const overallAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
        if (overallAvg > bestAvg) {
          bestAvg = overallAvg;
          bestUserId = uid;
        }
      }
      if (bestUserId) {
        biggestCrowdPleaser = {
          name: memberNames.get(bestUserId) || "Unknown",
          avgRating: Math.round(bestAvg * 10) / 10,
        };
      }
    }

    // Toughest critic + most generous rater
    const memberRatingAvgs = new Map<string, number[]>();
    for (const r of allRatings) {
      if (!memberRatingAvgs.has(r.user_id)) memberRatingAvgs.set(r.user_id, []);
      memberRatingAvgs.get(r.user_id)!.push(Number(r.rating));
    }

    let toughestCritic: ClubAdvancedStats["toughestCritic"] = null;
    let mostGenerousRater: ClubAdvancedStats["mostGenerousRater"] = null;
    if (memberRatingAvgs.size > 0) {
      let lowestAvg = Infinity;
      let highestAvg = -Infinity;
      let lowestUid = "";
      let highestUid = "";
      for (const [uid, rList] of memberRatingAvgs) {
        if (rList.length < 5) continue; // need enough ratings
        const avg = rList.reduce((a, b) => a + b, 0) / rList.length;
        if (avg < lowestAvg) {
          lowestAvg = avg;
          lowestUid = uid;
        }
        if (avg > highestAvg) {
          highestAvg = avg;
          highestUid = uid;
        }
      }
      if (lowestUid) {
        toughestCritic = {
          name: memberNames.get(lowestUid) || "Unknown",
          avgRating: Math.round(lowestAvg * 10) / 10,
        };
      }
      if (highestUid) {
        mostGenerousRater = {
          name: memberNames.get(highestUid) || "Unknown",
          avgRating: Math.round(highestAvg * 10) / 10,
        };
      }
    }

    // Best guesser: highest guessing accuracy
    let bestGuesser: ClubAdvancedStats["bestGuesser"] = null;
    const memberGuessAccuracy = new Map<string, number[]>();
    for (const s of allStandings) {
      if (s.guessing_accuracy != null) {
        if (!memberGuessAccuracy.has(s.user_id)) memberGuessAccuracy.set(s.user_id, []);
        memberGuessAccuracy.get(s.user_id)!.push(Number(s.guessing_accuracy));
      }
    }
    if (memberGuessAccuracy.size > 0) {
      let bestAcc = -1;
      let bestUid = "";
      for (const [uid, accs] of memberGuessAccuracy) {
        const avg = accs.reduce((a, b) => a + b, 0) / accs.length;
        if (avg > bestAcc) {
          bestAcc = avg;
          bestUid = uid;
        }
      }
      if (bestUid) {
        bestGuesser = {
          name: memberNames.get(bestUid) || "Unknown",
          accuracy: Math.round(bestAcc),
        };
      }
    }

    // Nomination speed demon: fastest avg nomination time
    const memberNomDeltas = new Map<string, number[]>();
    for (const n of nominations) {
      if (!n.user_id || !n.created_at) continue;
      const fest = festivals.find((f) => f.id === n.festival_id);
      if (!fest?.start_date) continue;
      const delta =
        (new Date(n.created_at).getTime() - new Date(fest.start_date).getTime()) / (1000 * 60 * 60);
      if (delta >= 0) {
        if (!memberNomDeltas.has(n.user_id)) memberNomDeltas.set(n.user_id, []);
        memberNomDeltas.get(n.user_id)!.push(delta);
      }
    }

    let nominationSpeedDemon: ClubAdvancedStats["nominationSpeedDemon"] = null;
    if (memberNomDeltas.size > 0) {
      let fastestAvg = Infinity;
      let fastestUid = "";
      for (const [uid, deltas] of memberNomDeltas) {
        if (deltas.length < 2) continue;
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        if (avg < fastestAvg) {
          fastestAvg = avg;
          fastestUid = uid;
        }
      }
      if (fastestUid) {
        nominationSpeedDemon = {
          name: memberNames.get(fastestUid) || "Unknown",
          avgHours: Math.round(fastestAvg),
        };
      }
    }

    // Bold Choices: member whose nominations get the LOWEST avg rating (min 2 noms)
    let boldChoices: ClubAdvancedStats["boldChoices"] = null;
    if (memberNomRatings.size > 0) {
      let worstAvg = Infinity;
      let worstUid = "";
      for (const [uid, avgs] of memberNomRatings) {
        if (avgs.length < 2) continue;
        const overallAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
        if (overallAvg < worstAvg) {
          worstAvg = overallAvg;
          worstUid = uid;
        }
      }
      if (worstUid) {
        boldChoices = {
          name: memberNames.get(worstUid) || "Unknown",
          avgRating: Math.round(worstAvg * 10) / 10,
        };
      }
    }

    // Completionist: highest rating completion rate (ratings given / total movies in festivals attended)
    let completionist: ClubAdvancedStats["completionist"] = null;
    const memberFestivals = new Map<string, Set<string>>();
    for (const r of allRatings) {
      if (!memberFestivals.has(r.user_id)) memberFestivals.set(r.user_id, new Set());
      memberFestivals.get(r.user_id)!.add(r.festival_id);
    }
    // Count total nominations per festival (movies to rate)
    const festivalNomCounts = new Map<string, number>();
    for (const n of nominations) {
      festivalNomCounts.set(n.festival_id, (festivalNomCounts.get(n.festival_id) || 0) + 1);
    }
    if (memberFestivals.size > 0) {
      let bestPct = -1;
      let bestUid = "";
      for (const [uid, festSet] of memberFestivals) {
        const userRatings = allRatings.filter((r) => r.user_id === uid).length;
        let totalExpected = 0;
        for (const fid of festSet) {
          totalExpected += festivalNomCounts.get(fid) || 0;
        }
        if (totalExpected > 0) {
          const pct = Math.round((userRatings / totalExpected) * 100);
          if (pct > bestPct) {
            bestPct = pct;
            bestUid = uid;
          }
        }
      }
      if (bestUid) {
        completionist = {
          name: memberNames.get(bestUid) || "Unknown",
          percent: bestPct,
        };
      }
    }

    // Bombshell: member who received the most 10/10 ratings on their nominations
    let bombshell: ClubAdvancedStats["bombshell"] = null;
    const memberPerfectReceived = new Map<string, number>();
    for (const n of nominations) {
      if (!n.user_id) continue;
      const nomRatings = nomRatingMap.get(n.id);
      if (!nomRatings) continue;
      const perfects = nomRatings.filter((r) => r === 10).length;
      if (perfects > 0) {
        memberPerfectReceived.set(
          n.user_id,
          (memberPerfectReceived.get(n.user_id) || 0) + perfects
        );
      }
    }
    if (memberPerfectReceived.size > 0) {
      let maxPerfects = 0;
      let maxUid = "";
      for (const [uid, count] of memberPerfectReceived) {
        if (count > maxPerfects) {
          maxPerfects = count;
          maxUid = uid;
        }
      }
      if (maxUid) {
        bombshell = {
          name: memberNames.get(maxUid) || "Unknown",
          count: maxPerfects,
        };
      }
    }

    // Busiest month
    const monthCounts: Record<string, number> = {};
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
    for (const f of festivals) {
      if (f.created_at) {
        const d = new Date(f.created_at);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      }
    }
    let busiestMonth: ClubAdvancedStats["busiestMonth"] = null;
    if (Object.keys(monthCounts).length > 0) {
      const [month, count] = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
      busiestMonth = { month, count };
    }

    return {
      data: {
        avgFestivalDurationDays,
        avgTimeToFirstNominationHours,
        avgWatchPhaseDays,
        avgRatingTurnaroundDays,
        fastestFestival: fastestFest,
        slowestFestival: slowestFest,
        ratingConsensusScore,
        mostControversialMovie,
        mostUnanimousMovie,
        totalMoviesWatched,
        totalWatchTimeMinutes,
        avgMovieRuntime,
        oldestMovie,
        newestMovie,
        averageMovieYear,
        genreBreakdown,
        topDirector,
        topActor,
        biggestCrowdPleaser,
        boldChoices,
        toughestCritic,
        mostGenerousRater,
        bestGuesser,
        completionist,
        nominationSpeedDemon,
        bombshell,
        busiestMonth,
      },
    };
  } catch (error) {
    return handleActionError(error, "getClubAdvancedStats");
  }
}

function emptyStats(): ClubAdvancedStats {
  return {
    avgFestivalDurationDays: null,
    avgTimeToFirstNominationHours: null,
    avgWatchPhaseDays: null,
    avgRatingTurnaroundDays: null,
    fastestFestival: null,
    slowestFestival: null,
    ratingConsensusScore: null,
    mostControversialMovie: null,
    mostUnanimousMovie: null,
    totalMoviesWatched: 0,
    totalWatchTimeMinutes: 0,
    avgMovieRuntime: null,
    oldestMovie: null,
    newestMovie: null,
    averageMovieYear: null,
    genreBreakdown: [],
    topDirector: null,
    topActor: null,
    biggestCrowdPleaser: null,
    boldChoices: null,
    toughestCritic: null,
    mostGenerousRater: null,
    bestGuesser: null,
    completionist: null,
    nominationSpeedDemon: null,
    bombshell: null,
    busiestMonth: null,
  };
}
