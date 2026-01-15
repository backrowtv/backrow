"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get or create the single endless festival for a club.
 * Endless festivals are season-independent — no season_id required.
 */
export async function getOrCreateEndlessFestival(clubId: string, userId: string) {
  const supabase = await createClient();

  // Check for ANY existing endless festival (not just active ones)
  // A previous endless festival may have been completed/cancelled — reactivate it
  // instead of creating a new one (which would fail on slug uniqueness constraint)
  const { data: existingFestival } = await supabase
    .from("festivals")
    .select("id, status")
    .eq("club_id", clubId)
    .eq("theme", "Endless Festival")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingFestival) {
    if (existingFestival.status === "watching") {
      return existingFestival.id;
    }

    // Reactivate a completed/cancelled endless festival
    const { error } = await supabase
      .from("festivals")
      .update({ status: "watching", phase: "watch_rate" })
      .eq("id", existingFestival.id);

    if (!error) {
      return existingFestival.id;
    }

    console.error("Failed to reactivate endless festival:", {
      error,
      festivalId: existingFestival.id,
    });
  }

  return createEndlessFestival(clubId, userId);
}

async function createEndlessFestival(
  clubId: string,
  _userId: string
): Promise<string | { error: string }> {
  const supabase = await createClient();

  const { data: newFestival, error } = await supabase
    .from("festivals")
    .insert({
      club_id: clubId,
      season_id: null,
      theme: "Endless Festival",
      status: "watching",
      phase: "watch_rate",
      member_count_at_creation: 1,
      start_date: new Date().toISOString(),
      auto_advance: false,
      slug: `endless-${clubId.slice(0, 8)}-${Date.now()}`,
    })
    .select("id")
    .single();

  if (error || !newFestival) {
    console.error("Failed to create endless festival:", {
      error,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      clubId,
    });
    return { error: `Failed to create endless festival: ${error?.message || "Unknown error"}` };
  }

  return newFestival.id;
}

/**
 * Complete an endless festival by marking all playing movies as completed
 * and setting the festival status to completed.
 */
export async function completeEndlessFestival(festivalId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Batch-complete all playing nominations
  const { error: nomError } = await supabase
    .from("nominations")
    .update({
      endless_status: "completed",
      display_slot: null,
      completed_at: new Date().toISOString(),
    })
    .eq("festival_id", festivalId)
    .eq("endless_status", "playing");

  if (nomError) return { error: nomError.message };

  // Mark the festival itself as completed
  const { error: festError } = await supabase
    .from("festivals")
    .update({ status: "completed" })
    .eq("id", festivalId);

  if (festError) return { error: festError.message };

  return {};
}
