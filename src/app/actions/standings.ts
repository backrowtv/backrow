"use server";

import { createClient } from "@/lib/supabase/server";
import type { StandingsEntry } from "./standings.types";

/**
 * Get season standings stats for a club
 * Aggregates stats from all festivals within the season
 */
export async function getSeasonStandings(
  clubId: string,
  seasonId: string
): Promise<{ error?: string; data?: StandingsEntry[] }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check if user is a member
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Get season
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("id", seasonId)
    .eq("club_id", clubId)
    .is("deleted_at", null)
    .single();

  if (seasonError || !season) {
    return { error: "Season not found" };
  }

  // Get all festivals in this season
  const { data: festivals, error: festivalsError } = await supabase
    .from("festivals")
    .select("id, member_count_at_creation")
    .eq("club_id", clubId)
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .is("deleted_at", null);

  if (festivalsError) {
    return { error: festivalsError.message };
  }

  if (!festivals || festivals.length === 0) {
    return { data: [] };
  }

  const festivalIds = festivals.map((f) => f.id);

  // Use normalized festival_standings table instead of parsing JSONB
  const { data: allStandings, error: standingsError } = await supabase
    .from("festival_standings")
    .select("*")
    .in("festival_id", festivalIds)
    .order("festival_id", { ascending: true })
    .order("rank", { ascending: true });

  if (standingsError) {
    return { error: standingsError.message };
  }

  if (!allStandings || allStandings.length === 0) {
    return { data: [] };
  }

  // Get user info for standings
  const userIds = [...new Set(allStandings.map((s) => s.user_id))];
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select(
      "id, display_name, email, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .in("id", userIds);

  if (usersError) {
    return { error: usersError.message };
  }

  // Aggregate stats per user from normalized standings
  const userStats: Record<
    string,
    {
      user_id: string;
      user_name: string;
      avatar_url: string | null;
      email: string | null;
      // Avatar columns - stored as proper columns
      avatar_icon: string | null;
      avatar_color_index: number | null;
      avatar_border_color_index: number | null;
      total_points: number;
      festival_count: number;
      movies_rated: Set<string>; // nomination_id + user_id for uniqueness
      festivals_attended: Set<string>; // festival_id
      wins: number;
      nomination_ratings: number[];
      correct_guesses: number;
    }
  > = {};

  // Group standings by festival
  const standingsByFestival: Record<string, typeof allStandings> = {};
  allStandings.forEach((standing) => {
    if (!standingsByFestival[standing.festival_id]) {
      standingsByFestival[standing.festival_id] = [];
    }
    standingsByFestival[standing.festival_id].push(standing);
  });

  // Process each festival's standings
  Object.entries(standingsByFestival).forEach(([festivalId, festivalStandings]) => {
    // Track who won this festival (rank 1)
    let winnerId: string | null = null;

    // Process standings entries
    festivalStandings.forEach((standing) => {
      const userId = standing.user_id;
      const points = Number(standing.points) || 0;
      const user = users?.find((u) => u.id === userId);

      if (!userStats[userId]) {
        userStats[userId] = {
          user_id: userId,
          user_name: user?.display_name || user?.email || "Unknown",
          avatar_url: user?.avatar_url || null,
          email: user?.email || null,
          // Avatar columns - read directly from columns
          avatar_icon: user?.avatar_icon || null,
          avatar_color_index: user?.avatar_color_index ?? null,
          avatar_border_color_index: user?.avatar_border_color_index ?? null,
          total_points: 0,
          festival_count: 0,
          movies_rated: new Set(),
          festivals_attended: new Set(),
          wins: 0,
          nomination_ratings: [],
          correct_guesses: 0,
        };
      }

      userStats[userId].total_points += points;
      userStats[userId].festivals_attended.add(festivalId);

      // Track winner (rank 1)
      if (standing.rank === 1) {
        winnerId = userId;
      }

      // Add correct guesses if available
      if (standing.correct_guesses) {
        userStats[userId].correct_guesses += standing.correct_guesses;
      }
    });

    // Award win to rank 1
    if (winnerId && userStats[winnerId]) {
      userStats[winnerId].wins++;
    }
  });

  // Get ratings for movies rated count
  const { data: ratings, error: ratingsError } = await supabase
    .from("ratings")
    .select("user_id, nomination_id, festival_id")
    .in("festival_id", festivalIds);

  if (ratingsError) {
    return { error: ratingsError.message };
  }

  if (ratings) {
    ratings.forEach((rating) => {
      if (rating.user_id && userStats[rating.user_id]) {
        const key = `${rating.festival_id}-${rating.nomination_id}-${rating.user_id}`;
        userStats[rating.user_id].movies_rated.add(key);
      }
    });
  }

  // Get nominations for average nomination rating
  const { data: nominations, error: nominationsError } = await supabase
    .from("nominations")
    .select("id, user_id, festival_id")
    .in("festival_id", festivalIds)
    .is("deleted_at", null);

  if (nominationsError) {
    return { error: nominationsError.message };
  }

  // Get ratings for nominated movies
  if (nominations) {
    const nominationIds = nominations.map((n) => n.id);
    const { data: nominationRatings, error: nominationRatingsError } = await supabase
      .from("ratings")
      .select("nomination_id, rating")
      .in("nomination_id", nominationIds);

    if (nominationRatingsError) {
      return { error: nominationRatingsError.message };
    }

    if (nominationRatings) {
      // Group ratings by nomination
      const ratingsByNomination: Record<string, number[]> = {};
      nominationRatings.forEach((r) => {
        if (!ratingsByNomination[r.nomination_id]) {
          ratingsByNomination[r.nomination_id] = [];
        }
        ratingsByNomination[r.nomination_id].push(Number(r.rating));
      });

      // Calculate average for each nomination
      nominations.forEach((nom) => {
        if (nom.user_id && userStats[nom.user_id] && ratingsByNomination[nom.id]) {
          const avg =
            ratingsByNomination[nom.id].reduce((a, b) => a + b, 0) /
            ratingsByNomination[nom.id].length;
          userStats[nom.user_id].nomination_ratings.push(avg);
        }
      });
    }
  }

  // User details already fetched above, no need to fetch again

  // Convert to standings entries
  const entries: StandingsEntry[] = Object.values(userStats).map((stats) => {
    const festivalsAttended = stats.festivals_attended.size;
    const avgPoints = festivalsAttended > 0 ? stats.total_points / festivalsAttended : 0;
    const winRate = festivalsAttended > 0 ? (stats.wins / festivalsAttended) * 100 : 0;
    const avgNominationRating =
      stats.nomination_ratings.length > 0
        ? stats.nomination_ratings.reduce((a, b) => a + b, 0) / stats.nomination_ratings.length
        : 0;

    return {
      user_id: stats.user_id,
      user_name: stats.user_name,
      avatar_url: stats.avatar_url,
      email: stats.email,
      // Avatar columns - read directly from columns
      avatar_icon: stats.avatar_icon,
      avatar_color_index: stats.avatar_color_index,
      avatar_border_color_index: stats.avatar_border_color_index,
      rank: 0, // Will be set after sorting
      points: Math.round(stats.total_points * 10) / 10,
      avg_points: Math.round(avgPoints * 10) / 10,
      movies_rated: stats.movies_rated.size,
      festivals_attended: festivalsAttended,
      wins: stats.wins,
      win_rate: Math.round(winRate * 10) / 10,
      avg_nomination_rating: Math.round(avgNominationRating * 10) / 10,
      nomination_guesses: stats.correct_guesses,
    };
  });

  // Sort by points descending
  entries.sort((a, b) => b.points - a.points);

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { data: entries };
}

