"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateDiscussion } from "@/lib/cache/invalidate";
import { generateSlug, ensureUniqueSlug } from "./helpers";
import { generateMovieSlug } from "@/lib/movies/slugs";
import { handleActionError } from "@/lib/errors/handler";

/**
 * Create a discussion thread when a standard festival is started by an admin
 * This is called once when the festival is first created, not on phase changes
 * Endless festivals do NOT get discussion threads created this way
 */
export async function createFestivalDiscussionOnStart(
  clubId: string,
  festivalId: string,
  festivalTheme: string,
  authorId: string
): Promise<{ success: boolean; threadId?: string } | { error: string }> {
  try {
    const supabase = await createClient();

    // Check if thread already exists for this festival
    const { data: existingThread } = await supabase
      .from("discussion_threads")
      .select("id")
      .eq("club_id", clubId)
      .eq("festival_id", festivalId)
      .eq("auto_created", true)
      .maybeSingle();

    if (existingThread) {
      return { success: true, threadId: existingThread.id };
    }

    // Create the thread
    const title = festivalTheme;
    const content = `Discuss the **${festivalTheme}** festival.`;

    // Generate slug from title
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(supabase, clubId, baseSlug);

    const { data: thread, error } = await supabase
      .from("discussion_threads")
      .insert({
        club_id: clubId,
        slug,
        title,
        content,
        author_id: authorId,
        thread_type: "festival",
        festival_id: festivalId,
        is_pinned: true, // Pin the festival thread
        is_spoiler: false, // Not a spoiler thread initially
        auto_created: true,
        unlock_on_watch: false,
      })
      .select()
      .single();

    if (error) {
      return handleActionError(error, "createFestivalDiscussionOnStart");
    }

    // Create tag in discussion_thread_tags for the new tagging system
    if (thread) {
      const { error: tagError } = await supabase.from("discussion_thread_tags").insert({
        thread_id: thread.id,
        tag_type: "festival",
        festival_id: festivalId,
      });
      if (tagError && tagError.code !== "23505") {
        // Log but don't fail - legacy tmdb_id column still works
        console.error("Error creating festival tag:", tagError);
      }
    }

    invalidateDiscussion(thread.id, clubId);
    return { success: true, threadId: thread.id };
  } catch (error) {
    return handleActionError(error, "createFestivalDiscussionOnStart");
  }
}

/**
 * Update the festival discussion thread to include links to movie threads
 * Called after movie threads are created when entering watch_rate phase
 */
export async function updateFestivalThreadWithMovieLinks(
  clubId: string,
  festivalId: string,
  movies: Array<{ title: string; tmdbId: number }>
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get the festival thread
    const { data: festivalThread } = await supabase
      .from("discussion_threads")
      .select("id, content")
      .eq("club_id", clubId)
      .eq("festival_id", festivalId)
      .eq("auto_created", true)
      .eq("thread_type", "festival")
      .maybeSingle();

    if (!festivalThread) {
      return { error: "Festival thread not found" };
    }

    // Get the movie discussion threads
    const tmdbIds = movies.map((m) => m.tmdbId);
    const { data: movieThreads } = await supabase
      .from("discussion_threads")
      .select("id, slug, tmdb_id, title")
      .eq("club_id", clubId)
      .eq("thread_type", "movie")
      .in("tmdb_id", tmdbIds);

    // Build the movie links section
    const movieLinks = movies
      .map((movie) => {
        const thread = movieThreads?.find((t) => t.tmdb_id === movie.tmdbId);
        if (thread) {
          // Use slug for SEO-friendly URLs, fall back to ID
          return `- **${movie.title}** - [Discuss →](../discuss/${thread.slug || thread.id})`;
        }
        return `- **${movie.title}** - Thread pending`;
      })
      .join("\n");

    // Update the content to include movie links
    const updatedContent = festivalThread.content.replace(
      "*Links will appear here once movies are ready for discussion.*",
      movieLinks || "*No movies in this festival.*"
    );

    const { error } = await supabase
      .from("discussion_threads")
      .update({ content: updatedContent })
      .eq("id", festivalThread.id);

    if (error) {
      return handleActionError(error, "updateFestivalThreadWithMovieLinks");
    }

    invalidateDiscussion(festivalThread.id, clubId);
    return { success: true };
  } catch (error) {
    return handleActionError(error, "updateFestivalThreadWithMovieLinks");
  }
}

/**
 * Automatically create a discussion thread for a nominated movie
 * Called when festival enters watch_rate phase (when movies become visible)
 */
export async function autoCreateMovieThread(
  clubId: string,
  festivalId: string,
  tmdbId: number,
  movieTitle: string,
  nominatorId: string,
  nominatorName: string,
  movieYear: number | null = null
): Promise<
  { success: boolean; threadId?: string; threadSlug?: string | null } | { error: string }
