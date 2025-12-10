"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logDualActivity } from "@/lib/activity/logger";

// Helper function to get club slug from club ID
async function getClubSlug(supabase: SupabaseClient, clubId: string): Promise<string> {
  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).maybeSingle();
  return club?.slug || clubId;
}

export async function updateMemberRole(
  clubId: string,
  userId: string,
  newRole: "critic" | "director"
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check user's role (must be producer or director)
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You are not a member of this club" };
  }

  // Only producer can promote to director
  // Director can only promote critics to director
  // Producer can promote anyone to director
  if (newRole === "director") {
    if (membership.role !== "producer" && membership.role !== "director") {
      return { error: "You do not have permission to promote members" };
    }

    // Directors can only promote critics to director
    if (membership.role === "director") {
      const { data: targetMember } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .maybeSingle();

      if (targetMember?.role !== "critic") {
        return { error: "Directors can only promote critics to director" };
      }
    }
  } else {
    // Only producer can demote
    if (membership.role !== "producer") {
      return { error: "Only the producer can change member roles" };
    }
  }

  // Cannot change producer role
  const { data: targetMember, error: targetMemberError } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (targetMemberError) {
    return { error: targetMemberError.message };
  }

  if (targetMember?.role === "producer") {
    return { error: "Cannot change the producer role" };
  }

  // Get target user info for logging
  const { data: _targetUser, error: targetUserError } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (targetUserError) {
    // Log error but continue - user info is optional for logging
    console.error("Error fetching target user for logging:", targetUserError);
  }

  const { error } = await supabase
    .from("club_members")
    .update({ role: newRole })
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}/members`);
  revalidatePath(`/club/${clubSlug}`);
  return { success: true };
}

export async function removeMember(clubId: string, userId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check user's role (must be producer or director)
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You are not a member of this club" };
  }

  // Cannot remove producer
  const { data: targetMember } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (targetMember?.role === "producer") {
    return { error: "Cannot remove the producer" };
  }

  // Only producer and director can remove members
  if (membership.role !== "producer" && membership.role !== "director") {
    return { error: "You do not have permission to remove members" };
  }

  // Cannot remove yourself
  if (userId === user.id) {
    return { error: "You cannot remove yourself from the club" };
  }

  // Get target user info and club info for logging
  const { data: _targetUser2, error: targetUserError } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (targetUserError) {
    // Log error but continue - user info is optional for logging
    console.error("Error fetching target user for logging:", targetUserError);
  }

  const { data: club } = await supabase
    .from("clubs")
    .select("name, slug")
    .eq("id", clubId)
    .maybeSingle();

  // Handle incomplete festival ratings before removing member
  // Find active festivals where user has incomplete ratings
  const { data: activeFestivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", clubId)
    .not("status", "in", '("completed","cancelled")');

  if (activeFestivals && activeFestivals.length > 0) {
    for (const festival of activeFestivals) {
      // Get total nominations for this festival
      const { count: totalNominations } = await supabase
        .from("nominations")
        .select("*", { count: "exact", head: true })
        .eq("festival_id", festival.id)
        .is("deleted_at", null);

      // Get user's ratings for this festival
      const { count: userRatings } = await supabase
        .from("ratings")
        .select("*", { count: "exact", head: true })
        .eq("festival_id", festival.id)
        .eq("user_id", userId);

      const hasCompleteRatings = userRatings && totalNominations && userRatings >= totalNominations;

      // If incomplete ratings, remove them
      if (!hasCompleteRatings && (userRatings || 0) > 0) {
        await supabase
          .from("ratings")
          .delete()
          .eq("festival_id", festival.id)
          .eq("user_id", userId);

        // Also remove any guesses for incomplete festivals
        await supabase
          .from("guesses")
          .delete()
          .eq("festival_id", festival.id)
          .eq("user_id", userId);
      }
      // Soft-delete nominations from removed member in active festivals
      // (completed festival results are final and won't be recalculated)
      await supabase
        .from("nominations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("festival_id", festival.id)
        .eq("user_id", userId)
        .is("deleted_at", null);
    }
  }

  // Log dual activity before removing member
  if (club) {
    await logDualActivity(clubId, userId, "member_left", "user_left_club", {
      club_name: club.name,
      club_slug: club.slug || clubId,
    });
  }

  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}/members`);
  revalidatePath(`/club/${clubSlug}`);
  return { success: true };
}

export async function updateDisplayName(clubId: string, displayName: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Validate display name
  if (displayName && displayName.length > 50) {
    return { error: "Display name must be less than 50 characters" };
  }

  // Check blacklist if display name is provided
  if (displayName && displayName.trim()) {
    const { validateBlacklist } = await import("@/lib/clubs/blacklist");
    const blacklistError = await validateBlacklist(clubId, displayName);
    if (blacklistError) {
      return { error: blacklistError };
    }
  }

  const { error } = await supabase
    .from("club_members")
    .update({ club_display_name: displayName.trim() || null })
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}/members`);
  revalidatePath(`/club/${clubSlug}`);
  return { success: true };
}
