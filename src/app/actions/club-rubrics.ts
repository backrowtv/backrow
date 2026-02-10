"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UpdateClubRubricPreferenceResult } from "./club-rubrics.types";

/**
 * Update the user's default rubric preference for a specific club
 */
export async function updateClubRubricPreference(
  clubId: string,
  rubricId: string | null
): Promise<UpdateClubRubricPreferenceResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Verify user is a member of the club
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: "You must be a member of this club" };
  }

  // Get current preferences or initialize empty object
  const currentPreferences = (membership.preferences as Record<string, unknown>) || {};

  // Update preferences with new rubric ID
  const updatedPreferences = {
    ...currentPreferences,
    default_rubric_id: rubricId,
  };

  // Update club_members preferences
  const { error: updateError } = await supabase
    .from("club_members")
    .update({
      preferences: updatedPreferences,
    })
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message || "Failed to update rubric preference" };
  }

  // Revalidate relevant paths
  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).maybeSingle();

  const clubSlug = club?.slug || clubId;
  revalidatePath(`/club/${clubSlug}/settings`);
  revalidatePath(`/club/${clubSlug}`);

  return { success: true };
}
