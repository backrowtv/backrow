"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EndlessStatus, DisplaySlot, EndlessMovie } from "./types";

/**
 * Update the pitch/curator note for a nomination
 */
export async function updateNominationPitch(
  nominationId: string,
  pitch: string | null
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the nomination and check permissions
  const { data: nomination } = await supabase
    .from("nominations")
    .select(
      `
      id,
      festival:festivals!inner(
        id,
        club_id
      )
    `
    )
    .eq("id", nominationId)
    .is("deleted_at", null)
    .single();

  if (!nomination) {
    return { error: "Nomination not found" };
  }

  const festival = Array.isArray(nomination.festival)
    ? nomination.festival[0]
    : nomination.festival;

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can update movie pitches" };
  }

  // Validate pitch length
  const trimmedPitch = pitch?.trim() || null;
  if (trimmedPitch && trimmedPitch.length > 500) {
    return { error: "Pitch must be 500 characters or less" };
  }

  const { error } = await supabase
    .from("nominations")
    .update({ pitch: trimmedPitch })
    .eq("id", nominationId);

  if (error) {
    return { error: "Failed to update pitch" };
  }

  revalidatePath(`/club/[slug]`);
  revalidatePath("/");

  return { success: true };
}

/**
 * Set the display slot for a playing movie (for homepage)
 */
export async function setDisplaySlot(
  nominationId: string,
  displaySlot: DisplaySlot
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the nomination and check permissions
  const { data: nomination } = await supabase
    .from("nominations")
    .select(
      `
      id,
      festival:festivals!inner(
        id,
        club_id
      )
    `
    )
    .eq("id", nominationId)
    .is("deleted_at", null)
    .single();

  if (!nomination) {
    return { error: "Nomination not found" };
  }

  const festival = Array.isArray(nomination.festival)
    ? nomination.festival[0]
    : nomination.festival;

  // Verify this is the BackRow Featured club - display slots are only allowed there
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  if (club?.slug !== "backrow-featured") {
    return { error: "Display slots are only available for BackRow Featured club" };
  }

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can set display slots" };
  }

  // If setting a display slot, clear it from any other nomination first
  if (displaySlot) {
    await supabase
      .from("nominations")
      .update({ display_slot: null })
      .eq("festival_id", festival.id)
      .eq("display_slot", displaySlot)
      .neq("id", nominationId);
  }

  const { error } = await supabase
    .from("nominations")
    .update({ display_slot: displaySlot })
    .eq("id", nominationId);

  if (error) {
    return { error: "Failed to set display slot" };
  }

  revalidatePath(`/club/[slug]`);
  revalidatePath("/");

  return { success: true };
}

/**
 * Get movies for homepage display (by display_slot)
 */
export async function getHomepageMovies(clubSlug: string): Promise<
  | {
      featured: EndlessMovie | null;
      throwback: EndlessMovie | null;
    }
  | { error: string }
> {
  const supabase = await createClient();

  // Find the club
  const { data: club } = await supabase.from("clubs").select("id").eq("slug", clubSlug).single();

  if (!club) {
    return { error: "Club not found" };
  }

  // Get the endless festival
  const { data: festival } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", club.id)
    .eq("status", "watching")
    .limit(1)
    .maybeSingle();

  if (!festival) {
    return { featured: null, throwback: null };
  }

  // Get movies with display slots
  const { data: nominations } = await supabase
    .from("nominations")
    .select(
      `
      id,
      tmdb_id,
      pitch,
      endless_status,
      display_slot,
      created_at,
      completed_at,
      movie:movies!inner(
        tmdb_id,
        slug,
        title,
        year,
        poster_url,
        backdrop_url,
        overview,
        tagline,
        runtime,
        director,
        genres,
        certification
      ),
      nominator:users!nominations_user_id_fkey(
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq("festival_id", festival.id)
    .eq("endless_status", "playing")
    .in("display_slot", ["featured", "throwback"])
    .is("deleted_at", null);

  // Type for raw nomination row from Supabase join
  type NominationRow = {
    id: string;
    tmdb_id: number;
    pitch: string | null;
    endless_status: string;
    display_slot: string | null;
    created_at: string;
    completed_at: string | null;
    movie:
      | {
          tmdb_id: number;
          slug: string | null;
          title: string;
          year: number | null;
          poster_url: string | null;
          backdrop_url: string | null;
          overview: string | null;
          runtime: number | null;
          director: string | null;
          genres: string[] | null;
          certification: string | null;
        }
      | Array<{
          tmdb_id: number;
          slug: string | null;
          title: string;
          year: number | null;
          poster_url: string | null;
          backdrop_url: string | null;
          overview: string | null;
          runtime: number | null;
          director: string | null;
          genres: string[] | null;
          certification: string | null;
        }>;
    nominator:
      | {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
        }
      | Array<{
          id: string;
          display_name: string | null;
          avatar_url: string | null;
        }>
      | null;
  };

  const transformNomination = (nom: NominationRow): EndlessMovie => {
    const movie = Array.isArray(nom.movie) ? nom.movie[0] : nom.movie;
    const nominator = Array.isArray(nom.nominator) ? nom.nominator[0] : nom.nominator;

    return {
      id: nom.id,
      tmdb_id: movie.tmdb_id,
      slug: movie.slug || null,
      title: movie.title,
      year: movie.year,
      poster_url: movie.poster_url,
      backdrop_url: movie.backdrop_url,
      overview: movie.overview,
      runtime: movie.runtime,
      director: movie.director,
      genres: movie.genres || null,
      certification: movie.certification || null,
      curator_note: nom.pitch,
      endless_status: nom.endless_status as EndlessStatus,
      display_slot: nom.display_slot as DisplaySlot,
      created_at: nom.created_at,
      completed_at: nom.completed_at || null,
      nominator: nominator
        ? {
            id: nominator.id,
            display_name: nominator.display_name || "Unknown",
            avatar_url: nominator.avatar_url,
          }
        : null,
    };
  };

  const movies = (nominations as NominationRow[] | null)?.map(transformNomination) || [];

  return {
    featured: movies.find((m) => m.display_slot === "featured") || null,
    throwback: movies.find((m) => m.display_slot === "throwback") || null,
  };
}