> {
  try {
    const supabase = await createClient();

    // Check if thread already exists for this movie in this club
    const { data: existingThread } = await supabase
      .from("discussion_threads")
      .select("id, slug")
      .eq("club_id", clubId)
      .eq("tmdb_id", tmdbId)
      .eq("auto_created", true)
      .maybeSingle();

    if (existingThread) {
      return { success: true, threadId: existingThread.id, threadSlug: existingThread.slug };
    }

    // Create the thread
    const title = movieYear ? `${movieTitle} (${movieYear})` : movieTitle;
    const content = `Nominated by ${nominatorName}.`;

    // Generate slug matching movie page URL format
    const baseSlug = generateMovieSlug(movieTitle, movieYear);
    const slug = await ensureUniqueSlug(supabase, clubId, baseSlug);

    const { data: thread, error } = await supabase
      .from("discussion_threads")
      .insert({
        club_id: clubId,
        slug,
        title,
        content,
        author_id: nominatorId,
        thread_type: "movie",
        tmdb_id: tmdbId,
        festival_id: festivalId,
        is_spoiler: false,
        auto_created: true,
        unlock_on_watch: false,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (race condition - another request created the thread)
      // PostgreSQL error code 23505 = unique_violation
      if (error.code === "23505") {
        // Thread was just created by another concurrent request, fetch it
        const { data: raceThread } = await supabase
          .from("discussion_threads")
          .select("id, slug")
          .eq("club_id", clubId)
          .eq("tmdb_id", tmdbId)
          .eq("auto_created", true)
          .maybeSingle();

        if (raceThread) {
          // Ensure tags exist even for race condition case
          await ensureMovieThreadTags(supabase, raceThread.id, tmdbId, festivalId);
          return { success: true, threadId: raceThread.id, threadSlug: raceThread.slug };
        }
      }
      return handleActionError(error, "autoCreateMovieThread");
    }

    // Create tags in discussion_thread_tags for the new tagging system
    if (thread) {
      await ensureMovieThreadTags(supabase, thread.id, tmdbId, festivalId);
    }

    invalidateDiscussion(thread.id, clubId);
    return { success: true, threadId: thread.id, threadSlug: thread.slug };
  } catch (error) {
    return handleActionError(error, "autoCreateMovieThread");
  }
}

/**
 * Create a discussion thread for a movie that's now playing/showing
 * Used by Endless clubs and BackRow Featured when a movie becomes active
 */
export async function createPlayingMovieThread(params: {
  clubId: string;
  festivalId?: string;
  tmdbId: number;
  movieTitle: string;
  movieYear?: number | null;
  authorId: string;
  pitch?: string | null;
  isPinned?: boolean;
}): Promise<{ threadId: string } | { existing: true } | { error: string }> {
  try {
    const supabase = await createClient();

    // Check if thread already exists for this movie in this club
    const { data: existingThread } = await supabase
      .from("discussion_threads")
      .select("id")
      .eq("club_id", params.clubId)
      .eq("tmdb_id", params.tmdbId)
      .maybeSingle();

    if (existingThread) {
      return { existing: true };
    }

    // Build content with optional pitch
    const content = params.pitch ? `> ${params.pitch}` : `Now showing.`;

    // Generate slug matching movie page URL format
    const movieYear = params.movieYear ?? null;
    const baseSlug = generateMovieSlug(params.movieTitle, movieYear);
    const slug = await ensureUniqueSlug(supabase, params.clubId, baseSlug);

    const title = movieYear ? `${params.movieTitle} (${movieYear})` : params.movieTitle;

    const { data: thread, error } = await supabase
      .from("discussion_threads")
      .insert({
        club_id: params.clubId,
        slug,
        title,
        content,
        author_id: params.authorId,
        thread_type: "movie",
        tmdb_id: params.tmdbId,
        festival_id: params.festivalId || null,
        is_spoiler: true,
        is_pinned: params.isPinned || false,
        auto_created: true,
      })
      .select("id")
      .single();

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === "23505") {
        return { existing: true };
      }
      return handleActionError(error, "createPlayingMovieThread");
    }

    // Create tags in discussion_thread_tags for the new tagging system
    if (thread) {
      await ensureMovieThreadTags(supabase, thread.id, params.tmdbId, params.festivalId || null);
    }

    invalidateDiscussion(thread.id, params.clubId);
    return { threadId: thread.id };
  } catch (error) {
    return handleActionError(error, "createPlayingMovieThread");
  }
}

/**
 * Helper function to ensure movie thread tags exist in discussion_thread_tags
 * Creates both movie tag and festival tag (if festivalId provided)
 * Silently handles duplicate key errors (already exists)
 */
async function ensureMovieThreadTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string,
  tmdbId: number,
  festivalId: string | null
): Promise<void> {
  // Create movie tag
  const { error: movieTagError } = await supabase.from("discussion_thread_tags").insert({
    thread_id: threadId,
    tag_type: "movie",
    tmdb_id: tmdbId,
  });
  if (movieTagError && movieTagError.code !== "23505") {
    // Log but don't fail - legacy tmdb_id column still works
    console.error("Error creating movie tag:", movieTagError);
  }

  // Create festival tag if festivalId provided
  if (festivalId) {
    const { error: festivalTagError } = await supabase.from("discussion_thread_tags").insert({
      thread_id: threadId,
      tag_type: "festival",
      festival_id: festivalId,
    });
    if (festivalTagError && festivalTagError.code !== "23505") {
      console.error("Error creating festival tag:", festivalTagError);
    }
  }
}
