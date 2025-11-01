"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";

/**
 * Represents a past nomination (actual nomination the user made in a completed festival)
 */
export interface PastNominationItem {
  id: string;
  tmdb_id: number;
  pitch: string | null;
  created_at: string | null;
  movie: {
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    year: number | null;
    runtime: number | null;
    director: string | null;
    genres: string[] | null;
  } | null;
  festival: {
    id: string;
    slug: string;
    theme: string | null;
    status: string;
    results_date: string | null;
    club: {
      id: string;
      slug: string | null;
      name: string;
      picture_url: string | null;
      settings: Record<string, unknown> | null;
    } | null;
  } | null;
}

export interface GetPastNominationsResult {
  data?: PastNominationItem[];
  error?: string;
}

/**
 * Get all past nominations for the current user
 * Only includes nominations from completed festivals
 */
export async function getPastNominations(): Promise<GetPastNominationsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("nominations")
    .select(
      `
      id,
      tmdb_id,
      pitch,
      created_at,
      movie:movies!inner(
        tmdb_id,
        title,
        poster_url,
        year,
        runtime,
        director,
        genres
      ),
      festival:festivals!inner(
        id,
        slug,
        theme,
        status,
        results_date,
        club:clubs!inner(
          id,
          slug,
          name,
          picture_url,
          settings
        )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("festivals.status", "completed")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return handleActionError(error, "getUserPastNominations");
  }

  // Transform joined data to flatten nested arrays
  const items: PastNominationItem[] = (data || []).map((item) => ({
    id: item.id,
    tmdb_id: item.tmdb_id,
    pitch: item.pitch,
    created_at: item.created_at,
    movie: Array.isArray(item.movie) ? item.movie[0] : item.movie,
    festival: (() => {
      const festival = Array.isArray(item.festival) ? item.festival[0] : item.festival;
      if (!festival) return null;
      return {
        ...festival,
        club: Array.isArray(festival.club) ? festival.club[0] : festival.club,
      };
    })(),
  }));

  return { data: items };
}
