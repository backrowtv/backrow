"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateDiscussion } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import { createNotification } from "../notifications";
import type { DiscussionComment, CommentSubtreeResult } from "./types";
import { parseCreateCommentFormData } from "@/lib/validation/server-actions";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

/**
 * Get all comments for a thread
 */
export async function getCommentsByThread(
  threadId: string,
  options?: {
    sortBy?: "new" | "old" | "top";
  }
): Promise<{ data: DiscussionComment[] } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Get thread to check membership
    const { data: thread } = await supabase
      .from("discussion_threads")
      .select("club_id")
      .eq("id", threadId)
      .single();

    if (!thread) {
      return { error: "Thread not found" };
    }

    // Check user is member of club
    const { data: membership } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", thread.club_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You must be a member of this club" };
    }

    let query = supabase
      .from("discussion_comments")
      .select(
        `
        *,
        author:author_id(id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index)
      `
      )
      .eq("thread_id", threadId);

    // Sort
    if (options?.sortBy === "top") {
      query = query.order("upvotes", { ascending: false });
    } else if (options?.sortBy === "old") {
      query = query.order("created_at", { ascending: true });
    } else {
      // Default: new
      query = query.order("created_at", { ascending: false });
    }

    const { data: comments, error } = await query;

    if (error) {
      return { error: error.message };
    }

    // Build nested comment structure
    const commentMap = new Map<string, DiscussionComment & { replies: DiscussionComment[] }>();
    const rootComments: DiscussionComment[] = [];

    // First pass: create map of all comments
    comments?.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments?.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return { data: rootComments };
  } catch (error) {
    return handleActionError(error, "getCommentsByThread");
  }
}

/**
 * Get a comment and all its descendants (for "Continue thread" view)
 * This fetches only the subtree starting from a specific comment.
 */
export async function getCommentSubtree(
  commentId: string,
  options?: {
    sortBy?: "new" | "old" | "top";
  }
): Promise<{ data: CommentSubtreeResult } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // First get the anchor comment with thread info
    const { data: anchorComment, error: anchorError } = await supabase
      .from("discussion_comments")
      .select(
        `
        *,
        author:author_id(id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index),
        thread:thread_id(
          id,
          title,
          slug,
          club:club_id(id, slug)
        )
      `
      )
      .eq("id", commentId)
      .single();

    if (anchorError || !anchorComment) {
      return { error: "Comment not found" };
    }

    const thread = anchorComment.thread as {
      id: string;
      title: string;
      slug: string | null;
      club: { id: string; slug: string };
    };

    // Check user is member of club
    const { data: membership } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", thread.club.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You must be a member of this club" };
    }

    // Fetch all comments in this thread (we need to build subtree)
    let query = supabase
      .from("discussion_comments")
      .select(
        `
        *,
        author:author_id(id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index)
      `
      )
      .eq("thread_id", thread.id);

    // Sort
    if (options?.sortBy === "top") {
      query = query.order("upvotes", { ascending: false });
    } else if (options?.sortBy === "old") {
      query = query.order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: allComments, error: commentsError } = await query;

    if (commentsError) {
      return { error: commentsError.message };
    }

    // Build the subtree starting from anchor comment
    const commentMap = new Map<string, DiscussionComment & { replies: DiscussionComment[] }>();

    // First pass: create map of all comments
    allComments?.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure (attach children to parents)
    allComments?.forEach((comment) => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        const child = commentMap.get(comment.id);
        if (parent && child) {
          parent.replies.push(child);
        }
      }
    });

    // Get the anchor with its replies
    const anchorWithReplies = commentMap.get(commentId);
    if (!anchorWithReplies) {
      return { error: "Failed to build comment tree" };
    }

    // Get parent comment info if exists (for context display)
    let parentComment: CommentSubtreeResult["parentComment"];
    if (anchorComment.parent_id) {
      const parent = commentMap.get(anchorComment.parent_id);
      if (parent) {
        // Strip HTML for snippet
        const plainText = parent.content.replace(/<[^>]*>/g, "");
        parentComment = {
          id: parent.id,
          authorName: parent.author?.display_name || "Unknown",
          contentSnippet: plainText.length > 100 ? plainText.slice(0, 100) + "..." : plainText,
        };
      }
    }

    return {
      data: {
        anchor: anchorWithReplies,
        threadId: thread.id,
        threadTitle: thread.title,
        threadSlug: thread.slug,
        clubSlug: thread.club.slug,
        parentComment,
      },
    };
  } catch (error) {
    return handleActionError(error, "getCommentSubtree");
  }
}

/**
 * Create a new comment on a thread
 */
export async function createComment(
  prevState: unknown,
  formData: FormData
): Promise<
  { success: boolean; commentId?: string; comment?: DiscussionComment } | { error: string }