/**
 * Get lifetime standings stats for a club
 * Aggregates stats from all seasons in the club
 */
export async function getLifetimeStandings(
  clubId: string
): Promise<{ error?: string; data?: StandingsEntry[] }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check if user is a member
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Get all completed festivals in this club
  const { data: festivals, error: festivalsError } = await supabase
    .from("festivals")
    .select("id, member_count_at_creation")
    .eq("club_id", clubId)
    .eq("status", "completed")
    .is("deleted_at", null);

  if (festivalsError) {
    return { error: festivalsError.message };
  }

  if (!festivals || festivals.length === 0) {
    return { data: [] };
  }

  const festivalIds = festivals.map((f) => f.id);

  // Use normalized festival_standings table instead of parsing JSONB
  const { data: allStandings, error: standingsError } = await supabase
    .from("festival_standings")
    .select("*")
    .in("festival_id", festivalIds)
    .order("festival_id", { ascending: true })
    .order("rank", { ascending: true });

  if (standingsError) {
    return { error: standingsError.message };
  }

  if (!allStandings || allStandings.length === 0) {
    return { data: [] };
  }

  // Get user info for standings
  const userIds = [...new Set(allStandings.map((s) => s.user_id))];
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select(
      "id, display_name, email, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .in("id", userIds);

  if (usersError) {
    return { error: usersError.message };
  }

  // Aggregate stats per user from normalized standings
  const userStats: Record<
    string,
    {
      user_id: string;
      user_name: string;
      avatar_url: string | null;
      email: string | null;
      // Avatar columns - stored as proper columns
      avatar_icon: string | null;
      avatar_color_index: number | null;
      avatar_border_color_index: number | null;
      total_points: number;
      festival_count: number;
      movies_rated: Set<string>;
      festivals_attended: Set<string>;
      wins: number;
      nomination_ratings: number[];
      correct_guesses: number;
    }
  > = {};

  // Group standings by festival
  const standingsByFestival: Record<string, typeof allStandings> = {};
  allStandings.forEach((standing) => {
    if (!standingsByFestival[standing.festival_id]) {
      standingsByFestival[standing.festival_id] = [];
    }
    standingsByFestival[standing.festival_id].push(standing);
  });

  // Process each festival's standings
  Object.entries(standingsByFestival).forEach(([festivalId, festivalStandings]) => {
    // Track who won this festival (rank 1)
    let winnerId: string | null = null;

    // Process standings entries
    festivalStandings.forEach((standing) => {
      const userId = standing.user_id;
      const points = Number(standing.points) || 0;
      const user = users?.find((u) => u.id === userId);

      if (!userStats[userId]) {
        userStats[userId] = {
          user_id: userId,
          user_name: user?.display_name || user?.email || "Unknown",
          avatar_url: user?.avatar_url || null,
          email: user?.email || null,
          // Avatar columns - read directly from columns
          avatar_icon: user?.avatar_icon || null,
          avatar_color_index: user?.avatar_color_index ?? null,
          avatar_border_color_index: user?.avatar_border_color_index ?? null,
          total_points: 0,
          festival_count: 0,
          movies_rated: new Set(),
          festivals_attended: new Set(),
          wins: 0,
          nomination_ratings: [],
          correct_guesses: 0,
        };
      }

      userStats[userId].total_points += points;
      userStats[userId].festivals_attended.add(festivalId);

      // Track winner (rank 1)
      if (standing.rank === 1) {
        winnerId = userId;
      }

      // Add correct guesses if available
      if (standing.correct_guesses) {
        userStats[userId].correct_guesses += standing.correct_guesses;
      }
    });

    // Award win to rank 1
    if (winnerId && userStats[winnerId]) {
      userStats[winnerId].wins++;
    }
  });

  // Get ratings for movies rated count
  const { data: ratings, error: ratingsError2 } = await supabase
    .from("ratings")
    .select("user_id, nomination_id, festival_id")
    .in("festival_id", festivalIds);

  if (ratingsError2) {
    console.error("Failed to fetch ratings for lifetime standings:", ratingsError2);
    // Non-critical: continue without movies_rated counts
  }

  if (ratings) {
    ratings.forEach((rating) => {
      if (rating.user_id && userStats[rating.user_id]) {
        const key = `${rating.festival_id}-${rating.nomination_id}-${rating.user_id}`;
        userStats[rating.user_id].movies_rated.add(key);
      }
    });
  }

  // Get nominations for average nomination rating
  const { data: nominations, error: nominationsError2 } = await supabase
    .from("nominations")
    .select("id, user_id, festival_id")
    .in("festival_id", festivalIds)
    .is("deleted_at", null);

  if (nominationsError2) {
    console.error("Failed to fetch nominations for lifetime standings:", nominationsError2);
    // Non-critical: continue without nomination rating averages
  }

  if (nominations) {
    const nominationIds = nominations.map((n) => n.id);
    const { data: nominationRatings, error: nominationRatingsError2 } = await supabase
      .from("ratings")
      .select("nomination_id, rating")
      .in("nomination_id", nominationIds);

    if (nominationRatingsError2) {
      console.error(
        "Failed to fetch nomination ratings for lifetime standings:",
        nominationRatingsError2
      );
      // Non-critical: continue without nomination rating averages
    }

    if (nominationRatings) {
      const ratingsByNomination: Record<string, number[]> = {};
      nominationRatings.forEach((r) => {
        if (!ratingsByNomination[r.nomination_id]) {
          ratingsByNomination[r.nomination_id] = [];
        }
        ratingsByNomination[r.nomination_id].push(Number(r.rating));
      });

      nominations.forEach((nom) => {
        if (nom.user_id && userStats[nom.user_id] && ratingsByNomination[nom.id]) {
          const avg =
            ratingsByNomination[nom.id].reduce((a, b) => a + b, 0) /
            ratingsByNomination[nom.id].length;
          userStats[nom.user_id].nomination_ratings.push(avg);
        }
      });
    }
  }

  // Update user details in userStats (users already fetched above)
  // No need to fetch again - we already have user data from line 352
  users?.forEach((u) => {
    if (userStats[u.id]) {
      userStats[u.id].user_name = u.display_name || u.email || "Unknown";
      userStats[u.id].avatar_url = u.avatar_url;
    }
  });

  // Convert to standings entries
  const entries: StandingsEntry[] = Object.values(userStats).map((stats) => {
    const festivalsAttended = stats.festivals_attended.size;
    const avgPoints = festivalsAttended > 0 ? stats.total_points / festivalsAttended : 0;
    const winRate = festivalsAttended > 0 ? (stats.wins / festivalsAttended) * 100 : 0;
    const avgNominationRating =
      stats.nomination_ratings.length > 0
        ? stats.nomination_ratings.reduce((a, b) => a + b, 0) / stats.nomination_ratings.length
        : 0;

    return {
      user_id: stats.user_id,
      user_name: stats.user_name,
      avatar_url: stats.avatar_url,
      email: stats.email,
      // Avatar columns - read directly from columns
      avatar_icon: stats.avatar_icon,
      avatar_color_index: stats.avatar_color_index,
      avatar_border_color_index: stats.avatar_border_color_index,
      rank: 0,
      points: Math.round(stats.total_points * 10) / 10,
      avg_points: Math.round(avgPoints * 10) / 10,
      movies_rated: stats.movies_rated.size,
      festivals_attended: festivalsAttended,
      wins: stats.wins,
      win_rate: Math.round(winRate * 10) / 10,
      avg_nomination_rating: Math.round(avgNominationRating * 10) / 10,
      nomination_guesses: stats.correct_guesses,
    };
  });

  // Sort by points descending
  entries.sort((a, b) => b.points - a.points);

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { data: entries };
}
