"use server";

/**
 * Club Polls Actions
 *
 * Server actions for creating, voting on, and deleting club polls.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidatePoll } from "@/lib/cache/invalidate";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { getClubSlug, checkAdminPermission, checkMembership } from "./_helpers";
import { handleActionError } from "@/lib/errors/handler";
import { createNotificationsForUsers } from "../notifications";
import { logClubActivity } from "@/lib/activity/logger";

export async function createPoll(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("createPoll", { limit: 5, windowMs: 60_000 });
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

  const clubId = formData.get("clubId") as string;
  const question = formData.get("question") as string;
  const optionsJson = formData.get("options") as string;
  const expiresAt = formData.get("expiresAt") as string | null;
  const actionType = formData.get("actionType") as string | null;
  const actionDataJson = formData.get("actionData") as string | null;
  const isAnonymous = formData.get("isAnonymous") === "true";
  const allowMultiple = formData.get("allowMultiple") === "true";

  if (!clubId || !question || !optionsJson) {
    return { error: "Club ID, question, and options are required" };
  }

  let options: string[];
  try {
    options = JSON.parse(optionsJson);
    if (!Array.isArray(options) || options.length < 2) {
      return { error: "At least 2 options are required" };
    }
  } catch {
    return { error: "Invalid options format" };
  }

  let actionData: Record<string, unknown> | null = null;
  if (actionDataJson) {
    try {
      actionData = JSON.parse(actionDataJson);
    } catch {
      return { error: "Invalid action data format" };
    }
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, clubId, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to create polls" };
  }

  const { data, error } = await supabase
    .from("club_polls")
    .insert({
      club_id: clubId,
      user_id: user.id,
      question: question.trim(),
      options: options,
      expires_at: expiresAt || null,
      action_type: actionType,
      action_data: actionData,
      is_anonymous: isAnonymous,
      allow_multiple: allowMultiple,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logClubActivity(clubId, "poll_created", {
    poll_question: question.trim(),
  });

  // Notify all club members about the new poll
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the creator

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(supabase, clubId);
    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "new_poll",
      title: "New Poll",
      message: `Vote now: ${question.trim()}`,
      link: `/club/${clubSlugForLink}`,
      clubId: clubId,
    });
  }

  invalidatePoll(data.id, clubId);
  return { success: true, data };
}

export async function voteOnPoll(pollId: string, optionIndex: number) {
  const rateCheck = await actionRateLimit("voteOnPoll", { limit: 30, windowMs: 60_000 });
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

  // Get poll to verify it's active, check settings, and verify membership
  const { data: poll, error: pollError } = await supabase
    .from("club_polls")
    .select("club_id, options, expires_at, allow_multiple")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found" };
  }

  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return { error: "This poll has expired" };
  }

  if (optionIndex < 0 || optionIndex >= (poll.options as string[]).length) {
    return { error: "Invalid option index" };
  }

  // Check user is a member
  const { isMember } = await checkMembership(supabase, poll.club_id, user.id);
  if (!isMember) {
    return { error: "You must be a member to vote" };
  }

  if (poll.allow_multiple) {
    // MULTI-SELECT: Toggle the specific option
    // Check if user already voted for this option
    const { data: existingVote } = await supabase
      .from("club_poll_votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .eq("option_index", optionIndex)
      .single();

    if (existingVote) {
      // Remove the vote (toggle off)
      const { error } = await supabase.from("club_poll_votes").delete().eq("id", existingVote.id);

      if (error) {
        return { error: error.message };
      }
    } else {
      // Add the vote (toggle on)
      const { error } = await supabase.from("club_poll_votes").insert({
        poll_id: pollId,
        user_id: user.id,
        option_index: optionIndex,
      });

      if (error) {
        return { error: error.message };
      }
    }
  } else {
    // SINGLE-SELECT: Replace existing vote
    // First, delete any existing votes for this poll by this user
    await supabase.from("club_poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);

    // Then insert the new vote
    const { error } = await supabase.from("club_poll_votes").insert({
      poll_id: pollId,
      user_id: user.id,
      option_index: optionIndex,
    });

    if (error) {
      return { error: error.message };
    }
  }

  // No revalidatePath - client handles UI updates optimistically
  return { success: true };
}

export interface UpdatePollData {
  question?: string;
  expires_at?: string | null;
  // Can only update these if no votes exist
  is_anonymous?: boolean;
  allow_multiple?: boolean;
}

export async function closePoll(pollId: string) {
  const rateCheck = await actionRateLimit("closePoll", { limit: 10, windowMs: 60_000 });
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

  // Get poll to check permissions
  const { data: poll, error: pollError } = await supabase
    .from("club_polls")
    .select("club_id, expires_at, question")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found" };
  }

  // Check if already expired
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return { error: "Poll has already ended" };
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, poll.club_id, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to close polls" };
  }

  // Set expires_at to now to close the poll
  const { error } = await supabase
    .from("club_polls")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", pollId);

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logClubActivity(poll.club_id, "poll_closed", {
    poll_question: poll.question,
  });

  invalidatePoll(pollId, poll.club_id);
  return { success: true };
}

export async function updatePoll(pollId: string, data: UpdatePollData) {
  const rateCheck = await actionRateLimit("updatePoll", { limit: 10, windowMs: 60_000 });
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

  // Get poll to check permissions
  const { data: poll, error: pollError } = await supabase
    .from("club_polls")
    .select("club_id, user_id, is_anonymous, allow_multiple")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found" };
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, poll.club_id, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to edit polls" };
  }

  // Check if poll has votes (for certain updates)
  const { count: voteCount } = await supabase
    .from("club_poll_votes")
    .select("*", { count: "exact", head: true })
    .eq("poll_id", pollId);

  const hasVotes = (voteCount ?? 0) > 0;

  // Build update object
  const updateData: Record<string, unknown> = {};

  if (data.question !== undefined) {
    updateData.question = data.question.trim();
  }

  if (data.expires_at !== undefined) {
    updateData.expires_at = data.expires_at;
  }

  // Can only change these settings if no votes exist
  if (data.is_anonymous !== undefined) {
    if (hasVotes && data.is_anonymous !== poll.is_anonymous) {
      return { error: "Cannot change anonymity setting after votes have been cast" };
    }
    updateData.is_anonymous = data.is_anonymous;
  }

  if (data.allow_multiple !== undefined) {
    if (hasVotes && data.allow_multiple !== poll.allow_multiple) {
      return { error: "Cannot change multi-select setting after votes have been cast" };
    }
    updateData.allow_multiple = data.allow_multiple;
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "No changes provided" };
  }

  const { error } = await supabase.from("club_polls").update(updateData).eq("id", pollId);

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logClubActivity(poll.club_id, "poll_edited", {
    poll_id: pollId,
  });

  invalidatePoll(pollId, poll.club_id);
  return { success: true };
}

export async function deletePoll(pollId: string) {
  const rateCheck = await actionRateLimit("deletePoll", { limit: 10, windowMs: 60_000 });
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

  // Get poll to check permissions
  const { data: poll, error: pollError } = await supabase
    .from("club_polls")
    .select("club_id, user_id, question")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found" };
  }

  // Check admin permissions - any admin can delete polls for moderation
  const { isAdmin } = await checkAdminPermission(supabase, poll.club_id, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to delete polls" };
  }

  const { error } = await supabase.from("club_polls").delete().eq("id", pollId);

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logClubActivity(poll.club_id, "poll_deleted", {
    poll_question: poll.question,
  });

  invalidatePoll(pollId, poll.club_id);
  return { success: true };
}

// ============================================
// TYPES
// ============================================

export interface PollWithVotes {
  id: string;
  club_id: string;
  user_id: string;
  question: string;
  options: string[];
  expires_at: string | null;
  created_at: string;
  action_type: string | null;
  action_data: Record<string, unknown> | null;
  processed_at: string | null;
  is_anonymous: boolean;
  allow_multiple: boolean;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  votes: {
    option_index: number;
    count: number;
  }[];
  total_votes: number;
}

export interface PollVoter {
  user_id: string;
  option_index: number;
  created_at: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

// ============================================
// GET POLLS WITH VOTES
// ============================================

export async function getPollsWithVotes(
  clubId: string,
  options?: {
    active?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null, total: 0 };
  }

  // Check membership
  const { isMember } = await checkMembership(supabase, clubId, user.id);
  if (!isMember) {
    return { error: "You must be a member to view polls", data: null, total: 0 };
  }

  const now = new Date().toISOString();

  // Build query for polls
  let query = supabase
    .from("club_polls")
    .select(
      `
      *,
      user:user_id (id, display_name, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index)
    `,
      { count: "exact" }
    )
    .eq("club_id", clubId);

  // Filter by active/expired
  if (options?.active === true) {
    query = query.or(`expires_at.is.null,expires_at.gte.${now}`);
  } else if (options?.active === false) {
    query = query.lt("expires_at", now);
  }

  // Order by created_at descending
  query = query.order("created_at", { ascending: false });

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data: polls, error, count } = await query;

  if (error) {
    const result = handleActionError(error, { action: "getPollsWithVotes", metadata: { clubId } });
    return { error: result.error, data: null, total: 0 };
  }

  if (!polls || polls.length === 0) {
    return { data: [], error: null, total: 0 };
  }

  // Fetch vote counts for all polls (include user_id for multi-select unique voter count)
  const pollIds = polls.map((p) => p.id);
  const { data: allVotes } = await supabase
    .from("club_poll_votes")
    .select("poll_id, option_index, user_id")
    .in("poll_id", pollIds);

  // Calculate vote counts per poll and option
  const voteCountsByPoll = new Map<string, Map<number, number>>();
  allVotes?.forEach((vote) => {
    if (!voteCountsByPoll.has(vote.poll_id)) {
      voteCountsByPoll.set(vote.poll_id, new Map());
    }
    const pollVotes = voteCountsByPoll.get(vote.poll_id)!;
    pollVotes.set(vote.option_index, (pollVotes.get(vote.option_index) || 0) + 1);
  });

  // Transform polls with vote data
  const pollsWithVotes: PollWithVotes[] = polls.map((poll) => {
    const pollVotes = voteCountsByPoll.get(poll.id) || new Map();
    const options = poll.options as string[];
    const votes = options.map((_, index) => ({
      option_index: index,
      count: pollVotes.get(index) || 0,
    }));

    // For multi-select polls, total_votes should be unique voter count
    // For single-select, it's the same as sum of all votes
    let total_votes: number;
    if (poll.allow_multiple) {
      // Count unique voters for this poll
      const pollVoterIds = new Set(
        allVotes?.filter((v) => v.poll_id === poll.id).map((v) => v.user_id) || []
      );
      total_votes = pollVoterIds.size;
    } else {
      total_votes = votes.reduce((sum, v) => sum + v.count, 0);
    }

    return {
      id: poll.id,
      club_id: poll.club_id,
      user_id: poll.user_id,
      question: poll.question,
      options: options,
      expires_at: poll.expires_at,
      created_at: poll.created_at,
      action_type: poll.action_type,
      action_data: poll.action_data as Record<string, unknown> | null,
      processed_at: poll.processed_at,
      is_anonymous: poll.is_anonymous ?? false,
      allow_multiple: poll.allow_multiple ?? false,
      user: Array.isArray(poll.user) ? poll.user[0] : poll.user,
      votes,
      total_votes,
    };
  });

  return { data: pollsWithVotes, error: null, total: count || 0 };
}

// ============================================
// GET POLL VOTERS
// ============================================

export async function getPollVoters(pollId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null, isAnonymous: false };
  }

  // Get poll to check membership and anonymity
  const { data: poll, error: pollError } = await supabase
    .from("club_polls")
    .select("club_id, question, options, is_anonymous")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found", data: null, isAnonymous: false };
  }

  // Check membership
  const { isMember } = await checkMembership(supabase, poll.club_id, user.id);
  if (!isMember) {
    return { error: "You must be a member to view poll results", data: null, isAnonymous: false };
  }

  // If anonymous poll, return empty voters array (counts are still visible via getPollsWithVotes)
  if (poll.is_anonymous) {
    return { data: [], error: null, isAnonymous: true };
  }

  // Fetch all voters with user details
  const { data: votes, error } = await supabase
    .from("club_poll_votes")
    .select(
      `
      user_id,
      option_index,
      created_at,
      user:user_id (id, display_name, avatar_url, username, avatar_icon, avatar_color_index, avatar_border_color_index)
    `
    )
    .eq("poll_id", pollId)
    .order("created_at", { ascending: true });

  if (error) {
    const result = handleActionError(error, { action: "getPollVoters", metadata: { pollId } });
    return { error: result.error, data: null, isAnonymous: false };
  }

  const voters: PollVoter[] = (votes || []).map((vote) => ({
    user_id: vote.user_id,
    option_index: vote.option_index,
    created_at: vote.created_at,
    user: Array.isArray(vote.user) ? vote.user[0] : vote.user,
  }));

  return { data: voters, error: null, isAnonymous: false };
}
