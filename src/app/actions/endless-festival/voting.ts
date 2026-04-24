"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateClub } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import { createNotificationsForUsers } from "../notifications";
import { logClubActivity } from "@/lib/activity/logger";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

/**
 * Toggle vote for a movie in the pool (upvote/remove)
 * Uses toggle pattern to avoid race conditions with rapid clicking
 * Based on governance settings, may auto-promote to Now Playing
 */
export async function togglePoolMovieVote(
  poolItemId: string
): Promise<{ success: boolean; voted: boolean; autoPromoted?: boolean } | { error: string }> {
  const rateCheck = await actionRateLimit("togglePoolMovieVote", { limit: 30, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Get the pool item from club_movie_pool
  const { data: poolItem } = await supabase
    .from("club_movie_pool")
    .select(
      `
      id,
      club_id,
      tmdb_id,
      user_id,
      pitch,
      movie:movies!inner(title)
    `
    )
    .eq("id", poolItemId)
    .is("deleted_at", null)
    .single();

  if (!poolItem) {
    return { error: "Movie not found" };
  }

  const movie = Array.isArray(poolItem.movie) ? poolItem.movie[0] : poolItem.movie;

  // Check membership
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", poolItem.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You must be a club member to vote" };
  }

  // Get club settings
  const { data: club } = await supabase
    .from("clubs")
    .select("settings, slug")
    .eq("id", poolItem.club_id)
    .single();

  const settings = (club?.settings as Record<string, unknown>) || {};
  const moviePoolEnabled = settings.movie_pool_enabled !== false;
  const votingEnabled = settings.movie_pool_voting_enabled !== false;
  const governance = (settings.movie_pool_governance as string) || "autocracy";
  const autoPromoteThreshold = (settings.movie_pool_auto_promote_threshold as number) || 5;

  if (!moviePoolEnabled) {
    return { error: "The movie pool is currently disabled for this club" };
  }

  if (!votingEnabled) {
    return { error: "Voting is not enabled for this club" };
  }

  // Check if user already voted
  const { data: existingVote } = await supabase
    .from("movie_pool_votes")
    .select("id")
    .eq("club_pool_item_id", poolItemId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Toggle: if vote exists, remove it; otherwise add it
  if (existingVote) {
    // Remove vote
    const { error: deleteError } = await supabase
      .from("movie_pool_votes")
      .delete()
      .eq("club_pool_item_id", poolItemId)
      .eq("user_id", user.id);

    if (deleteError) {
      return { error: "Failed to remove vote" };
    }

    invalidateClub(poolItem.club_id);
    return { success: true, voted: false };
  }

  // Add vote
  const { error: voteError } = await supabase.from("movie_pool_votes").insert({
    club_pool_item_id: poolItemId,
    user_id: user.id,
    vote_type: "upvote",
  });

  if (voteError) {
    return handleActionError(voteError, "togglePoolMovieVote");
  }

  // Count total votes for this movie
  const { count: voteCount } = await supabase
    .from("movie_pool_votes")
    .select("*", { count: "exact", head: true })
    .eq("club_pool_item_id", poolItemId)
    .eq("vote_type", "upvote");

  // Check for auto-promote (democracy mode)
  let autoPromoted = false;
  if (governance === "democracy" && voteCount && voteCount >= autoPromoteThreshold) {
    // Auto-promote to Now Playing using moveToPlaying
    const { moveToPlaying } = await import("./status");
    const promoteResult = await moveToPlaying(poolItemId);

    if (!("error" in promoteResult)) {
      autoPromoted = true;

      // Log activity
      await logClubActivity(poolItem.club_id, "endless_movie_playing", {
        tmdb_id: poolItem.tmdb_id,
        movie_title: movie.title,
        auto_promoted: true,
        vote_count: voteCount,
      });

      // Notify club members
      const { data: members } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", poolItem.club_id);

      if (members && members.length > 0) {
        await createNotificationsForUsers({
          userIds: members.map((m) => m.user_id),
          type: "endless_movie_added",
          title: "Now Showing",
          message: `"${movie.title}" reached ${voteCount} votes and is now showing!`,
          link: `/club/${club?.slug || poolItem.club_id}`,
          clubId: poolItem.club_id,
        });
      }
    }
  }

  invalidateClub(poolItem.club_id);
  return { success: true, voted: true, autoPromoted };
}

/**
 * Get vote count for a movie in the pool
 */
export async function getPoolMovieVotes(
  poolItemId: string
): Promise<{ count: number; userVoted: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get total vote count
  const { count } = await supabase
    .from("movie_pool_votes")
    .select("*", { count: "exact", head: true })
    .eq("club_pool_item_id", poolItemId)
    .eq("vote_type", "upvote");

  // Check if current user voted
  let userVoted = false;
  if (user) {
    const { data: vote } = await supabase
      .from("movie_pool_votes")
      .select("id")
      .eq("club_pool_item_id", poolItemId)
      .eq("user_id", user.id)
      .maybeSingle();

    userVoted = !!vote;
  }

  return { count: count || 0, userVoted };
}

/**
 * Get votes for multiple movies at once (batch)
 */
export async function getPoolMoviesVotes(
  poolItemIds: string[]
): Promise<Map<string, { count: number; userVoted: boolean }>> {
  const supabase = await createClient();
  const result = new Map<string, { count: number; userVoted: boolean }>();

  if (poolItemIds.length === 0) {
    return result;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all votes for these pool items
  const { data: votes } = await supabase
    .from("movie_pool_votes")
    .select("club_pool_item_id, user_id")
    .in("club_pool_item_id", poolItemIds)
    .eq("vote_type", "upvote");

  // Count votes per pool item
  const voteCounts = new Map<string, number>();
  const userVotes = new Set<string>();

  votes?.forEach((vote) => {
    if (vote.club_pool_item_id) {
      voteCounts.set(vote.club_pool_item_id, (voteCounts.get(vote.club_pool_item_id) || 0) + 1);
      if (user && vote.user_id === user.id) {
        userVotes.add(vote.club_pool_item_id);
      }
    }
  });

  // Build result map
  poolItemIds.forEach((id) => {
    result.set(id, {
      count: voteCounts.get(id) || 0,
      userVoted: userVotes.has(id),
    });
  });

  return result;
}

/**
 * Pick a random movie from the pool and move it to playing (random governance)
 */
export async function pickRandomFromPool(
  clubId: string
): Promise<{ success: boolean; poolItemId?: string; movieTitle?: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can pick random movies" };
  }

  // Get all pool movies from club_movie_pool
  const { data: poolMovies } = await supabase
    .from("club_movie_pool")
    .select(
      `
      id,
      tmdb_id,
      movie:movies!inner(title)
    `
    )
    .eq("club_id", clubId)
    .is("deleted_at", null);

  if (!poolMovies || poolMovies.length === 0) {
    return { error: "No movies in the pool to pick from" };
  }

  // Pick random movie
  const randomIndex = Math.floor(Math.random() * poolMovies.length);
  const selectedMovie = poolMovies[randomIndex];
  const movie = Array.isArray(selectedMovie.movie) ? selectedMovie.movie[0] : selectedMovie.movie;

  // Use moveToPlaying to handle all the promotion logic
  const { moveToPlaying } = await import("./status");
  const promoteResult = await moveToPlaying(selectedMovie.id);

  if ("error" in promoteResult) {
    return { error: promoteResult.error };
  }

  // Log activity (moveToPlaying already logs, but we add random_pick flag)
  await logClubActivity(clubId, "endless_movie_playing", {
    tmdb_id: selectedMovie.tmdb_id,
    movie_title: movie.title,
    random_pick: true,
  });

  // Notify club members
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id);

  if (members && members.length > 0) {
    const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();

    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "endless_movie_added",
      title: "Now Showing",
      message: `"${movie.title}" was randomly selected and is now showing!`,
      link: `/club/${club?.slug || clubId}`,
      clubId: clubId,
    });
  }

  invalidateClub(clubId);

  return { success: true, poolItemId: selectedMovie.id, movieTitle: movie.title };
}
