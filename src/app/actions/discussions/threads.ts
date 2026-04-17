"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateDiscussion } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import { createNotification } from "../notifications";
import { cacheMovie } from "../movies";
import { cachePerson } from "../persons";
import type {
  DiscussionThread,
  DiscussionThreadTag,
  DiscussionTagType,
  SpoilerState,
} from "./types";
import { generateSlug, ensureUniqueSlug } from "./helpers";
import { getSpoilerStatesForThreads } from "./spoiler-utils";
import { parseCreateThreadFormData } from "@/lib/validation/server-actions";
import { actionRateLimit } from "@/lib/security/action-rate-limit";

/**
 * Get all threads for a club (cached for 5 minutes)
 */
export async function getThreadsByClub(
  clubId: string,
  options?: {
    threadType?: DiscussionThread["thread_type"];
    tagType?: DiscussionTagType; // New: filter by tag type
    sortBy?: "new" | "old" | "top";
    limit?: number;
    offset?: number;
  }
): Promise<{ data: DiscussionThread[]; total: number } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Check user is member of club
    const { data: membership } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You must be a member of this club" };
    }

    // If filtering by tag type, get thread IDs first
    let threadIds: string[] | null = null;
    if (options?.tagType) {
      const { data: taggedThreads } = await supabase
        .from("discussion_thread_tags")
        .select("thread_id")
        .eq("tag_type", options.tagType);

      if (taggedThreads) {
        threadIds = taggedThreads.map((t) => t.thread_id);
      }
    }

    let query = supabase
      .from("discussion_threads")
      .select(
        `
        *,
        author:author_id(id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index),
        movie:tmdb_id(tmdb_id, title, poster_url, year, slug),
        person:person_tmdb_id(tmdb_id, name, profile_url, slug, known_for_department),
        festival:festival_id(id, theme),
        tags:discussion_thread_tags(
          *,
          movie:tmdb_id(tmdb_id, title, poster_url, year, slug),
          person:person_tmdb_id(tmdb_id, name, profile_url, slug, known_for_department),
          festival:festival_id(id, theme, slug)
        )
      `,
        { count: "exact" }
      )
      .eq("club_id", clubId);

    // Filter by tag type (using thread IDs from tags table)
    if (threadIds !== null) {
      if (threadIds.length === 0) {
        // No threads match the tag filter
        return { data: [], total: 0 };
      }
      query = query.in("id", threadIds);
    }

    // Legacy: Filter by thread type (for backward compatibility)
    if (options?.threadType) {
      query = query.eq("thread_type", options.threadType);
    }

    // Sort
    if (options?.sortBy === "top") {
      query = query.order("upvotes", { ascending: false });
    } else if (options?.sortBy === "old") {
      query = query.order("created_at", { ascending: true });
    } else {
      // Default: pinned first, then by most recent activity
      query = query
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
    }

    // Pagination
    if (options?.offset !== undefined && options?.limit) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: threads, error, count } = await query;

    if (error) {
      return { error: error.message };
    }

    // Tags are now included via join in the main query
    // Cast to ensure proper typing (tags come from the join)
    const typedThreads = (threads || []).map((thread) => ({
      ...thread,
      tags: (thread.tags || []) as DiscussionThreadTag[],
    })) as DiscussionThread[];

    return { data: typedThreads, total: count ?? typedThreads.length };
  } catch (error) {
    return handleActionError(error, "getThreadsByClub");
  }
}

/**
 * Get threads with spoiler states for a club (for client components)
 * This is a server action that can be called from client components
 */
export async function getThreadsWithSpoilerStates(
  clubId: string,
  options?: {
    tagType?: DiscussionTagType;
    sortBy?: "new" | "old" | "top";
    limit?: number;
    offset?: number;
  }
): Promise<
  | { data: DiscussionThread[]; spoilerStates: Record<string, SpoilerState>; total: number }
  | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Fetch threads using existing function
    const threadsResult = await getThreadsByClub(clubId, options);

    if ("error" in threadsResult) {
      return threadsResult;
    }

    const threads = threadsResult.data;

    // Fetch spoiler states
    const spoilerStates = await getSpoilerStatesForThreads(threads, user.id);

    return { data: threads, spoilerStates, total: threadsResult.total };
  } catch (error) {
    return handleActionError(error, "getThreadsWithSpoilerStates");
  }
}

