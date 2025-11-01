"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";

export interface FestivalResult {
  id: string;
  festival_id: string;
  festival_slug: string | null;
  festival_theme: string;
  club_id: string;
  club_slug: string | null;
  club_name: string;
  club_picture_url: string | null;
  rank: number;
  total_nominations: number;
  average_rating: number;
  rating_count: number;
  points_earned: number;
  results_date: string;
  nominator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Get festival history for a specific movie
 * Returns all festivals where this movie was nominated, including results
 * Only shows results from clubs the user is a member of
 */
export async function getMovieFestivalHistory(tmdbId: number): Promise<{
  data: FestivalResult[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: "You must be signed in" };
    }

    // Get clubs the user is a member of
    const { data: memberships } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", user.id);

    const clubIds = memberships?.map((m) => m.club_id) || [];

    if (clubIds.length === 0) {
      return { data: [] };
    }

    // Get nominations for this movie in user's clubs
    const { data: nominations, error: nominationsError } = await supabase
      .from("nominations")
      .select(
        `
        id,
        festival_id,
        user_id,
        festivals!inner (
          id,
          slug,
          theme,
          status,
          results_date,
          club_id,
          clubs!inner (
            id,
            slug,
            name,
            picture_url
          )
        ),
        users:user_id (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq("tmdb_id", tmdbId)
      .in("festivals.club_id", clubIds)
      .eq("festivals.status", "completed")
      .is("deleted_at", null)
      .order("festivals(results_date)", { ascending: false });

    if (nominationsError) {
      return { data: [], ...handleActionError(nominationsError, "getMovieFestivalHistory") };
    }

    if (!nominations || nominations.length === 0) {
      return { data: [] };
    }

    // Get results for each nomination
    const results: FestivalResult[] = [];

    for (const nom of nominations) {
      const festivalsRelation = Array.isArray(nom.festivals) ? nom.festivals[0] : nom.festivals;
      const clubsRelationRaw = festivalsRelation
        ? (festivalsRelation as { clubs?: unknown } | null)?.clubs
        : null;
      const clubsRelation = clubsRelationRaw
        ? Array.isArray(clubsRelationRaw)
          ? clubsRelationRaw[0]
          : clubsRelationRaw
        : null;
      const festival = festivalsRelation as {
        id: string;
        slug: string | null;
        theme: string;
        status: string;
        results_date: string | null;
        club_id: string;
      } | null;

      if (!festival || !clubsRelation) continue;

      const clubs = clubsRelation as {
        id: string;
        slug: string | null;
        name: string;
        picture_url: string | null;
      };

      // Get the nomination's result from festival_results
      const { data: festivalResults } = await supabase
        .from("festival_results")
        .select("standings, nominations")
        .eq("festival_id", festival.id)
        .maybeSingle();

      // Get total nominations count for this festival
      const { count: totalNoms } = await supabase
        .from("nominations")
        .select("id", { count: "exact", head: true })
        .eq("festival_id", festival.id)
        .is("deleted_at", null);

      // Find this nomination in results
      let rank = 0;
      let averageRating = 0;
      let ratingCount = 0;
      let pointsEarned = 0;

      if (festivalResults?.nominations) {
        const nominationsData = festivalResults.nominations as Array<{
          nomination_id: string;
          average_rating: number;
          rating_count: number;
        }>;

        // Sort by average rating to get rank
        const sorted = [...nominationsData].sort((a, b) => b.average_rating - a.average_rating);
        const nominationIndex = sorted.findIndex((n) => n.nomination_id === nom.id);

        if (nominationIndex !== -1) {
          rank = nominationIndex + 1;
          averageRating = sorted[nominationIndex].average_rating;
          ratingCount = sorted[nominationIndex].rating_count;
        }
      }

      // Get points from standings if available
      if (festivalResults?.standings) {
        const standings = festivalResults.standings as Array<{
          user_id: string;
          points: number;
        }>;
        const userStanding = standings.find((s) => s.user_id === nom.user_id);
        if (userStanding) {
          pointsEarned = userStanding.points;
        }
      }

      const usersRelation = Array.isArray(nom.users) ? nom.users[0] : nom.users;
      const nominator = usersRelation as {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;

      results.push({
        id: nom.id,
        festival_id: festival.id,
        festival_slug: festival.slug,
        festival_theme: festival.theme,
        club_id: clubs.id,
        club_slug: clubs.slug,
        club_name: clubs.name,
        club_picture_url: clubs.picture_url,
        rank,
        total_nominations: totalNoms || 0,
        average_rating: averageRating,
        rating_count: ratingCount,
        points_earned: pointsEarned,
        results_date: festival.results_date || "",
        nominator: nominator
          ? {
              id: nominator.id,
              display_name: nominator.display_name || "Unknown",
              avatar_url: nominator.avatar_url,
            }
          : null,
      });
    }

    return { data: results };
  } catch (error) {
    return { data: [], ...handleActionError(error, "getMovieFestivalHistory") };
  }
}
