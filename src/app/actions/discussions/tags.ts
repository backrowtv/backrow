"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateDiscussion } from "@/lib/cache/invalidate";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { cacheMovie } from "../movies";
import { cachePerson } from "../persons";
import type { DiscussionThreadTag, TagInput } from "./types";

/**
 * Add a tag to an existing thread
 */
export async function addTagToThread(
  threadId: string,
  tag: TagInput
): Promise<{ success: boolean; tagId?: string } | { error: string }> {
  const rateCheck = await actionRateLimit("addTagToThread", { limit: 30, windowMs: 60_000 });
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

    // Get thread to check permissions
    const { data: thread, error: threadError } = await supabase
      .from("discussion_threads")
      .select("club_id, author_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return { error: "Thread not found" };
    }

    // Check user is member of club and is author or admin
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
    const isAuthor = thread.author_id === user.id;

    if (!isAuthor && !isAdmin) {
      return { error: "Only the thread author or admins can add tags" };
    }

    // Cache movie/person if needed
    if (tag.tag_type === "movie" && tag.tmdb_id) {
      const cacheResult = await cacheMovie(tag.tmdb_id);
      if ("error" in cacheResult) {
        return { error: `Failed to fetch movie data: ${cacheResult.error}` };
      }
    }
    if (tag.tag_type === "person" && tag.person_tmdb_id) {
      const cacheResult = await cachePerson(tag.person_tmdb_id);
      if ("error" in cacheResult) {
        return { error: `Failed to fetch person data: ${cacheResult.error}` };
      }
    }

    // Insert the tag
    const { data: newTag, error } = await supabase
      .from("discussion_thread_tags")
      .insert({
        thread_id: threadId,
        tag_type: tag.tag_type,
        tmdb_id: tag.tag_type === "movie" ? tag.tmdb_id : null,
        person_tmdb_id: tag.tag_type === "person" ? tag.person_tmdb_id : null,
        festival_id: tag.tag_type === "festival" ? tag.festival_id : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "This tag already exists on this thread" };
      }
      return { error: error.message };
    }

    invalidateDiscussion(threadId, thread.club_id);
    return { success: true, tagId: newTag.id };
  } catch (error) {
    console.error("Error in addTagToThread:", error);
    return { error: "Failed to add tag" };
  }
}

/**
 * Remove a tag from a thread
 */
export async function removeTagFromThread(
  tagId: string
): Promise<{ success: boolean } | { error: string }> {
  const rateCheck = await actionRateLimit("removeTagFromThread", { limit: 30, windowMs: 60_000 });
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

    // Get tag to find the thread
    const { data: tag, error: tagError } = await supabase
      .from("discussion_thread_tags")
      .select("thread_id")
      .eq("id", tagId)
      .single();

    if (tagError || !tag) {
      return { error: "Tag not found" };
    }

    // Get thread to check permissions
    const { data: thread, error: threadError } = await supabase
      .from("discussion_threads")
      .select("club_id, author_id")
      .eq("id", tag.thread_id)
      .single();

    if (threadError || !thread) {
      return { error: "Thread not found" };
    }

    // Check user is member of club and is author or admin
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
    const isAuthor = thread.author_id === user.id;

    if (!isAuthor && !isAdmin) {
      return { error: "Only the thread author or admins can remove tags" };
    }

    // Delete the tag
    const { error } = await supabase.from("discussion_thread_tags").delete().eq("id", tagId);

    if (error) {
      return { error: error.message };
    }

    invalidateDiscussion(tag.thread_id, thread.club_id);
    return { success: true };
  } catch (error) {
    console.error("Error in removeTagFromThread:", error);
    return { error: "Failed to remove tag" };
  }
}

/**
 * Get tags for a thread
 */
export async function getThreadTags(
  threadId: string
): Promise<{ data: DiscussionThreadTag[] } | { error: string }> {
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

    const { data: tags, error } = await supabase
      .from("discussion_thread_tags")
      .select(
        `
        *,
        movie:tmdb_id(tmdb_id, title, poster_url, year, slug),
        person:person_tmdb_id(tmdb_id, name, profile_url, slug, known_for_department),
        festival:festival_id(id, theme, slug)
      `
      )
      .eq("thread_id", threadId);

    if (error) {
      return { error: error.message };
    }

    return { data: (tags || []) as DiscussionThreadTag[] };
  } catch (error) {
    console.error("Error in getThreadTags:", error);
    return { error: "Failed to fetch tags" };
  }
}