/**
 * Get a single thread by ID
 */
export async function getThreadById(
  threadId: string
): Promise<{ data: DiscussionThread } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    const { data: thread, error } = await supabase
      .from("discussion_threads")
      .select(
        `
        *,
        author:author_id(id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index),
        movie:tmdb_id(tmdb_id, title, poster_url, year, slug),
        person:person_tmdb_id(tmdb_id, name, profile_url, slug, known_for_department),
        festival:festival_id(id, theme)
      `
      )
      .eq("id", threadId)
      .single();

    if (error || !thread) {
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

    // Fetch tags for this thread
    const { data: tags } = await supabase
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

    const threadWithTags = {
      ...thread,
      tags: (tags || []) as DiscussionThreadTag[],
    } as DiscussionThread;

    return { data: threadWithTags };
  } catch (error) {
    return handleActionError(error, "getThreadById");
  }
}

/**
 * Create a new discussion thread
 */
export async function createThread(
  prevState: unknown,
  formData: FormData
): Promise<
  { success: boolean; threadId?: string; threadSlug?: string | null } | { error: string }
> {
  const rateCheck = await actionRateLimit("createThread", { limit: 5, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Validate input with Zod
    const parseResult = parseCreateThreadFormData(formData);
    if (!parseResult.success) {
      return { error: parseResult.error };
    }

    const {
      clubId,
      title,
      content,
      isSpoiler,
      tags = [],
      threadType,
      tmdbId,
      personName,
      personType,
      personTmdbId,
      festivalId,
    } = parseResult.data;

    // Check blacklist for title and content
    const { validateBlacklist } = await import("@/lib/clubs/blacklist");
    const titleBlacklistError = await validateBlacklist(clubId, title);
    if (titleBlacklistError) {
      return { error: titleBlacklistError };
    }
    const contentBlacklistError = await validateBlacklist(clubId, content);
    if (contentBlacklistError) {
      return { error: contentBlacklistError };
    }

    // Check user is member of club
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You must be a member of this club" };
    }

    // Cache movies and persons from tags
    for (const tag of tags) {
      if (tag.tag_type === "movie" && tag.tmdb_id) {
        const cacheResult = await cacheMovie(tag.tmdb_id);
        if ("error" in cacheResult) {
          return { error: `Failed to fetch movie data: ${cacheResult.error}` };
        }
      }
      if (["actor", "director", "composer"].includes(tag.tag_type) && tag.person_tmdb_id) {
        const cacheResult = await cachePerson(tag.person_tmdb_id);
        if ("error" in cacheResult) {
          return { error: `Failed to fetch person data: ${cacheResult.error}` };
        }
      }
    }

    // Legacy: Cache movie/person for backward compatibility
    if (threadType === "movie" && tmdbId) {
      const cacheResult = await cacheMovie(tmdbId);
      if ("error" in cacheResult) {
        return { error: `Failed to fetch movie data: ${cacheResult.error}` };
      }
    }
    if (threadType === "person" && personTmdbId) {
      const cacheResult = await cachePerson(personTmdbId);
      if ("error" in cacheResult) {
        return { error: `Failed to fetch person data: ${cacheResult.error}` };
      }
    }

    // Determine thread_type based on tags (for display purposes)
    // If multiple tags or no tags, use 'custom'
    let derivedThreadType: DiscussionThread["thread_type"] = "custom";
    if (tags.length === 1) {
      const singleTag = tags[0];
      if (singleTag.tag_type === "movie") derivedThreadType = "movie";
      else if (singleTag.tag_type === "festival") derivedThreadType = "festival";
      else if (["actor", "director", "composer"].includes(singleTag.tag_type))
        derivedThreadType = "person";
    } else if (threadType) {
      // Use legacy threadType if provided
      derivedThreadType = threadType;
    }

    // Generate slug from title
    const baseSlug = generateSlug(title.trim());
    const slug = await ensureUniqueSlug(supabase, clubId, baseSlug);

    const { data: thread, error } = await supabase
      .from("discussion_threads")
      .insert({
        club_id: clubId,
        slug,
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        thread_type: derivedThreadType,
        // Legacy fields (for backward compatibility)
        tmdb_id: tmdbId,
        person_name: personName,
        person_type: personType,
        person_tmdb_id: personTmdbId,
        festival_id: festivalId,
        is_spoiler: isSpoiler,
        auto_created: false,
      })
      .select("id, slug")
      .single();

    if (error) {
      return { error: error.message };
    }

    // Insert tags into discussion_thread_tags table
    if (tags.length > 0) {
      const tagInserts = tags.map((tag) => ({
        thread_id: thread.id,
        tag_type: tag.tag_type,
        tmdb_id: tag.tag_type === "movie" ? tag.tmdb_id : null,
        person_tmdb_id: ["actor", "director", "composer"].includes(tag.tag_type)
          ? tag.person_tmdb_id
          : null,
        festival_id: tag.tag_type === "festival" ? tag.festival_id : null,
      }));

      const { error: tagError } = await supabase.from("discussion_thread_tags").insert(tagInserts);

      if (tagError) {
        console.error("Error inserting tags:", tagError);
        // Don't fail the entire operation, thread was created
      }
    }

    // Send notification to club members (except author)
    const { data: members } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .neq("user_id", user.id);

    if (members) {
      for (const member of members) {
        await createNotification({
          userId: member.user_id,
          type: "discussion_thread_created",
          title: "New Discussion Thread",
          message: `${user.user_metadata?.display_name || "Someone"} started a new discussion: ${title}`,
          link: `/club/${clubId}/discuss/${thread.slug || thread.id}`,
          clubId: clubId,
        });
      }
    }

    invalidateDiscussion(thread.id, clubId);
    return { success: true, threadId: thread.id, threadSlug: thread.slug };
  } catch (error) {
    return handleActionError(error, "createThread");
  }
}

