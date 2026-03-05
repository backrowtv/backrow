"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import { createNotificationsForUsers } from "./notifications";
import { parseAddFeedbackItemFormData, UUIDSchema } from "@/lib/validation/server-actions";
import type { FeedbackType, FeedbackStatus, FeedbackItemWithUser } from "./feedback.types";

/**
 * Get all feedback items of a given type with user info and vote counts
 */
export async function getFeedbackItems(type: FeedbackType): Promise<{
  data: FeedbackItemWithUser[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: "You must be signed in to view feedback" };
  }

  // Get feedback items with user info
  const { data: items, error: itemsError } = await supabase
    .from("feedback_items")
    .select(
      `
      id,
      type,
      title,
      description,
      user_id,
      status,
      admin_response,
      created_at,
      updated_at,
      user:users!feedback_items_user_id_fkey (
        id,
        display_name,
        username,
        avatar_url,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      )
    `
    )
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (itemsError) {
    return { data: null, error: handleActionError(itemsError, "getFeedbackItems").error };
  }

  if (!items || items.length === 0) {
    return { data: [], error: null };
  }

  // Get vote counts for all items
  const itemIds = items.map((item) => item.id);
  const { data: votes, error: votesError } = await supabase
    .from("feedback_votes")
    .select("feedback_id")
    .in("feedback_id", itemIds);

  if (votesError) {
    handleActionError(votesError, { action: "getFeedbackItems", silent: true });
  }

  // Count votes per item
  const voteCounts: Record<string, number> = {};
  if (votes) {
    votes.forEach((vote) => {
      voteCounts[vote.feedback_id] = (voteCounts[vote.feedback_id] || 0) + 1;
    });
  }

  // Combine items with vote counts
  // Note: Supabase returns user as an array due to join syntax, so we extract first element
  const itemsWithVotes: FeedbackItemWithUser[] = items.map((item) => {
    const userData = item.user;
    const user = Array.isArray(userData) ? userData[0] || null : userData;
    return {
      ...item,
      vote_count: voteCounts[item.id] || 0,
      user: user as FeedbackItemWithUser["user"],
    };
  });

  return { data: itemsWithVotes, error: null };
}

/**
 * Get the current user's votes on feedback items
 */
export async function getFeedbackVotes(): Promise<{
  data: Set<string> | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: "You must be signed in" };
  }

  const { data: votes, error } = await supabase
    .from("feedback_votes")
    .select("feedback_id")
    .eq("user_id", user.id);

  if (error) {
    return { data: null, error: handleActionError(error, "getFeedbackVotes").error };
  }

  const voteSet = new Set(votes?.map((v) => v.feedback_id) || []);
  return { data: voteSet, error: null };
}

/**
 * Add a new feedback item (bug report or feature request)
 */
export async function addFeedbackItem(
  prevState: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to submit feedback" };
  }

  // Validate input with Zod
  const parseResult = parseAddFeedbackItemFormData(formData);
  if (!parseResult.success) {
    return { error: parseResult.error };
  }

  const { type, title, description } = parseResult.data;

  // Insert feedback item
  const { error } = await supabase.from("feedback_items").insert({
    type,
    title: title.trim(),
    description: description?.trim() || null,
    user_id: user.id,
    status: "open",
  });

  if (error) {
    return handleActionError(error, "addFeedbackItem");
  }

  // Notify site admins about new feedback
  try {
    const { data: admins } = await supabase.from("site_admins").select("user_id");

    if (admins && admins.length > 0) {
      const adminIds = admins.map((a) => a.user_id);
      const typeLabel = type === "bug" ? "Bug Report" : "Feature Request";

      await createNotificationsForUsers({
        userIds: adminIds,
        type: "feedback_submitted",
        title: `New ${typeLabel}`,
        message: title.trim(),
        link: "/feedback",
      });
    }
  } catch (notifyError) {
    // Log but don't fail the feedback submission
    handleActionError(notifyError, { action: "addFeedbackItem:notify", silent: true });
  }

  revalidatePath("/feedback");
  return { success: true };
}

/**
 * Toggle vote on a feedback item (vote or remove vote)
 */
export async function voteOnFeedback(feedbackId: string): Promise<{
  success?: boolean;
  action?: "added" | "removed";
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to vote" };
  }

  // Validate input with Zod
  const parseResult = UUIDSchema.safeParse(feedbackId);
  if (!parseResult.success) {
    return { error: "Invalid feedback ID" };
  }

  // Check if user already voted
  const { data: existingVote, error: checkError } = await supabase
    .from("feedback_votes")
    .select("id")
    .eq("feedback_id", feedbackId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) {
    return handleActionError(checkError, "voteOnFeedback");
  }

  if (existingVote) {
    // Remove vote
    const { error: deleteError } = await supabase
      .from("feedback_votes")
      .delete()
      .eq("id", existingVote.id);

    if (deleteError) {
      return handleActionError(deleteError, "voteOnFeedback");
    }

    revalidatePath("/feedback");
    return { success: true, action: "removed" };
  } else {
    // Add vote
    const { error: insertError } = await supabase.from("feedback_votes").insert({
      feedback_id: feedbackId,
      user_id: user.id,
    });

    if (insertError) {
      return handleActionError(insertError, "voteOnFeedback");
    }

    revalidatePath("/feedback");
    return { success: true, action: "added" };
  }
}

/**
 * Delete a feedback item (only owner can delete)
 */
export async function deleteFeedbackItem(feedbackId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check ownership
  const { data: item, error: checkError } = await supabase
    .from("feedback_items")
    .select("user_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (checkError) {
    return handleActionError(checkError, "deleteFeedbackItem");
  }

  if (!item) {
    return { error: "Feedback item not found" };
  }

  if (item.user_id !== user.id) {
    return { error: "You can only delete your own feedback" };
  }

  // Delete the item
  const { error: deleteError } = await supabase
    .from("feedback_items")
    .delete()
    .eq("id", feedbackId);

  if (deleteError) {
    return handleActionError(deleteError, "deleteFeedbackItem");
  }

  revalidatePath("/feedback");
  return { success: true };
}

/**
 * Update feedback item status (admin only)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
  adminResponse?: string
): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check if user is a site admin
  const { data: adminRecord, error: adminError } = await supabase
    .from("site_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return handleActionError(adminError, "updateFeedbackStatus");
  }

  if (!adminRecord) {
    return { error: "Only site admins can update feedback status" };
  }

  // Validate status
  const validStatuses: FeedbackStatus[] = ["open", "in_progress", "resolved", "closed", "wont_fix"];
  if (!validStatuses.includes(status)) {
    return { error: "Invalid status" };
  }

  // Update the item
  const updateData: { status: FeedbackStatus; admin_response?: string | null } = { status };
  if (adminResponse !== undefined) {
    updateData.admin_response = adminResponse.trim() || null;
  }

  const { error: updateError } = await supabase
    .from("feedback_items")
    .update(updateData)
    .eq("id", feedbackId);

  if (updateError) {
    return handleActionError(updateError, "updateFeedbackStatus");
  }

  revalidatePath("/feedback");
  return { success: true };
}

/**
 * Check if current user is a site admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data: adminRecord } = await supabase
    .from("site_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!adminRecord;
}
