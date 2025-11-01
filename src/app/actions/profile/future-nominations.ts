"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import { cacheMovie } from "../movies";
import { logMemberActivity } from "@/lib/activity/logger";
import type {
  AddToFutureNominationsResult,
  RemoveFromFutureNominationsResult,
  FutureNominationLink,
  GetFutureNominationLinksResult,
  AddFutureNominationLinkResult,
  RemoveFutureNominationLinkResult,
  NominateFromFutureListResult,
} from "./types";

/**
 * Add a movie to future nominations list
 */
export async function addToFutureNominations(
  tmdbId: number,
  note?: string,
  tags?: string[]
): Promise<AddToFutureNominationsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check if movie is already in the list
  const { data: existing } = await supabase
    .from("future_nomination_list")
    .select("id")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (existing) {
    return { error: "This movie is already in your future nominations" };
  }

  // Cache the movie first - this must succeed for FK constraint
  try {
    const cacheResult = await cacheMovie(tmdbId);
    if (cacheResult.error) {
      return handleActionError(cacheResult.error, "addToFutureNominations");
    }
  } catch (cacheError) {
    return handleActionError(cacheError, "addToFutureNominations");
  }

  // Add to future nominations
  const { data, error } = await supabase
    .from("future_nomination_list")
    .insert({
      user_id: user.id,
      tmdb_id: tmdbId,
      note: note || null,
      tags: tags || null,
    })
    .select("id")
    .single();

  if (error) {
    return handleActionError(error, "addToFutureNominations");
  }

  // Get movie data for logging
  const { data: movieData } = await supabase
    .from("movies")
    .select("title, poster_url")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  // Log member activity
  await logMemberActivity(user.id, "user_future_nomination_added", {
    tmdb_id: tmdbId,
    movie_title: movieData?.title,
    poster_url: movieData?.poster_url,
    tags,
  });

  revalidatePath("/profile");
  revalidatePath("/profile/nominations");
  return { success: true, id: data.id };
}

/**
 * Remove a movie from future nominations list
 */
export async function removeFromFutureNominations(
  id: string
): Promise<RemoveFromFutureNominationsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get movie info before deleting (for logging)
  const { data: nomination } = await supabase
    .from("future_nomination_list")
    .select("tmdb_id, movie:movies(title, poster_url)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("future_nomination_list")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return handleActionError(error, "removeFromFutureNominations");
  }

  // Log member activity
  const movie = Array.isArray(nomination?.movie) ? nomination.movie[0] : nomination?.movie;
  await logMemberActivity(user.id, "user_future_nomination_removed", {
    tmdb_id: nomination?.tmdb_id,
    movie_title: movie?.title,
    poster_url: movie?.poster_url,
  });

  revalidatePath("/profile");
  revalidatePath("/profile/nominations");
  return { success: true };
}

/**
 * Get links for a future nomination
 */
export async function getFutureNominationLinks(
  futureNominationId: string
): Promise<GetFutureNominationLinksResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // First verify the user owns this future nomination
  const { data: nomination, error: nomError } = await supabase
    .from("future_nomination_list")
    .select("id")
    .eq("id", futureNominationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (nomError || !nomination) {
    return { error: "Future nomination not found" };
  }

  const { data, error } = await supabase
    .from("future_nomination_links")
    .select(
      `
      id,
      future_nomination_id,
      club_id,
      festival_id,
      theme_pool_id,
      nominated,
      nominated_at,
      created_at,
      clubs:club_id (
        id,
        name,
        slug,
        picture_url,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      ),
      festivals:festival_id (
        id,
        theme,
        start_date
      ),
      theme_pool:theme_pool_id (
        id,
        theme_name
      )
    `
    )
    .eq("future_nomination_id", futureNominationId)
    .order("created_at", { ascending: true });

  if (error) {
    return handleActionError(error, "getFutureNominationLinks");
  }

  // Transform the data to flatten the joined relations
  const links: FutureNominationLink[] = (data || []).map((link) => ({
    id: link.id,
    future_nomination_id: link.future_nomination_id,
    club_id: link.club_id,
    festival_id: link.festival_id,
    theme_pool_id: link.theme_pool_id,
    nominated: link.nominated || false,
    nominated_at: link.nominated_at,
    created_at: link.created_at,
    club: Array.isArray(link.clubs) ? link.clubs[0] : link.clubs,
    festival: Array.isArray(link.festivals) ? link.festivals[0] : link.festivals,
    theme_pool: Array.isArray(link.theme_pool) ? link.theme_pool[0] : link.theme_pool,
  }));

  return { data: links };
}

/**
 * Add a link from future nomination to club
 * @param themePoolId - ID from theme_pool table (for themes not yet scheduled as festivals)
 * @param festivalId - ID from festivals table (for scheduled festivals)
 */
