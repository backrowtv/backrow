"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cacheMovie } from "./movies";
import { createNotificationsForUsers } from "./notifications";
import { logMemberActivity } from "@/lib/activity/logger";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { getClubSlug, getFestivalSlug } from "./themes/helpers";

export async function createNomination(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("createNomination", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const festivalId = formData.get("festivalId") as string;
  const tmdbId = parseInt(formData.get("tmdbId") as string);
  const pitch = formData.get("pitch") as string;

  if (!festivalId || !tmdbId || isNaN(tmdbId)) {
    return { error: "Festival ID and movie are required" };
  }

  if (pitch && pitch.length > 500) {
    return { error: "Pitch must be 500 characters or less" };
  }

  // Get festival to check phase and club
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, status")
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
    // Get club settings to check if non-admin nominations are allowed
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
        userIds: members.map((m) => m.user_id).filter((id) => id !== user.id), // Don't notify the nominator
        type: "nomination_added",
        title: "New Nomination",
        message: `${movieTitle} has been nominated for the festival!`,
        link: `/club/${clubSlug}/festival/${festivalSlug}`,
        clubId: festival.club_id,
        festivalId: festivalId,
      });
    }
  } catch (err) {
    // Log but don't fail the nomination
    console.error("Failed to send nomination notifications:", err);
  }

  // Auto-create movie discussion thread (only if blind nominations are disabled)
  // If blind nominations are enabled, threads will be created when advancing to watch_rate phase
  // Note: Movie discussion threads are now created when the festival enters
  // the watch_rate phase (when movies become visible), not at nomination time.
  // This allows for proper linking from the festival discussion thread.

  // Get club and festival slugs for redirect
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const { data: festivalData } = await supabase
    .from("festivals")
    .select("slug")
    .eq("id", festivalId)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festivalData?.slug || festivalId;

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
      club_name: club?.slug ? undefined : festival.club_id, // Will be fetched by display component
      club_slug: clubSlug,
      festival_id: festivalId,
    },
    festival.club_id
  );

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);
  redirect(`/club/${clubSlug}/festival/${festivalSlug}`);
}

export async function updateNomination(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const nominationId = formData.get("nominationId") as string;
  const pitch = formData.get("pitch") as string;

  if (!nominationId) {
    return { error: "Nomination ID is required" };
  }

  if (pitch && pitch.length > 500) {
    return { error: "Pitch must be 500 characters or less" };
  }

  // Get nomination
  const { data: nomination, error: nominationError } = await supabase
    .from("nominations")
    .select("festival_id, user_id, festivals(festival_id, nomination_deadline, phase, club_id)")
    .eq("id", nominationId)
    .is("deleted_at", null)
    .single();

  if (nominationError || !nomination) {
    return { error: "Nomination not found" };
  }

  // Check user owns this nomination
  if (nomination.user_id !== user.id) {
    return { error: "You can only edit your own nominations" };
  }

  // Check deadline hasn't passed
  const festivalsRelation = Array.isArray(nomination.festivals)
    ? nomination.festivals[0]
    : nomination.festivals;
  const festival = festivalsRelation as {
    nomination_deadline?: string | null;
    club_id?: string;
    phase?: string;
    festival_id?: string;
  } | null;
  if (festival?.nomination_deadline) {
    const deadline = new Date(festival.nomination_deadline!);
    if (new Date() > deadline) {
      return { error: "Nomination deadline has passed" };
    }
  }

  // Update nomination
  const { error } = await supabase
    .from("nominations")
    .update({ pitch: pitch?.trim() || null })
    .eq("id", nominationId);

  if (error) {
    return { error: error.message };
  }

  if (festival?.club_id) {
    // Get club and festival slugs and nomination details
    const [{ data: club }, { data: festivalData }, { data: nominationData }] = await Promise.all([
      supabase.from("clubs").select("slug").eq("id", festival.club_id).maybeSingle(),
      supabase.from("festivals").select("slug").eq("id", nomination.festival_id).maybeSingle(),
      supabase
        .from("nominations")
        .select("tmdb_id, movie:movies(title)")
        .eq("id", nominationId)
        .maybeSingle(),
    ]);
    const clubSlug = club?.slug || festival.club_id;
    const festivalSlug = festivalData?.slug || nomination.festival_id;

    const movie = Array.isArray(nominationData?.movie)
      ? nominationData.movie[0]
      : nominationData?.movie;

    // Log member activity
    await logMemberActivity(
      user.id,
      "user_nomination_edited",
      {
        tmdb_id: nominationData?.tmdb_id,
        movie_title: movie?.title,
        club_id: festival.club_id,
        club_slug: clubSlug,
      },
      festival.club_id
    );

    revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);
  }
  return { success: true };
}

export async function deleteNomination(nominationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get nomination with festival phase info
  const { data: nomination, error: nominationError } = await supabase
    .from("nominations")
    .select("festival_id, user_id, festivals(festival_id, nomination_deadline, club_id, phase)")
    .eq("id", nominationId)
    .is("deleted_at", null)
    .single();

  if (nominationError || !nomination) {
    return { error: "Nomination not found" };
  }

  // Check user owns this nomination
  if (nomination.user_id !== user.id) {
    return { error: "You can only delete your own nominations" };
  }

  // Get festival data
  const festivalsRelation = Array.isArray(nomination.festivals)
    ? nomination.festivals[0]
    : nomination.festivals;
  const festival = festivalsRelation as {
    nomination_deadline?: string | null;
    club_id?: string;
    phase?: string;
    festival_id?: string;
  } | null;

  // Block deletion during watch_rate and results phases
  if (festival?.phase === "watch_rate") {
    return {
      error:
        "Cannot remove nominations once watching has begun. The festival is currently in the Watch & Rate phase.",
    };
  }
  if (festival?.phase === "results") {
    return {
      error:
        "Cannot remove nominations after results are revealed. The festival has already concluded.",
    };
  }

  // Check deadline hasn't passed (for nomination phase)
  if (festival?.nomination_deadline) {
    const deadline = new Date(festival.nomination_deadline!);
    if (new Date() > deadline) {
      return { error: "Nomination deadline has passed" };
    }
  }

  const { error } = await supabase.from("nominations").delete().eq("id", nominationId);

  if (error) {
    return { error: error.message };
  }

  if (festival && festival.club_id && nomination.festival_id) {
    // Get club and festival slugs
    const [{ data: club }, { data: festivalData }] = await Promise.all([
      supabase.from("clubs").select("slug").eq("id", festival.club_id).maybeSingle(),
      supabase.from("festivals").select("slug").eq("id", nomination.festival_id).maybeSingle(),
    ]);
    const clubSlug = club?.slug || festival.club_id;
    const festivalSlug = festivalData?.slug || nomination.festival_id;

    // Log member activity (nomination removed - we already have the movie info from earlier)
    await logMemberActivity(
      user.id,
      "user_nomination_removed",
      {
        festival_id: nomination.festival_id,
        club_id: festival.club_id,
        club_slug: clubSlug,
      },
      festival.club_id
    );

    revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);
  }
  revalidatePath("/profile");
  return { success: true };
}
