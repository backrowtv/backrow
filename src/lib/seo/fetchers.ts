import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";

export const getClubForSeo = cache(async (slug: string) => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("clubs")
    .select(
      "id, name, slug, description, theme_color, privacy, archived, picture_url, created_at, updated_at"
    )
    .eq("slug", slug)
    .eq("archived", false)
    .maybeSingle();
  return data;
});

export const getFestivalForSeo = cache(async (clubSlug: string, festivalSlug: string) => {
  const supabase = createPublicClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug, privacy, archived")
    .eq("slug", clubSlug)
    .eq("archived", false)
    .maybeSingle();
  if (!club) return null;

  const { data: festival } = await supabase
    .from("festivals")
    .select(
      "id, theme, slug, status, phase, start_date, nomination_deadline, watch_deadline, rating_deadline, results_date, picture_url, poster_url, created_at, updated_at, deleted_at"
    )
    .eq("club_id", club.id)
    .eq("slug", festivalSlug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!festival) return null;

  return { club, festival };
});

export const getMovieForSeo = cache(async (idOrSlug: string) => {
  const supabase = createPublicClient();
  const asNum = Number(idOrSlug);
  const isNumeric = Number.isFinite(asNum) && asNum > 0;
  const query = supabase
    .from("movies")
    .select(
      'tmdb_id, title, year, slug, overview, poster_url, backdrop_url, director, genres, "cast", tagline, certification, runtime'
    );
  const { data } = isNumeric
    ? await query.eq("tmdb_id", asNum).maybeSingle()
    : await query.eq("slug", idOrSlug).maybeSingle();
  return data;
});

export const getProfileForSeo = cache(async (userId: string) => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url, bio, deleted_at, watch_history_private")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
});