> {
  const rateCheck = await actionRateLimit("createComment", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    const verified = requireVerifiedEmail(user);
    if (!verified.ok) return { error: verified.error };

    // Validate input with Zod
    const parseResult = parseCreateCommentFormData(formData);
    if (!parseResult.success) {
      return { error: parseResult.error };
    }

    const { threadId, content, parentId, isSpoiler } = parseResult.data;

    // Get thread to check membership and lock status (and club_id for blacklist)
    const { data: thread } = await supabase
      .from("discussion_threads")
      .select("club_id, is_locked")
      .eq("id", threadId)
      .single();

    if (!thread) {
      return { error: "Thread not found" };
    }

    if (thread.is_locked) {
      return { error: "This thread is locked" };
    }

    // Check user is member of club
    const { data: membership } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", thread.club_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You must be a member of this club" };
    }

    // Check blacklist for comment content
    const { validateBlacklist } = await import("@/lib/clubs/blacklist");
    const blacklistError = await validateBlacklist(thread.club_id, content);
    if (blacklistError) {
      return { error: blacklistError };
    }

    const { data: comment, error } = await supabase
      .from("discussion_comments")
      .insert({
        thread_id: threadId,
        author_id: user.id,
        parent_id: parentId || null,
        content: content.trim(),
        is_spoiler: isSpoiler,
      })
      .select(
        `
        *,
        author:author_id(id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index)
`
      )
      .single();

    if (error) {
      return { error: error.message };
    }

    // Send notification to thread author (if not self)
    const { data: threadData } = await supabase
      .from("discussion_threads")
      .select("author_id, title, slug")
      .eq("id", threadId)
      .single();

    const threadSlugOrId = threadData?.slug || threadId;

    if (threadData && threadData.author_id !== user.id) {
      await createNotification({
        userId: threadData.author_id,
        type: "discussion_comment_reply",
        title: "New Comment",
        message: `${user.user_metadata?.display_name || "Someone"} commented on your thread: ${threadData.title}`,
        link: `/club/${thread.club_id}/discuss/${threadSlugOrId}`,
        clubId: thread.club_id,
      });
    }

    // Send notification to parent comment author (if replying)
    if (parentId) {
      const { data: parentComment } = await supabase
        .from("discussion_comments")
        .select("author_id")
        .eq("id", parentId)
        .single();

      if (parentComment && parentComment.author_id !== user.id) {
        await createNotification({
          userId: parentComment.author_id,
          type: "discussion_comment_reply",
          title: "Reply to Your Comment",
          message: `${user.user_metadata?.display_name || "Someone"} replied to your comment`,
          link: `/club/${thread.club_id}/discuss/${threadSlugOrId}`,
          clubId: thread.club_id,
        });
      }
    }

    invalidateDiscussion(threadId, thread.club_id);
    return { success: true, commentId: comment.id, comment: comment as DiscussionComment };
  } catch (error) {
    return handleActionError(error, "createComment");
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<{ success: boolean } | { error: string }> {
  const rateCheck = await actionRateLimit("updateComment", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    const verified = requireVerifiedEmail(user);
    if (!verified.ok) return { error: verified.error };

    // Get comment to check ownership
    const { data: comment, error: commentError } = await supabase
      .from("discussion_comments")
      .select("author_id, thread_id")
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return { error: "Comment not found" };
    }

    if (comment.author_id !== user.id) {
      return { error: "You can only update your own comments" };
    }

    // Check if thread is locked - editing is not allowed on locked threads
    const { data: thread } = await supabase
      .from("discussion_threads")
      .select("is_locked, club_id")
      .eq("id", comment.thread_id)
      .single();

    if (thread?.is_locked) {
      return { error: "This thread is locked" };
    }

    const { error } = await supabase
      .from("discussion_comments")
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) {
      return { error: error.message };
    }

    if (thread?.club_id) invalidateDiscussion(comment.thread_id, thread.club_id);
    return { success: true };
  } catch (error) {
    return handleActionError(error, "updateComment");
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean } | { error: string }> {
  const rateCheck = await actionRateLimit("deleteComment", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    const verified = requireVerifiedEmail(user);
    if (!verified.ok) return { error: verified.error };

    // Get comment to check permissions
    const { data: comment, error: commentError } = await supabase
      .from("discussion_comments")
      .select("author_id, thread_id")
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return { error: "Comment not found" };
    }

    // Get thread to check admin status
    const { data: thread } = await supabase
      .from("discussion_threads")
      .select("club_id")
      .eq("id", comment.thread_id)
      .single();

    if (!thread) {
      return { error: "Thread not found" };
    }

    // Check permissions: author or admin can delete
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", thread.club_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You must be a member of this club" };
    }

    const isAdmin =
      membership.role === "admin" ||
      membership.role === "producer" ||
      membership.role === "director";
    const isAuthor = comment.author_id === user.id;

    if (!isAuthor && !isAdmin) {
      return { error: "You can only delete your own comments" };
    }

    const { error } = await supabase.from("discussion_comments").delete().eq("id", commentId);

    if (error) {
      return { error: error.message };
    }

    invalidateDiscussion(comment.thread_id, thread.club_id);
    return { success: true };
  } catch (error) {
    return handleActionError(error, "deleteComment");
  }
}
