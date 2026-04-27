"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateMember } from "@/lib/cache/invalidate";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import type { UpdateClubRubricPreferenceResult } from "./club-rubrics.types";

/**
 * Update the user's default rubric preference for a specific club
 */
export async function updateClubRubricPreference(
  clubId: string,
  rubricId: string | null
): Promise<UpdateClubRubricPreferenceResult> {
  const rateCheck = await actionRateLimit("updateClubRubricPreference", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

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

  invalidateMember(clubId, user.id);

  return { success: true };
}
