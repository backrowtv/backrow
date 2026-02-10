"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cacheMovie } from "./movies";
import { createNotificationsForUsers } from "./notifications";
import { logMemberActivity } from "@/lib/activity/logger";
import { getClubSlug, getFestivalSlug } from "./themes/helpers";

interface CreateNominationParams {
  festivalId: string;
  tmdbId: number;
  pitch?: string;
}

export async function createNominationDirect(params: CreateNominationParams) {
  const { festivalId, tmdbId, pitch } = params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  if (!festivalId || !tmdbId || isNaN(tmdbId)) {
    return { error: "Festival ID and movie are required" };
  }

  if (pitch && pitch.length > 500) {
    return { error: "Pitch must be 500 characters or less" };
  }

  // Get festival to check phase and club
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, status, theme, slug")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check if nomination phase is active
  if (festival.phase !== "nomination" && festival.status !== "nominating") {
    return { error: "Nomination phase is not active" };
  }

  // Check user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Check if non-admin nominations are allowed
  const isAdmin = membership.role === "producer" || membership.role === "director";
  if (!isAdmin) {
    const { data: club } = await supabase
      .from("clubs")
      .select("settings")
      .eq("id", festival.club_id)
      .single();

    if (club?.settings) {
      const settings = club.settings as Record<string, unknown>;
      const allowNonAdminNominations = (settings.allow_non_admin_nominations as boolean) ?? true;

      if (!allowNonAdminNominations) {
        return { error: "Only producers and directors can submit nominations in this club" };
      }
    }
  }

  // Check if user already nominated
  const { data: existingNomination, error: existingNominationError } = await supabase
    .from("nominations")
    .select("id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingNominationError) {
    return { error: existingNominationError.message };
  }

  if (existingNomination) {
    return { error: "You have already nominated a movie for this festival" };
  }

  // Check if movie already nominated
  const { data: existingMovie, error: existingMovieError } = await supabase
    .from("nominations")
    .select("id")
    .eq("festival_id", festivalId)
    .eq("tmdb_id", tmdbId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingMovieError) {
    return { error: existingMovieError.message };
  }

  if (existingMovie) {
    return { error: "This movie has already been nominated" };
  }

  // Cache movie in database
  const cacheResult = await cacheMovie(tmdbId);
  if (cacheResult.error) {
    return { error: cacheResult.error };
  }

  // Create nomination
  const { error } = await supabase.from("nominations").insert({
    festival_id: festivalId,
    user_id: user.id,
    tmdb_id: tmdbId,
    pitch: pitch?.trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  // Notify all club members about the new nomination
  try {
    const { data: members } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", festival.club_id);

    const { data: movieData } = await supabase
      .from("movies")
      .select("title")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    const movieTitle = movieData?.title || "A movie";

    if (members && members.length > 0) {
      const clubSlug = await getClubSlug(supabase, festival.club_id);
      const festivalSlug = await getFestivalSlug(supabase, festivalId);
      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id).filter((id) => id !== user.id),
        type: "nomination_added",
        title: "New Nomination",
        message: `${movieTitle} has been nominated for the festival!`,
        link: `/club/${clubSlug}/festival/${festivalSlug}`,
        clubId: festival.club_id,
        festivalId: festivalId,
      });
    }
  } catch (err) {
    console.error("Failed to send nomination notifications:", err);
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festival.slug || festivalId;

  // Get movie title for logging
  const { data: movieForLog } = await supabase
    .from("movies")
    .select("title")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  // Log member activity
  await logMemberActivity(
    user.id,
    "user_nominated",
    {
      tmdb_id: tmdbId,
      movie_title: movieForLog?.title,
      club_id: festival.club_id,
      club_slug: clubSlug,
      festival_id: festivalId,
    },
    festival.club_id
  );

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

  return { success: true, clubSlug, festivalSlug };
}
