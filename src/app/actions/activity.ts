"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";

/**
 * Hide an activity item from the user's feed (visual only, undoable).
 * The activity remains in activity_log — this just records the user's preference.
 */
export async function hideActivity(
  activityId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("hidden_activities").insert({
    user_id: user.id,
    activity_id: activityId,
  });

  if (error) {
    // Duplicate is fine — already hidden
    if (error.code === "23505") {
      return { success: true };
    }
    return handleActionError(error, "hideActivity");
  }

  revalidatePath("/activity");
  return { success: true };
}

/**
 * Hide a movie from the recently watched carousel (visual only).
 * The movie remains watched in watch_history — this only affects the carousel display.
 */
export async function hideFromWatchHistory(
  tmdbId: number
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("hidden_watch_history").insert({
    user_id: user.id,
    tmdb_id: tmdbId,
  });

  if (error) {
    // Duplicate is fine — already hidden
    if (error.code === "23505") {
      return { success: true };
    }
    return handleActionError(error, "hideFromWatchHistory");
  }

  revalidatePath("/profile");
  return { success: true };
}
