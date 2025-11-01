/**
 * Test Factory — Festival Data Generation
 *
 * Create festivals at any phase with nominations, ratings, guesses, and results.
 */

import { supabase, ensureMovie } from "./client";
import { pickMovies, type TestMovie } from "./movies";
import type { CreatedUser } from "./users";

export type FestivalPhase = "theme_selection" | "nomination" | "watch_rate" | "results";

export interface CreatedFestival {
  id: string;
  slug: string;
  phase: FestivalPhase;
}

/**
 * Create a festival at a specific phase.
 * Generates appropriate data for all preceding phases.
 */
export async function createFestival(opts: {
  clubId: string;
  seasonId: string;
  theme?: string | null;
  phase?: FestivalPhase;
  members: CreatedUser[];
  nominationsPerMember?: number;
  ratingMin?: number;
  ratingMax?: number;
  ratingIncrement?: number;
  dates?: {
    startDate?: Date;
    nominationDeadline?: Date;
    watchDeadline?: Date;
    resultsDate?: Date;
    createdAt?: Date;
  };
  moviePool?: TestMovie[];
  populateGuesses?: boolean;
  /** Fraction of members who submit ratings (0-1). Default 1.0 (all members). */
  ratingParticipation?: number;
}): Promise<CreatedFestival> {
  const phase = opts.phase || "nomination";
  const theme = opts.theme === null ? null : opts.theme || "Action Classics";
  const slug = `festival-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // Date calculation — use provided dates or default to now-relative
  const now = new Date();
  const startDate = opts.dates?.startDate || new Date(now.getTime() - 3 * 86400000);
  const nomDeadline = opts.dates?.nominationDeadline || new Date(now.getTime() + 7 * 86400000);
  const watchDeadline = opts.dates?.watchDeadline || new Date(now.getTime() + 14 * 86400000);
  const resultsDate = opts.dates?.resultsDate || undefined;
  const createdAt = opts.dates?.createdAt || now;

  const insertData: Record<string, unknown> = {
    club_id: opts.clubId,
    season_id: opts.seasonId,
    slug,
    phase,
    status:
      phase === "results"
        ? "completed"
        : phase === "watch_rate"
          ? "watching"
          : phase === "nomination"
            ? "nominating"
            : "idle",
    member_count_at_creation: opts.members.length,
    start_date: startDate.toISOString(),
    nomination_deadline: nomDeadline.toISOString(),
    watch_deadline: watchDeadline.toISOString(),
    created_at: createdAt.toISOString(),
  };

  // Only set theme if not null (theme_selection phase may have no theme)
  if (theme !== null) {
    insertData.theme = theme;
  }

  if (resultsDate) {
    insertData.results_date = resultsDate.toISOString();
  }

  const { data: festival, error } = await supabase
    .from("festivals")
    .insert(insertData)
    .select("id, slug, phase")
    .single();

  if (error) throw new Error(`Failed to create festival: ${error.message}`);

  // Generate data for completed phases
  if (["nomination", "watch_rate", "results"].includes(phase)) {
    await populateNominations(
      festival.id,
      opts.members,
      opts.nominationsPerMember || 1,
      opts.moviePool
    );
  }

  if (["watch_rate", "results"].includes(phase)) {
    await populateRatings(
      festival.id,
      opts.members,
      opts.ratingMin ?? 1,
      opts.ratingMax ?? 10,
      opts.ratingIncrement ?? 0.5,
      opts.ratingParticipation
    );
  }

  if (opts.populateGuesses && ["watch_rate", "results"].includes(phase)) {
    await populateGuesses(festival.id, opts.members);
  }

  if (phase === "results") {
    await populateResults(festival.id, opts.members);
  }

  return { id: festival.id, slug: festival.slug, phase };
}

/**
 * Create nominations for a festival.
 * Each member nominates N random movies.
 */
export async function populateNominations(
  festivalId: string,
  members: CreatedUser[],
  perMember: number = 1,
  moviePool?: TestMovie[]
): Promise<string[]> {
  const totalMovies = members.length * perMember;
  const movies = pickMovies(totalMovies, moviePool);
  const nominationIds: string[] = [];
  let movieIdx = 0;

  for (const member of members) {
    for (let i = 0; i < perMember && movieIdx < movies.length; i++) {
      const movie = movies[movieIdx++];

      // Ensure movie exists with verified poster from TMDB
      await ensureMovie(movie);

      const { data, error } = await supabase
        .from("nominations")
        .insert({
          festival_id: festivalId,
          user_id: member.id,
          tmdb_id: movie.tmdbId,
          pitch: `Great ${movie.title} pick for the festival!`,
        })
        .select("id")
        .single();

      if (error) {
        console.warn(`Warning: nomination insert failed: ${error.message}`);
      } else {
        nominationIds.push(data.id);
      }
    }
  }

  return nominationIds;
}

/**
 * Create ratings for all nominations in a festival.
 * Each member rates all movies (except optionally their own).
 * Generates realistic-ish random ratings.
 */
export async function populateRatings(
  festivalId: string,
  members: CreatedUser[],
  ratingMin: number = 1,
  ratingMax: number = 10,
  ratingIncrement: number = 0.5,
  participationRate: number = 1.0
): Promise<void> {
  // Get all nominations for this festival
  const { data: nominations } = await supabase
    .from("nominations")
    .select("id, user_id, tmdb_id")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  if (!nominations || nominations.length === 0) return;

  // Determine which members participate in rating
  const ratingMembers =
    participationRate < 1.0 ? members.filter(() => Math.random() < participationRate) : members;

  // Ensure at least 2 members rate (for meaningful results)
  const effectiveMembers = ratingMembers.length < 2 ? members.slice(0, 2) : ratingMembers;

  for (const member of effectiveMembers) {
    for (const nomination of nominations) {
      // Generate a realistic rating (bell curve around 6-7 on 1-10 scale)
      const range = ratingMax - ratingMin;
      const center = ratingMin + range * 0.65;
      const spread = range * 0.25;

      let raw = center + (Math.random() - 0.5) * 2 * spread;
      // Add some variance
      raw += (Math.random() - 0.5) * spread;
      // Clamp
      raw = Math.max(ratingMin, Math.min(ratingMax, raw));
      // Round to increment
      const rating = Math.round(raw / ratingIncrement) * ratingIncrement;

      const { error } = await supabase.from("ratings").insert({
        festival_id: festivalId,
        nomination_id: nomination.id,
        user_id: member.id,
        rating: Math.max(ratingMin, Math.min(ratingMax, rating)),
      });

      if (error && !error.message.includes("duplicate")) {
        console.warn(`Warning: rating insert failed: ${error.message}`);
      }
    }
  }
}

/**
 * Create guesses for who nominated each movie.
 * ~80% of members submit guesses with varying accuracy.
 */
export async function populateGuesses(
  festivalId: string,
  members: CreatedUser[],
  participationRate: number = 0.8
): Promise<void> {
  // Get nominations to know who actually nominated what
  const { data: nominations } = await supabase
    .from("nominations")
    .select("id, user_id")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  if (!nominations || nominations.length < 3) return; // Need 3+ for guessing
  if (members.length < 3) return;

  // Decide which members guess
  const guessers = members.filter(() => Math.random() < participationRate);
  if (guessers.length === 0) return;

  // Assign accuracy tiers: high (40-60%), mid (20-40%), low (0-20%)
  const tiers = ["high", "mid", "low"] as const;

  for (const guesser of guessers) {
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const accuracyChance =
      tier === "high"
        ? 0.4 + Math.random() * 0.2
        : tier === "mid"
          ? 0.2 + Math.random() * 0.2
          : Math.random() * 0.2;

    const guesses: Record<string, string> = {};

    for (const nomination of nominations) {
      // Skip own nomination (can't guess yourself)
      if (nomination.user_id === guesser.id) continue;

      // Decide if this guess is correct based on accuracy tier
      const isCorrect = Math.random() < accuracyChance;

      if (isCorrect) {
        guesses[nomination.id] = nomination.user_id;
      } else {
        // Pick a random other member (not the guesser, not the real nominator)
        const candidates = members.filter(
          (m) => m.id !== guesser.id && m.id !== nomination.user_id
        );
        if (candidates.length > 0) {
          guesses[nomination.id] = candidates[Math.floor(Math.random() * candidates.length)].id;
        }
      }
    }

    if (Object.keys(guesses).length === 0) continue;

    const { error } = await supabase.from("nomination_guesses").insert({
      festival_id: festivalId,
      user_id: guesser.id,
      guesses,
    });

    if (error && !error.message.includes("duplicate")) {
      console.warn(`Warning: guess insert failed: ${error.message}`);
    }
  }
}

/**
 * Generate and store festival results.
 * Matches the production calculateResults() output including
 * movie_title, user_name, guesses section, and tie-splitting.
 */
export async function populateResults(festivalId: string, members: CreatedUser[]): Promise<void> {
  // Get nominations with movie titles
  const { data: nominations } = await supabase
    .from("nominations")
    .select("id, user_id, tmdb_id")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  // Get ratings
  const { data: ratings } = await supabase
    .from("ratings")
    .select("id, nomination_id, user_id, rating")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  if (!nominations || !ratings) return;

  // Look up movie titles
  const tmdbIds = [...new Set(nominations.map((n) => n.tmdb_id))];
  const { data: movies } = await supabase
    .from("movies")
    .select("tmdb_id, title")
    .in("tmdb_id", tmdbIds);

  const movieTitleMap: Record<number, string> = {};
  movies?.forEach((m) => {
    movieTitleMap[m.tmdb_id] = m.title;
  });

  // Look up user display names
  const userIds = [...new Set(members.map((m) => m.id))];
  const { data: users } = await supabase
    .from("users")
    .select("id, display_name, email")
    .in("id", userIds);

  const userNameMap: Record<string, string> = {};
  users?.forEach((u) => {
    userNameMap[u.id] = u.display_name || u.email || "Unknown";
  });

  // Build rating lookup map: nomination_id -> ratings[]
  const ratingsByNomination = new Map<string, number[]>();
  ratings.forEach((r) => {
    const existing = ratingsByNomination.get(r.nomination_id) || [];
    existing.push(Number(r.rating));
    ratingsByNomination.set(r.nomination_id, existing);
  });

  // Calculate average rating per nomination
  const nominationAvgs = nominations.map((nom) => {
    const nomRatings = ratingsByNomination.get(nom.id) || [];
    const avg =
      nomRatings.length > 0
        ? Math.round((nomRatings.reduce((s, r) => s + r, 0) / nomRatings.length) * 10) / 10
        : 0;
    return {
      ...nom,
      avgRating: avg,
      ratingCount: nomRatings.length,
    };
  });

  // Sort by average rating descending
  nominationAvgs.sort((a, b) => b.avgRating - a.avgRating);

  // Calculate user averages for standings (avg rating GIVEN by each user)
  const userRatingMap: Record<string, number[]> = {};
  ratings.forEach((r) => {
    if (!userRatingMap[r.user_id]) userRatingMap[r.user_id] = [];
    userRatingMap[r.user_id].push(Number(r.rating));
  });

  const userAverages = Object.entries(userRatingMap).map(([userId, vals]) => ({
    userId,
    avgRating: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    ratingsCount: vals.length,
    nominationsCount: nominations.filter((n) => n.user_id === userId).length,
  }));

  // Sort by average rating descending
  userAverages.sort((a, b) => b.avgRating - a.avgRating);

  // Group by ties and assign ranks (matching production tie-splitting)
  const totalParticipants = userAverages.length;
  const placementGroups: Array<{ place: number; users: typeof userAverages; avgRating: number }> =
    [];
  let currentPlace = 1;

  for (let i = 0; i < userAverages.length; i++) {
    const current = userAverages[i];
    const tied = [current];

    while (i + 1 < userAverages.length && userAverages[i + 1].avgRating === current.avgRating) {
      tied.push(userAverages[i + 1]);
      i++;
    }

    placementGroups.push({ place: currentPlace, users: tied, avgRating: current.avgRating });
    currentPlace += tied.length;
  }

  // Assign points with tie-splitting (linear: totalParticipants - place + 1)
  const getPoints = (place: number) => totalParticipants - place + 1;

  const userPointsMap: Record<string, { rank: number; points: number }> = {};

  for (const group of placementGroups) {
    const placePoints = getPoints(group.place);

    let pointsPerUser = placePoints;
    if (group.users.length > 1 && group.place + group.users.length <= totalParticipants) {
      const nextPlacePoints = getPoints(group.place + group.users.length);
      pointsPerUser = Math.round(((placePoints + nextPlacePoints) / 2) * 10) / 10;
    }

    for (const u of group.users) {
      userPointsMap[u.userId] = { rank: group.place, points: pointsPerUser };
    }
  }

  // Load guesses from nomination_guesses table
  const { data: allGuesses } = await supabase
    .from("nomination_guesses")
    .select("user_id, guesses")
    .eq("festival_id", festivalId);

  // Build nominator reveals map
  const nominatorReveals: Record<string, string> = {};
  nominations.forEach((nom) => {
    if (nom.user_id) nominatorReveals[nom.id] = nom.user_id;
  });

  // Calculate guessing accuracy
  const guessingResults: Array<{
    user_id: string;
    user_name: string;
    guesses: Record<string, string>;
    correct_count: number;
    total_guessed: number;
    accuracy: number;
  }> = [];

  if (allGuesses) {
    for (const guessRecord of allGuesses) {
      if (!guessRecord.user_id || !guessRecord.guesses) continue;
      const guesses = guessRecord.guesses as Record<string, string>;
      let correctCount = 0;
      let totalGuessed = 0;

      for (const [nomId, guessedUserId] of Object.entries(guesses)) {
        if (nominatorReveals[nomId]) {
          totalGuessed++;
          if (nominatorReveals[nomId] === guessedUserId) correctCount++;
        }
      }

      const accuracy = totalGuessed > 0 ? Math.round((correctCount / totalGuessed) * 1000) / 10 : 0;

      guessingResults.push({
        user_id: guessRecord.user_id,
        user_name: userNameMap[guessRecord.user_id] || "Unknown",
        guesses,
        correct_count: correctCount,
        total_guessed: totalGuessed,
        accuracy,
      });
    }
  }

  guessingResults.sort((a, b) => b.accuracy - a.accuracy);

  const totalGuessers = guessingResults.length;
  const totalGuesses = guessingResults.reduce((s, g) => s + g.total_guessed, 0);
  const totalCorrect = guessingResults.reduce((s, g) => s + g.correct_count, 0);
  const avgAccuracy =
    totalGuessers > 0
      ? Math.round((guessingResults.reduce((s, g) => s + g.accuracy, 0) / totalGuessers) * 10) / 10
      : 0;

  // Write festival_standings (normalized rows)
  for (const ua of userAverages) {
    const placement = userPointsMap[ua.userId];
    const guesser = guessingResults.find((g) => g.user_id === ua.userId);

    await supabase.from("festival_standings").upsert(
      {
        festival_id: festivalId,
        user_id: ua.userId,
        rank: placement?.rank ?? 0,
        points: placement?.points ?? 0,
        average_rating: ua.avgRating,
        ratings_count: ua.ratingsCount,
        nominations_count: ua.nominationsCount,
        correct_guesses: guesser?.correct_count ?? 0,
        guessing_accuracy: guesser?.accuracy ?? 0,
        guessing_points: 0,
      },
      { onConflict: "festival_id,user_id" }
    );
  }

  // Build full FestivalResults JSON (matching src/types/festival-results.ts)
  const results = {
    nominations: nominationAvgs.map((n, idx) => ({
      nomination_id: n.id,
      tmdb_id: n.tmdb_id,
      movie_title: movieTitleMap[n.tmdb_id] || null,
      average_rating: n.avgRating,
      rating_count: n.ratingCount,
      nominator_user_id: n.user_id,
      placement: idx + 1,
    })),
    standings: Object.entries(userPointsMap)
      .map(([userId, { points }]) => ({
        user_id: userId,
        user_name: userNameMap[userId] || "Unknown",
        points,
      }))
      .sort((a, b) => b.points - a.points),
    guesses: {
      guessers: guessingResults,
      stats: {
        total_guessers: totalGuessers,
        total_guesses: totalGuesses,
        total_correct: totalCorrect,
        average_accuracy: avgAccuracy,
      },
      nominator_reveals: nominatorReveals,
    },
    calculated_at: new Date().toISOString(),
    member_count_at_creation: members.length,
  };

  await supabase.from("festival_results").upsert(
    {
      festival_id: festivalId,
      results,
      calculated_at: new Date().toISOString(),
      is_final: true,
    },
    { onConflict: "festival_id" }
  );
}
