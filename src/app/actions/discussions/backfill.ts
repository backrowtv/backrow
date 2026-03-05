"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createFestivalDiscussionOnStart,
  autoCreateMovieThread,
  updateFestivalThreadWithMovieLinks,
} from "./auto";

/**
 * Backfill missing discussion threads for a specific festival
 * Creates festival thread and movie threads if they don't exist
 * Also ensures tags exist in discussion_thread_tags
 */
export async function backfillFestivalDiscussions(festivalId: string): Promise<{
  success: boolean;
  festivalThreadCreated: boolean;
  movieThreadsCreated: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const errors: string[] = [];
  let festivalThreadCreated = false;
  let movieThreadsCreated = 0;

  // Get festival details
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, theme, club_id, status, created_by")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return {
      success: false,
      festivalThreadCreated: false,
      movieThreadsCreated: 0,
      errors: [`Festival not found: ${festivalError?.message || "Unknown error"}`],
    };
  }

  // Check if festival has progressed past nominating (needs discussion threads)
  const phasesWithDiscussions = ["voting", "watch_rate", "results", "completed"];
  if (!phasesWithDiscussions.includes(festival.status)) {
    return {
      success: true,
      festivalThreadCreated: false,
      movieThreadsCreated: 0,
      errors: [`Festival is in ${festival.status} phase - no discussions needed yet`],
    };
  }

  // 1. Create or verify festival thread exists
  const { data: existingFestivalThread } = await supabase
    .from("discussion_threads")
    .select("id")
    .eq("club_id", festival.club_id)
    .eq("festival_id", festivalId)
    .eq("thread_type", "festival")
    .eq("auto_created", true)
    .maybeSingle();

  if (!existingFestivalThread) {
    const result = await createFestivalDiscussionOnStart(
      festival.club_id,
      festivalId,
      festival.theme || "Festival",
      festival.created_by
    );
    if ("error" in result) {
      errors.push(`Failed to create festival thread: ${result.error}`);
    } else {
      festivalThreadCreated = true;
    }
  } else {
    // Ensure tag exists for existing thread
    await ensureFestivalTag(supabase, existingFestivalThread.id, festivalId);
  }

  // 2. Create movie threads for all nominations (only if in watch_rate or later)
  const moviePhases = ["watch_rate", "results", "completed"];
  if (moviePhases.includes(festival.status)) {
    const { data: nominations, error: nomError } = await supabase
      .from("nominations")
      .select(
        `
        id,
        tmdb_id,
        user_id,
        movies:tmdb_id (title, year),
        users:user_id (display_name)
      `
      )
      .eq("festival_id", festivalId)
      .is("deleted_at", null);

    if (nomError) {
      errors.push(`Failed to fetch nominations: ${nomError.message}`);
    } else if (nominations && nominations.length > 0) {
      const movieThreads: Array<{ title: string; tmdbId: number }> = [];

      for (const nomination of nominations) {
        // Handle the Supabase foreign key response type
        const movie = Array.isArray(nomination.movies) ? nomination.movies[0] : nomination.movies;
        const user = Array.isArray(nomination.users) ? nomination.users[0] : nomination.users;

        const movieTitle = movie?.title || "Movie";
        const movieYear = movie?.year ?? null;
        const nominatorName = user?.display_name || "Unknown";

        // Check if thread already exists
        const { data: existingMovieThread } = await supabase
          .from("discussion_threads")
          .select("id")
          .eq("club_id", festival.club_id)
          .eq("tmdb_id", nomination.tmdb_id)
          .eq("auto_created", true)
          .maybeSingle();

        if (!existingMovieThread) {
          const result = await autoCreateMovieThread(
            festival.club_id,
            festivalId,
            nomination.tmdb_id,
            movieTitle,
            nomination.user_id,
            nominatorName,
            movieYear
          );
          if ("error" in result) {
            errors.push(`Failed to create thread for ${movieTitle}: ${result.error}`);
          } else {
            movieThreadsCreated++;
            movieThreads.push({ title: movieTitle, tmdbId: nomination.tmdb_id });
          }
        } else {
          // Thread exists - ensure tags exist
          await ensureMovieTag(supabase, existingMovieThread.id, nomination.tmdb_id, festivalId);
          movieThreads.push({ title: movieTitle, tmdbId: nomination.tmdb_id });
        }
      }

      // Update festival thread with movie links
      if (movieThreads.length > 0) {
        await updateFestivalThreadWithMovieLinks(festival.club_id, festivalId, movieThreads);
      }
    }
  }

  return {
    success: errors.length === 0,
    festivalThreadCreated,
    movieThreadsCreated,
    errors,
  };
}

/**
 * Backfill discussion threads for ALL festivals missing them
 * Returns a summary of what was created
 */
