"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateDiscussion } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import type { SupabaseClient } from "@supabase/supabase-js";

async function resolveThreadClub(
  supabase: SupabaseClient,
  threadId: string | null,
  commentId: string | null
): Promise<{ threadId: string; clubId: string } | null> {
  if (threadId) {
    const { data } = await supabase
      .from("discussion_threads")
      .select("id, club_id")
      .eq("id", threadId)
      .maybeSingle();
    return data ? { threadId: data.id as string, clubId: data.club_id as string } : null;
  }
  if (commentId) {
    const { data } = await supabase
      .from("discussion_comments")
      .select("thread_id, thread:discussion_threads!inner(club_id)")
      .eq("id", commentId)
      .maybeSingle();
    const threadRow = Array.isArray(data?.thread) ? data?.thread[0] : data?.thread;
    if (data && threadRow) {
      return { threadId: data.thread_id as string, clubId: threadRow.club_id as string };
    }
  }
  return null;
}
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

/**
 * Toggle a vote on a thread or comment
 */
export async function toggleVote(
  threadId: string | null,
  commentId: string | null
): Promise<{ success: boolean; voted: boolean } | { error: string }> {
  try {
    const rateCheck = await actionRateLimit("toggleVote", { limit: 30, windowMs: 60_000 });
    if (!rateCheck.success) return { error: rateCheck.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    const verified = requireVerifiedEmail(user);
    if (!verified.ok) return { error: verified.error };

    if (!threadId && !commentId) {
      return { error: "Either thread or comment ID is required" };
    }

    // Check if vote already exists
    let voteQuery = supabase.from("discussion_votes").select("id").eq("user_id", user.id);

    if (threadId) {
      voteQuery = voteQuery.eq("thread_id", threadId).is("comment_id", null);
    } else if (commentId) {
      voteQuery = voteQuery.eq("comment_id", commentId).is("thread_id", null);
    }

    const { data: existingVote } = await voteQuery.maybeSingle();

    const scope = await resolveThreadClub(supabase, threadId, commentId);

    if (existingVote) {
      // Remove vote
      const { error } = await supabase.from("discussion_votes").delete().eq("id", existingVote.id);

      if (error) {
        return { error: error.message };
      }

      if (scope) invalidateDiscussion(scope.threadId, scope.clubId);
      return { success: true, voted: false };
    } else {
      // Add vote
      const { error } = await supabase.from("discussion_votes").insert({
        user_id: user.id,
        thread_id: threadId || null,
        comment_id: commentId || null,
      });

      if (error) {
        return { error: error.message };
      }

      if (scope) invalidateDiscussion(scope.threadId, scope.clubId);
      return { success: true, voted: true };
    }
  } catch (error) {
    return handleActionError(error, "toggleVote");
  }
}

/**
 * Get a user's vote status for a thread or comment
 */
export async function getUserVote(
  threadId: string | null,
  commentId: string | null,
  userId: string
): Promise<{ data: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    let voteQuery = supabase.from("discussion_votes").select("id").eq("user_id", userId);

    if (threadId) {
      voteQuery = voteQuery.eq("thread_id", threadId).is("comment_id", null);
    } else if (commentId) {
      voteQuery = voteQuery.eq("comment_id", commentId).is("thread_id", null);
    }

    const { data: vote } = await voteQuery.maybeSingle();

    return { data: !!vote };
  } catch (error) {
    return handleActionError(error, "getUserVote");
  }
}

/**
 * Unlock a thread for a user (for spoiler threads)
 */
export async function unlockThread(
  threadId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const rateCheck = await actionRateLimit("unlockThread", { limit: 20, windowMs: 60_000 });
    if (!rateCheck.success) return { error: rateCheck.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    const verified = requireVerifiedEmail(user);
    if (!verified.ok) return { error: verified.error };

    // Get thread to check if it requires unlocking
    const { data: thread } = await supabase
      .from("discussion_threads")
      .select("unlock_on_watch, club_id")
      .eq("id", threadId)
      .single();

    if (!thread) {
      return { error: "Thread not found" };
    }

    if (!thread.unlock_on_watch) {
      return { error: "This thread does not require unlocking" };
    }

    // Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from("discussion_thread_unlocks")
      .select("id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingUnlock) {
      return { success: true }; // Already unlocked
    }

    // Create unlock (should be done via trigger when watching movie, but allow manual unlock)
    const { error } = await supabase.from("discussion_thread_unlocks").insert({
      thread_id: threadId,
      user_id: user.id,
    });

    if (error) {
      return { error: error.message };
    }

    invalidateDiscussion(threadId, thread.club_id);
    return { success: true };
  } catch (error) {
    return handleActionError(error, "unlockThread");
  }
}

/**
 * Check if a thread is unlocked for a user
 */
export async function checkThreadUnlocked(
  threadId: string,
  userId: string
): Promise<{ data: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    const { data: unlock } = await supabase
      .from("discussion_thread_unlocks")
      .select("id")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .maybeSingle();

    return { data: !!unlock };
  } catch (error) {
    return handleActionError(error, "checkThreadUnlocked");
  }
}

/**
 * Reveal spoilers for a thread (simpler version of unlockThread)
 * This persists the user's choice to reveal spoilers without any preconditions
 */
export async function revealThreadSpoilers(
  threadId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const rateCheck = await actionRateLimit("revealThreadSpoilers", {
      limit: 20,
      windowMs: 60_000,
    });
    if (!rateCheck.success) return { error: rateCheck.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    const verified = requireVerifiedEmail(user);
    if (!verified.ok) return { error: verified.error };

    // Check if already revealed
    const { data: existingUnlock } = await supabase
      .from("discussion_thread_unlocks")
      .select("id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingUnlock) {
      return { success: true }; // Already revealed
    }

    // Create unlock/reveal record
    const { error } = await supabase.from("discussion_thread_unlocks").insert({
      thread_id: threadId,
      user_id: user.id,
    });

    if (error) {
      return { error: error.message };
    }

    const scope = await resolveThreadClub(supabase, threadId, null);
    if (scope) invalidateDiscussion(scope.threadId, scope.clubId);
    return { success: true };
  } catch (error) {
    return handleActionError(error, "revealThreadSpoilers");
  }
}