export async function addFutureNominationLink(
  futureNominationId: string,
  clubId: string,
  themePoolId?: string | null,
  festivalId?: string | null
): Promise<AddFutureNominationLinkResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Verify the user owns this future nomination
  const { data: nomination, error: nomError } = await supabase
    .from("future_nomination_list")
    .select("id")
    .eq("id", futureNominationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (nomError || !nomination) {
    return { error: "Future nomination not found" };
  }

  // Verify the user is a member of the club
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: "You are not a member of this club" };
  }

  // Check if a link already exists for this specific theme_pool entry
  if (themePoolId) {
    const { data: existingLink } = await supabase
      .from("future_nomination_links")
      .select("id")
      .eq("future_nomination_id", futureNominationId)
      .eq("theme_pool_id", themePoolId)
      .maybeSingle();

    if (existingLink) {
      return { error: "This movie is already linked to this theme" };
    }
  }

  // Check if a link already exists for this specific festival
  if (festivalId) {
    const { data: existingLink } = await supabase
      .from("future_nomination_links")
      .select("id")
      .eq("future_nomination_id", futureNominationId)
      .eq("festival_id", festivalId)
      .maybeSingle();

    if (existingLink) {
      return { error: "This movie is already linked to this festival" };
    }
  }

  // Create the link
  const { data, error } = await supabase
    .from("future_nomination_links")
    .insert({
      future_nomination_id: futureNominationId,
      club_id: clubId,
      theme_pool_id: themePoolId || null,
      festival_id: festivalId || null,
      nominated: false,
    })
    .select("id")
    .single();

  if (error) {
    return handleActionError(error, "addFutureNominationLink");
  }

  revalidatePath("/profile");
  revalidatePath("/profile/nominations");
  return { success: true, id: data.id };
}

/**
 * Remove a future nomination link
 */
export async function removeFutureNominationLink(
  linkId: string
): Promise<RemoveFutureNominationLinkResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Verify the user owns this link (via the future nomination)
  const { data: link, error: linkError } = await supabase
    .from("future_nomination_links")
    .select(
      `
      id,
      future_nomination_list:future_nomination_id (
        user_id
      )
    `
    )
    .eq("id", linkId)
    .maybeSingle();

  if (linkError || !link) {
    return { error: "Link not found" };
  }

  const futureNom = Array.isArray(link.future_nomination_list)
    ? link.future_nomination_list[0]
    : link.future_nomination_list;

  if (!futureNom || futureNom.user_id !== user.id) {
    return { error: "You do not have permission to remove this link" };
  }

  const { error } = await supabase.from("future_nomination_links").delete().eq("id", linkId);

  if (error) {
    return handleActionError(error, "removeFutureNominationLink");
  }

  revalidatePath("/profile");
  revalidatePath("/profile/nominations");
  return { success: true };
}

/**
 * Nominate a movie from future list into a festival
 */
export async function nominateFromFutureList(
  futureNominationId: string,
  clubId: string,
  festivalId: string
): Promise<NominateFromFutureListResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get the future nomination
  const { data: futureNom, error: futureNomError } = await supabase
    .from("future_nomination_list")
    .select("id, tmdb_id")
    .eq("id", futureNominationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (futureNomError || !futureNom) {
    return { error: "Future nomination not found" };
  }

  // Check if this movie is already nominated in this festival
  const { data: existingNomination } = await supabase
    .from("nominations")
    .select("id")
    .eq("festival_id", festivalId)
    .eq("tmdb_id", futureNom.tmdb_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingNomination) {
    return { error: "This movie has already been nominated in this festival" };
  }

  // Create the nomination
  const { data: nomination, error: nominationError } = await supabase
    .from("nominations")
    .insert({
      user_id: user.id,
      festival_id: festivalId,
      tmdb_id: futureNom.tmdb_id,
    })
    .select("id")
    .single();

  if (nominationError) {
    return handleActionError(nominationError, "nominateFromFutureList");
  }

  // Update or create the link and mark it as nominated
  const { data: existingLink } = await supabase
    .from("future_nomination_links")
    .select("id")
    .eq("future_nomination_id", futureNominationId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (existingLink) {
    // Update existing link
    await supabase
      .from("future_nomination_links")
      .update({
        festival_id: festivalId,
        nominated: true,
        nominated_at: new Date().toISOString(),
      })
      .eq("id", existingLink.id);
  } else {
    // Create new link and mark as nominated
    await supabase.from("future_nomination_links").insert({
      future_nomination_id: futureNominationId,
      club_id: clubId,
      festival_id: festivalId,
      nominated: true,
      nominated_at: new Date().toISOString(),
    });
  }

  // Remove all OTHER links for this movie in the same club
  // (since you wouldn't want to watch the same movie twice in one club)
  await supabase
    .from("future_nomination_links")
    .delete()
    .eq("future_nomination_id", futureNominationId)
    .eq("club_id", clubId)
    .neq("festival_id", festivalId);

  // Check if all links for this future nomination are now nominated
  const { data: allLinks } = await supabase
    .from("future_nomination_links")
    .select("id, nominated")
    .eq("future_nomination_id", futureNominationId);

  const allNominated = allLinks?.every((link) => link.nominated) ?? false;
  const hasLinks = (allLinks?.length ?? 0) > 0;

  // If all links are nominated (and there is at least one link), remove the future nomination
  if (hasLinks && allNominated) {
    await supabase.from("future_nomination_list").delete().eq("id", futureNominationId);
  }

  revalidatePath("/profile");
  revalidatePath("/profile/nominations");
  return { success: true, nominationId: nomination.id };
}
