"use server";

/**
 * Festival Results
 *
 * Calculate and retrieve festival results including standings,
 * ratings, and guessing accuracy.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { FestivalResults } from "@/types/festival-results";
import { handleActionError } from "@/lib/errors/handler";
import { checkRelevantBadges, checkFestivalAchievements } from "../badges";
import { checkAndAwardClubBadges } from "../club-badges";

export async function calculateResults(festivalId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, status, member_count_at_creation")
    .eq("id", festivalId)
    .is("deleted_at", null)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check user is producer
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "producer") {
    return { error: "Only the producer can calculate results" };
  }

  // Check if results already cached
  // Note: If results exist, they must be deleted first (happens automatically when rolling back from results phase)
  const { data: existingResults } = await supabase
    .from("festival_results")
    .select("id")
    .eq("festival_id", festivalId)
    .maybeSingle();

  if (existingResults) {
    return {
      error:
        "Results have already been calculated. To recalculate, first roll back to the Watch & Rate phase (this will delete the cached results), then advance back to Results.",
    };
  }

  // Get all nominations with movie titles
  const { data: nominations, error: nominationsError } = await supabase
    .from("nominations")
    .select(
      `
      id,
      tmdb_id,
      user_id,
      movies:tmdb_id (
        title
      )
    `
    )
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  if (nominationsError) {
    return { error: nominationsError.message };
  }

  if (!nominations || nominations.length === 0) {
    return { error: "No nominations found" };
  }

  // Get all ratings
  const { data: ratings, error: ratingsError } = await supabase
    .from("ratings")
    .select("nomination_id, user_id, rating")
    .eq("festival_id", festivalId);

  if (ratingsError) {
    return { error: ratingsError.message };
  }

  if (!ratings || ratings.length === 0) {
    return { error: "No ratings found" };
  }

  // Build a Map of nomination_id -> ratings for O(1) lookups (avoids O(n*m) nested filtering)
  const ratingsByNomination = new Map<string, number[]>();
  ratings.forEach((r) => {
    const existing = ratingsByNomination.get(r.nomination_id) || [];
    existing.push(Number(r.rating));
    ratingsByNomination.set(r.nomination_id, existing);
  });

  // Calculate average rating per nomination using the pre-built map
  const nominationAverages: Record<string, number> = {};
  const nominationRatings: Record<string, number[]> = {};

  nominations.forEach((nom) => {
    const nomRatings = ratingsByNomination.get(nom.id) || [];

    nominationRatings[nom.id] = nomRatings;
    if (nomRatings.length > 0) {
      const sum = nomRatings.reduce((a, b) => a + b, 0);
      const avg = sum / nomRatings.length;
      // Round to one decimal place
      nominationAverages[nom.id] = Math.round(avg * 10) / 10;
    } else {
      nominationAverages[nom.id] = 0;
    }
  });

  // Get club settings for placement-based scoring
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("settings")
    .eq("id", festival.club_id)
    .single();

  if (clubError) {
    return handleActionError(clubError, { action: "calculateResults", silent: true });
  }

  const settings = (club?.settings as Record<string, unknown>) || {};
  const placementPoints = settings.placement_points as
    | {
        type?: string;
        rules?: Array<{ from: number; to: number; points: number }>;
        points?: Array<{ place: number; points: number | null }>;
        formula?: string;
      }
    | Array<{ place: number; points: number | null }>
    | undefined;

  // Calculate user rankings based on average rating given
  // This determines placement for scoring
  const userRatings: Record<string, number[]> = {};
  ratings.forEach((rating) => {
    const userId = rating.user_id;
    if (!userId) return;
    if (!userRatings[userId]) {
      userRatings[userId] = [];
    }
    userRatings[userId].push(Number(rating.rating));
  });

  // Calculate average rating per user
  const userAverages: Array<{ userId: string; avgRating: number }> = [];
  Object.entries(userRatings).forEach(([userId, ratings]) => {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    userAverages.push({ userId, avgRating: Math.round(avg * 10) / 10 });
  });

  // Sort by average rating (descending) to determine placement
  userAverages.sort((a, b) => b.avgRating - a.avgRating);

  // Handle ties - group users with same average rating
  const placementGroups: Array<{ place: number; users: string[]; avgRating: number }> = [];
  let currentPlace = 1;
  for (let i = 0; i < userAverages.length; i++) {
    const current = userAverages[i];
    const tiedUsers = [current.userId];

    // Find all users with the same average rating
    while (i + 1 < userAverages.length && userAverages[i + 1].avgRating === current.avgRating) {
      tiedUsers.push(userAverages[i + 1].userId);
      i++;
    }

    placementGroups.push({
      place: currentPlace,
      users: tiedUsers,
      avgRating: current.avgRating,
    });

    currentPlace += tiedUsers.length;
  }

  // Calculate points based on placement
  const userPoints: Record<string, number> = {};
  const totalParticipants = placementGroups.reduce((sum, group) => sum + group.users.length, 0);

  const getPointsForPlace = (place: number): number => {
    // Default linear: points = total_participants - place + 1
    const basePoints = totalParticipants - place + 1;

    if (!placementPoints) {
      return basePoints;
    }

    // Handle legacy array format (PlacementPoint[])
    if (Array.isArray(placementPoints)) {
      const customPoint = placementPoints.find((p) => p.place === place);
      return customPoint?.points ?? basePoints;
    }

    // Handle object format
    if (placementPoints.type === "default") {
      return basePoints;
    }

    if (placementPoints.type === "custom") {
      // New rules format (PlacementRule[] with from/to ranges)
      if (placementPoints.rules) {
        const rule = placementPoints.rules.find((r) => place >= r.from && place <= r.to);
        return rule?.points ?? 0; // Unassigned placements get 0
      }
      // Legacy points format
      if (placementPoints.points) {
        const customPoint = placementPoints.points.find((p) => p.place === place);
        return customPoint?.points ?? basePoints;
      }
    }

    // Legacy formula type falls back to linear
    return basePoints;
  };

  // Assign points to each placement group (split for ties)
  placementGroups.forEach((group) => {
    const placePoints = getPointsForPlace(group.place);

    // If this group has ties, calculate points for next place too
    let nextPlacePoints = 0;
    if (group.users.length > 1 && group.place + group.users.length <= totalParticipants) {
      nextPlacePoints = getPointsForPlace(group.place + group.users.length);
    }

    // Split points: average of current place and next place (if tied)
    const pointsPerUser =
      group.users.length > 1 && nextPlacePoints > 0
        ? (placePoints + nextPlacePoints) / 2
        : placePoints;

    group.users.forEach((userId) => {
      userPoints[userId] = Math.round(pointsPerUser * 10) / 10;
    });
  });

  // Get user names
  const userIds = Object.keys(userPoints);
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, display_name, email")
    .in("id", userIds);

  if (usersError) {
    return { error: usersError.message };
  }

  // Get all nomination guesses
  const { data: allGuesses, error: guessesError } = await supabase
    .from("nomination_guesses")
    .select("user_id, guesses")
    .eq("festival_id", festivalId);

  if (guessesError) {
    return { error: guessesError.message };
  }

  // Create map of actual nominators (nomination_id -> user_id)
  const actualNominators: Record<string, string> = {};
  nominations.forEach((nom) => {
    if (nom.user_id) {
      actualNominators[nom.id] = nom.user_id;
    }
  });

  // Calculate guessing accuracy for each guesser
  const guessingResults: Array<{
    user_id: string;
    user_name: string;
    guesses: Record<string, string>; // nomination_id -> guessed_user_id
    correct_count: number;
    total_guessed: number;
    accuracy: number; // percentage
  }> = [];

  if (allGuesses) {
    // Get user names for guessers
    const guesserUserIds = [
      ...new Set(allGuesses.map((g) => g.user_id).filter(Boolean) as string[]),
    ];
    const { data: guesserUsers, error: guesserUsersError } = await supabase
      .from("users")
      .select("id, display_name, email")
      .in("id", guesserUserIds);

    if (guesserUsersError) {
      // Log error but continue - guessing results can still be calculated
      handleActionError(guesserUsersError, { action: "calculateResults", silent: true });
    }

    allGuesses.forEach((guessRecord) => {
      if (!guessRecord.user_id || !guessRecord.guesses) return;

      const guesses = guessRecord.guesses as Record<string, string>;
      let correctCount = 0;
      let totalGuessed = 0;

      // Check each guess against actual nominator
      Object.entries(guesses).forEach(([nominationId, guessedUserId]) => {
        if (actualNominators[nominationId]) {
          totalGuessed++;
          if (actualNominators[nominationId] === guessedUserId) {
            correctCount++;
          }
        }
      });

      const guesserUser = guesserUsers?.find((u) => u.id === guessRecord.user_id);
      const accuracy = totalGuessed > 0 ? (correctCount / totalGuessed) * 100 : 0;

      guessingResults.push({
        user_id: guessRecord.user_id,
        user_name: guesserUser?.display_name || guesserUser?.email || "Unknown",
        guesses,
        correct_count: correctCount,
        total_guessed: totalGuessed,
        accuracy: Math.round(accuracy * 10) / 10, // Round to one decimal
      });
    });
  }

  // Calculate overall guessing statistics
  const totalGuessers = guessingResults.length;
  const totalGuesses = guessingResults.reduce((sum, g) => sum + g.total_guessed, 0);
  const totalCorrect = guessingResults.reduce((sum, g) => sum + g.correct_count, 0);
  const averageAccuracy =
    totalGuessers > 0 ? guessingResults.reduce((sum, g) => sum + g.accuracy, 0) / totalGuessers : 0;

  // Format results
  const results: FestivalResults = {
    nominations: nominations.map((nom) => ({
      nomination_id: nom.id,
      tmdb_id: nom.tmdb_id,
      movie_title: (() => {
        const moviesRelation = Array.isArray(nom.movies) ? nom.movies[0] : nom.movies;
        return (moviesRelation as { title?: string } | null)?.title || null;
      })(),
      average_rating: nominationAverages[nom.id] || 0,
      rating_count: nominationRatings[nom.id]?.length || 0,
      nominator_user_id: nom.user_id || null, // Include actual nominator for guessing reveals
    })),
    standings: Object.entries(userPoints)
      .map(([userId, points]) => {
        const user = users?.find((u) => u.id === userId);
        return {
          user_id: userId,
          user_name: user?.display_name || user?.email || "Unknown",
          points: Math.round(points * 10) / 10, // Round to one decimal
        };
      })
      .sort((a, b) => b.points - a.points),
    guesses: {
      guessers: guessingResults.sort((a, b) => b.accuracy - a.accuracy), // Sort by accuracy descending
      stats: {
        total_guessers: totalGuessers,
        total_guesses: totalGuesses,
        total_correct: totalCorrect,
        average_accuracy: Math.round(averageAccuracy * 10) / 10,
      },
      nominator_reveals: actualNominators, // Map of nomination_id -> actual nominator user_id
    },
    calculated_at: new Date().toISOString(),
    member_count_at_creation: festival.member_count_at_creation,
  };

  // Cache results in JSONB format (backward compatibility)
  const { error: insertError } = await supabase.from("festival_results").insert({
    festival_id: festivalId,
    results: results,
    calculated_at: new Date().toISOString(),
    is_final: true,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  // Also write to normalized festival_standings table
  const standings = results.standings.map((entry, index) => {
    // Find guessing data for this user
    const guesserData = guessingResults.find((g) => g.user_id === entry.user_id);

    // Calculate nominations and ratings counts for this user
    const userNominations = nominations.filter((n) => n.user_id === entry.user_id).length;
    const userRatingsCount = ratings.filter((r) => r.user_id === entry.user_id).length;

    // Calculate average rating given by this user
    const userRatingValues = ratings
      .filter((r) => r.user_id === entry.user_id)
      .map((r) => Number(r.rating));
    const avgRatingGiven =
      userRatingValues.length > 0
        ? Math.round((userRatingValues.reduce((a, b) => a + b, 0) / userRatingValues.length) * 10) /
          10
        : null;

    return {
      festival_id: festivalId,
      user_id: entry.user_id,
      rank: index + 1, // Rank is position in sorted standings
      points: entry.points,
      nominations_count: userNominations,
      ratings_count: userRatingsCount,
      average_rating: avgRatingGiven,
      guessing_accuracy: guesserData?.accuracy || null,
      correct_guesses: guesserData?.correct_count || 0,
    };
  });

  // Insert standings (upsert to handle re-calculation edge cases)
  const { error: standingsError } = await supabase
    .from("festival_standings")
    .upsert(standings, { onConflict: "festival_id,user_id" });

  if (standingsError) {
    // Log error but don't fail - JSONB results are still saved
    handleActionError(standingsError, { action: "calculateResults", silent: true });
  }

  // Check badge progress for all participants
  // This triggers badge checks for festivals won, participated, and guesses
  try {
    await Promise.all(
      standings.map(async (entry) => {
        // Check festival participation badges for all users
        await checkRelevantBadges(entry.user_id, "festival_completed", festival.club_id);

        // Check festival win badges for the winner (rank 1)
        if (entry.rank === 1) {
          await checkRelevantBadges(entry.user_id, "festival_won", festival.club_id);
        }

        // Check guess milestone badges if user has correct guesses
        if (entry.correct_guesses && entry.correct_guesses > 0) {
          await checkRelevantBadges(entry.user_id, "guess_recorded", festival.club_id);
        }
      })
    );
  } catch (error) {
    // Don't fail results calculation if badge checking fails, but log the error
    handleActionError(error, { action: "checkBadgesAfterResults" });
  }

  // Check one-off achievement badges (Crowd Pleaser, Photo Finish, Back to Back)
  try {
    await checkFestivalAchievements(festivalId, festival.club_id, standings, nominations);
  } catch (error) {
    handleActionError(error, { action: "checkFestivalAchievements" });
  }

  // Check club-level badges (festivals completed, movies watched, etc.)
  try {
    await checkAndAwardClubBadges(festival.club_id);
  } catch (error) {
    handleActionError(error, { action: "checkClubBadgesAfterResults" });
  }

  // Get club and festival slugs
  const [{ data: clubData }, { data: festivalData }] = await Promise.all([
    supabase.from("clubs").select("slug").eq("id", festival.club_id).maybeSingle(),
    supabase.from("festivals").select("slug").eq("id", festivalId).maybeSingle(),
  ]);
  const clubSlug = clubData?.slug || festival.club_id;
  const festivalSlug = festivalData?.slug || festivalId;
  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);
  return { success: true, results };
}

export async function getResults(festivalId: string) {
  const supabase = await createClient();

  const { data: results, error } = await supabase
    .from("festival_results")
    .select("results")
    .eq("festival_id", festivalId)
    .maybeSingle();

  if (error) {
    return handleActionError(error, "getResults");
  }

  if (!results) {
    return { error: "Results not found" };
  }

  return { data: results };
}

export async function getResultsData(festivalId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival with club_id and slug
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("theme, results_date, member_count_at_creation, club_id, slug")
    .eq("id", festivalId)
    .is("deleted_at", null)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Get cached results
  const { data: resultsData, error: resultsError } = await supabase
    .from("festival_results")
    .select("results")
    .eq("festival_id", festivalId)
    .maybeSingle();

  if (resultsError) {
    return { error: resultsError.message };
  }

  if (!resultsData?.results) {
    return { error: "Results not calculated yet" };
  }

  // Get nominations with movies
  const { data: nominations, error: nominationsError } = await supabase
    .from("nominations")
    .select(
      `
      id,
      tmdb_id,
      user_id,
      movies:tmdb_id (
        tmdb_id,
        title,
        poster_url,
        year
      ),
      users:user_id (
        id,
        display_name,
        email
      )
    `
    )
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  if (nominationsError) {
    return { error: nominationsError.message };
  }

  // Get all ratings with user info
  const { data: ratings, error: ratingsError } = await supabase
    .from("ratings")
    .select(
      `
      id,
      nomination_id,
      user_id,
      rating,
      users:user_id (
        id,
        display_name,
        email
      )
    `
    )
    .eq("festival_id", festivalId);

  if (ratingsError) {
    return { error: ratingsError.message };
  }

  // Get guesses - use cached data from results if available, otherwise fetch from database
  interface Guesser {
    user_id: string;
    guesses: Record<string, string>;
    correct_count?: number;
  }

  interface CachedGuesses {
    guessers?: Guesser[];
  }

  let guesses: Array<{
    id: string;
    user_id: string | null;
    guesses: Record<string, string>;
    users?: {
      id: string;
      display_name: string | null;
      email: string;
    } | null;
  }> = [];
  const cachedGuesses = (resultsData.results as { guesses?: CachedGuesses })?.guesses;

  if (cachedGuesses?.guessers && cachedGuesses.guessers.length > 0) {
    // Use cached guessing data from results
    // Transform cached format to match component expectations
    guesses = cachedGuesses.guessers.map((guesser) => ({
      id: `cached-${guesser.user_id}`,
      user_id: guesser.user_id,
      guesses: guesser.guesses,
      // User details will be fetched below
    }));

    // Fetch user details for better display names
    const guesserUserIds = guesses.map((g) => g.user_id).filter(Boolean) as string[];
    if (guesserUserIds.length > 0) {
      const { data: guesserUsers, error: guesserUsersError } = await supabase
        .from("users")
        .select("id, display_name, email")
        .in("id", guesserUserIds);

      if (guesserUsersError) {
        // Error fetching guesser users - cached guesses can still be used
        // Continue without user details
      }

      // Update guesses with fetched user data
      guesses = guesses.map((guess) => {
        const user = guesserUsers?.find((u) => u.id === guess.user_id);
        return {
          ...guess,
          users: user
            ? {
                id: user.id,
                display_name: user.display_name,
                email: user.email,
              }
            : null,
        };
      });
    }
  } else {
    // Fallback: fetch guesses from database if not cached
    const { data: dbGuesses, error: dbGuessesError } = await supabase
      .from("nomination_guesses")
      .select(
        `
        id,
        user_id,
        guesses,
        users:user_id (
          id,
          display_name,
          email
        )
      `
      )
      .eq("festival_id", festivalId);

    if (dbGuessesError) {
      return { error: dbGuessesError.message };
    }

    // Transform database format to match component expectations
    // Handle users relation - can be array or object
    type DbGuessRow = {
      id: string;
      user_id: string;
      guesses: Record<string, unknown> | null;
      users:
        | { id: string; display_name: string | null; email: string }
        | null
        | Array<{ id: string; display_name: string | null; email: string }>;
    };
    guesses = (dbGuesses || []).map((dbGuess: DbGuessRow) => {
      const usersRelation = Array.isArray(dbGuess.users) ? dbGuess.users[0] : dbGuess.users;
      // Cast guesses to Record<string, string> - values are user IDs
      const typedGuesses: Record<string, string> = {};
      if (dbGuess.guesses) {
        for (const [key, value] of Object.entries(dbGuess.guesses)) {
          if (typeof value === "string") {
            typedGuesses[key] = value;
          }
        }
      }
      return {
        id: dbGuess.id,
        user_id: dbGuess.user_id,
        guesses: typedGuesses,
        users: usersRelation || null,
      };
    });
  }

  // Get all club members for the festival's club
  const { data: clubMembers, error: clubMembersError } = await supabase
    .from("club_members")
    .select(
      `
      user_id,
      users:user_id (
        id,
        display_name,
        email
      )
    `
    )
    .eq("club_id", festival.club_id);

  if (clubMembersError) {
    return { error: clubMembersError.message };
  }

  // Get club settings for reveal configuration and tab visibility
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("settings, slug")
    .eq("id", festival.club_id)
    .single();

  if (clubError) {
    handleActionError(clubError, { action: "getResultsData", silent: true });
    // Don't fail if settings can't be fetched, just use defaults
  }

  const settings = (club?.settings as Record<string, unknown>) || {};

  // Reveal settings
  const revealType = (settings.results_reveal_type as "automatic" | "manual") || "manual";
  const revealDirection =
    (settings.results_reveal_direction as "forward" | "backward") || "forward";
  const revealDelaySeconds = (settings.results_reveal_delay_seconds as number) || 5;

  // Tab visibility settings
  const clubRatingsEnabled = settings.club_ratings_enabled !== false; // Default true
  const nominationGuessingEnabled = settings.nomination_guessing_enabled === true; // Default false
  const blindNominationsEnabled = settings.blind_nominations_enabled === true; // Default false
  const scoringEnabled = settings.scoring_enabled !== false; // Default true

  // Transform nominations to ensure relations are single objects, not arrays
  const transformedNominations = (nominations || []).map((nom) => {
    const moviesRelation = Array.isArray(nom.movies) ? nom.movies[0] : nom.movies;
    const usersRelation = Array.isArray(nom.users) ? nom.users[0] : nom.users;
    return {
      ...nom,
      movies: moviesRelation || null,
      users: usersRelation || null,
    };
  });

  // Transform ratings to ensure relations are single objects, not arrays
  const transformedRatings = (ratings || []).map((rating) => {
    const usersRelation = Array.isArray(rating.users) ? rating.users[0] : rating.users;
    return {
      ...rating,
      users: usersRelation || null,
    };
  });

  // Transform members to ensure relations are single objects, not arrays
  const transformedMembers = (clubMembers || []).map((member) => {
    const usersRelation = Array.isArray(member.users) ? member.users[0] : member.users;
    return {
      ...member,
      users: usersRelation || null,
    };
  });

  // Transform guesses to ensure relations are single objects, not arrays
  const transformedGuesses = (guesses || []).map((guess) => {
    const usersRelation = Array.isArray(guess.users) ? guess.users[0] : guess.users;
    return {
      ...guess,
      users: usersRelation || null,
    };
  });

  return {
    festival: {
      theme: festival.theme,
      results_date: festival.results_date,
      member_count_at_creation: festival.member_count_at_creation,
      slug: festival.slug,
    },
    clubSlug: club?.slug || festival.club_id,
    results: resultsData.results,
    nominations: transformedNominations,
    ratings: transformedRatings,
    guesses: transformedGuesses,
    members: transformedMembers,
    cachedGuessesData: cachedGuesses, // Include cached guessing stats for potential future use
    revealSettings: {
      revealType,
      revealDirection,
      revealDelaySeconds,
    },
    displaySettings: {
      clubRatingsEnabled,
      nominationGuessingEnabled,
      blindNominationsEnabled,
      scoringEnabled,
    },
  };
}