/**
 * Update a discussion thread
 */
export async function updateThread(
  threadId: string,
  updates: {
    title?: string;
    content?: string;
    is_pinned?: boolean;
    is_locked?: boolean;
    is_spoiler?: boolean;
  }
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Get thread to check permissions
    const { data: thread, error: threadError } = await supabase
      .from("discussion_threads")
      .select("club_id, author_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return { error: "Thread not found" };
    }

    // Check permissions: author can update content, admin can update moderation fields
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

    // Only admins can pin/lock
    if ((updates.is_pinned !== undefined || updates.is_locked !== undefined) && !isAdmin) {
      return { error: "Only admins can pin or lock threads" };
    }

    // Author can update content, admin can update anything
    if (!isAuthor && !isAdmin) {
      return { error: "You can only update your own threads" };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.content !== undefined) updateData.content = updates.content.trim();
    if (updates.is_pinned !== undefined) updateData.is_pinned = updates.is_pinned;
    if (updates.is_locked !== undefined) updateData.is_locked = updates.is_locked;
    if (updates.is_spoiler !== undefined) updateData.is_spoiler = updates.is_spoiler;

    const { error } = await supabase
      .from("discussion_threads")
      .update(updateData)
      .eq("id", threadId);

    if (error) {
      return { error: error.message };
    }

    invalidateDiscussion(threadId, thread.club_id);
    return { success: true };
  } catch (error) {
    return handleActionError(error, "updateThread");
  }
}

/**
 * Delete a discussion thread
 */
export async function deleteThread(
  threadId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Get thread to check permissions
    const { data: thread, error: threadError } = await supabase
      .from("discussion_threads")
      .select("club_id, author_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
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
    const isAuthor = thread.author_id === user.id;

    if (!isAuthor && !isAdmin) {
      return { error: "You can only delete your own threads" };
    }

    const { error } = await supabase.from("discussion_threads").delete().eq("id", threadId);

    if (error) {
      return { error: error.message };
    }

    invalidateDiscussion(threadId, thread.club_id);
    return { success: true };
  } catch (error) {
    return handleActionError(error, "deleteThread");
  }
}
