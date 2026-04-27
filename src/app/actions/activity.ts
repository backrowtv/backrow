"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateUser } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

/**
 * Hide an activity item from the user's feed (visual only, undoable).
 * The activity remains in activity_log — this just records the user's preference.
 */
export async function hideActivity(
  activityId: string
): Promise<{ success: boolean } | { error: string }> {
  const rateCheck = await actionRateLimit("hideActivity", { limit: 30, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

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

  invalidateUser(user.id);
  return { success: true };
}

/**
 * Hide a movie from the recently watched carousel (visual only).
 * The movie remains watched in watch_history — this only affects the carousel display.
 */
export async function hideFromWatchHistory(
  tmdbId: number
): Promise<{ success: boolean } | { error: string }> {
  const rateCheck = await actionRateLimit("hideFromWatchHistory", { limit: 30, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

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

  invalidateUser(user.id);
  return { success: true };
}