export async function backfillAllMissingDiscussions(): Promise<{
  festivalsProcessed: number;
  festivalThreadsCreated: number;
  movieThreadsCreated: number;
  errors: string[];
}> {
  const supabase = await createClient();

  // Find all festivals that should have discussions but don't
  const { data: festivalsNeedingBackfill, error } = await supabase
    .from("festivals")
    .select("id, theme, status")
    .in("status", ["voting", "watch_rate", "results", "completed"])
    .order("created_at", { ascending: false });

  if (error || !festivalsNeedingBackfill) {
    return {
      festivalsProcessed: 0,
      festivalThreadsCreated: 0,
      movieThreadsCreated: 0,
      errors: [`Failed to fetch festivals: ${error?.message || "Unknown error"}`],
    };
  }

  let festivalsProcessed = 0;
  let totalFestivalThreadsCreated = 0;
  let totalMovieThreadsCreated = 0;
  const allErrors: string[] = [];

  for (const festival of festivalsNeedingBackfill) {
    const result = await backfillFestivalDiscussions(festival.id);
    festivalsProcessed++;
    totalFestivalThreadsCreated += result.festivalThreadCreated ? 1 : 0;
    totalMovieThreadsCreated += result.movieThreadsCreated;
    allErrors.push(...result.errors.map((e) => `[${festival.theme}] ${e}`));
  }

  return {
    festivalsProcessed,
    festivalThreadsCreated: totalFestivalThreadsCreated,
    movieThreadsCreated: totalMovieThreadsCreated,
    errors: allErrors,
  };
}

/**
 * Backfill tags for existing threads that are missing them
 * Useful for threads created before the tagging system was added
 */
export async function backfillMissingTags(): Promise<{
  tagsCreated: number;
  errors: string[];
}> {
  const supabase = await createClient();
  let tagsCreated = 0;
  const errors: string[] = [];

  // Find threads with tmdb_id but no movie tag
  const { data: movieThreadsMissingTags } = await supabase
    .from("discussion_threads")
    .select("id, tmdb_id, festival_id")
    .not("tmdb_id", "is", null)
    .eq("thread_type", "movie");

  if (movieThreadsMissingTags) {
    for (const thread of movieThreadsMissingTags) {
      // Check if tag exists
      const { data: existingTag } = await supabase
        .from("discussion_thread_tags")
        .select("id")
        .eq("thread_id", thread.id)
        .eq("tag_type", "movie")
        .maybeSingle();

      if (!existingTag && thread.tmdb_id) {
        const { error } = await supabase.from("discussion_thread_tags").insert({
          thread_id: thread.id,
          tag_type: "movie",
          tmdb_id: thread.tmdb_id,
        });
        if (error && error.code !== "23505") {
          errors.push(`Failed to create movie tag for thread ${thread.id}: ${error.message}`);
        } else if (!error) {
          tagsCreated++;
        }
      }

      // Also create festival tag if thread has festival_id
      if (thread.festival_id) {
        const { data: existingFestivalTag } = await supabase
          .from("discussion_thread_tags")
          .select("id")
          .eq("thread_id", thread.id)
          .eq("tag_type", "festival")
          .maybeSingle();

        if (!existingFestivalTag) {
          const { error } = await supabase.from("discussion_thread_tags").insert({
            thread_id: thread.id,
            tag_type: "festival",
            festival_id: thread.festival_id,
          });
          if (error && error.code !== "23505") {
            errors.push(`Failed to create festival tag for thread ${thread.id}: ${error.message}`);
          } else if (!error) {
            tagsCreated++;
          }
        }
      }
    }
  }

  // Find festival threads missing tags
  const { data: festivalThreadsMissingTags } = await supabase
    .from("discussion_threads")
    .select("id, festival_id")
    .not("festival_id", "is", null)
    .eq("thread_type", "festival");

  if (festivalThreadsMissingTags) {
    for (const thread of festivalThreadsMissingTags) {
      const { data: existingTag } = await supabase
        .from("discussion_thread_tags")
        .select("id")
        .eq("thread_id", thread.id)
        .eq("tag_type", "festival")
        .maybeSingle();

      if (!existingTag && thread.festival_id) {
        const { error } = await supabase.from("discussion_thread_tags").insert({
          thread_id: thread.id,
          tag_type: "festival",
          festival_id: thread.festival_id,
        });
        if (error && error.code !== "23505") {
          errors.push(`Failed to create festival tag for thread ${thread.id}: ${error.message}`);
        } else if (!error) {
          tagsCreated++;
        }
      }
    }
  }

  return { tagsCreated, errors };
}

// Helper functions
async function ensureFestivalTag(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string,
  festivalId: string
): Promise<void> {
  const { data: existingTag } = await supabase
    .from("discussion_thread_tags")
    .select("id")
    .eq("thread_id", threadId)
    .eq("tag_type", "festival")
    .maybeSingle();

  if (!existingTag) {
    await supabase.from("discussion_thread_tags").insert({
      thread_id: threadId,
      tag_type: "festival",
      festival_id: festivalId,
    });
  }
}

async function ensureMovieTag(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string,
  tmdbId: number,
  festivalId: string
): Promise<void> {
  // Ensure movie tag
  const { data: existingMovieTag } = await supabase
    .from("discussion_thread_tags")
    .select("id")
    .eq("thread_id", threadId)
    .eq("tag_type", "movie")
    .maybeSingle();

  if (!existingMovieTag) {
    await supabase.from("discussion_thread_tags").insert({
      thread_id: threadId,
      tag_type: "movie",
      tmdb_id: tmdbId,
    });
  }

  // Ensure festival tag
  const { data: existingFestivalTag } = await supabase
    .from("discussion_thread_tags")
    .select("id")
    .eq("thread_id", threadId)
    .eq("tag_type", "festival")
    .maybeSingle();

  if (!existingFestivalTag) {
    await supabase.from("discussion_thread_tags").insert({
      thread_id: threadId,
      tag_type: "festival",
      festival_id: festivalId,
    });
  }
}
