"use server";

/**
 * Club Join Request Actions
 *
 * Server actions for requesting to join clubs, and approving/denying requests.
 * Used for public_moderated clubs where users request access and admins approve.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateClub, invalidateMember } from "@/lib/cache/invalidate";
import { logDualActivity } from "@/lib/activity/logger";
import { ensureUser } from "@/lib/users/ensureUser";
import { checkAndAwardClubBadges } from "../club-badges";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

export interface JoinRequest {
  id: string;
  club_id: string;
  user_id: string;
  status: string;
  message: string | null;
  denial_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  users: {
    id: string;
    email: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Create a join request for a public_moderated club
 */
export async function createJoinRequest(
  clubId: string,
  message?: string
): Promise<{ success?: boolean; error?: string }> {
  const rateCheck = await actionRateLimit("createJoinRequest", { limit: 5, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to request to join a club" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Ensure user exists in public.users table
  try {
    await ensureUser(supabase, user.id, user.email || "");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to load user profile",
    };
  }

  // Check if club exists and is public_moderated
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug, privacy, archived")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) {
    return { error: clubError.message };
  }

  if (!club) {
    return { error: "Club not found" };
  }

  if (club.archived) {
    return { error: "This club has been archived and is not accepting new members" };
  }

  if (club.privacy !== "public_moderated") {
    return { error: "This club does not accept join requests" };
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return { error: "You are already a member of this club" };
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from("club_join_requests")
    .select("id, status")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingRequest) {
    return { error: "You already have a pending request for this club" };
  }

  // Create request
  const { error: insertError } = await supabase.from("club_join_requests").insert({
    club_id: clubId,
    user_id: user.id,
    message: message?.trim() || null,
    status: "pending",
  });

  if (insertError) {
    return { error: insertError.message };
  }

  // Get user info for notification
  const { data: userInfo } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const userName = userInfo?.display_name || userInfo?.email || "Someone";

  // Get club admins for notifications
  const { data: admins } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .in("role", ["producer", "director"]);

  // Create notifications for all admins
  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.user_id,
      type: "join_request_received",
      title: "New Join Request",
      message: `${userName} wants to join ${club.name}`,
      link: `/club/${club.slug || club.id}/members?tab=requests`,
      club_id: clubId,
      related_user_id: user.id,
      read: false,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  invalidateClub(clubId);

  return { success: true };
}

/**
 * Approve a join request and add the user as a member
 */
export async function approveJoinRequest(
  requestId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Get request with club info
  const { data: request, error: requestError } = await supabase
    .from("club_join_requests")
    .select(
      `
      *,
      clubs!inner (id, name, slug, max_members)
    `
    )
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (requestError) {
    return { error: requestError.message };
  }

  if (!request) {
    return { error: "Request not found or already processed" };
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", request.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only producers and directors can approve requests" };
  }

  // Enforce member ceiling at the action layer (RLS is defense-in-depth).
  const clubRow = request.clubs as {
    id: string;
    name: string;
    slug: string | null;
    max_members: number;
  };
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("user_id", { count: "exact", head: true })
    .eq("club_id", request.club_id);

  if (typeof memberCount === "number" && memberCount >= clubRow.max_members) {
    return { error: "This club has reached its member limit." };
  }

  // Add user as member
  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: request.club_id,
    user_id: request.user_id,
    role: "critic",
  });

  if (memberError) {
    // Check if already a member (race condition)
    if (memberError.message.includes("duplicate") || memberError.message.includes("unique")) {
      // Update request status anyway
      await supabase
        .from("club_join_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return { error: "User is already a member of this club" };
    }
    return { error: memberError.message };
  }

  // Update request status
  await supabase
    .from("club_join_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  // Log activity
  const clubData = clubRow;
  await logDualActivity(request.club_id, request.user_id, "member_joined", "user_joined_club", {
    club_name: clubData.name,
    club_slug: clubData.slug || request.club_id,
    method: "request_approved",
  });

  // Notify requester
  await supabase.from("notifications").insert({
    user_id: request.user_id,
    type: "join_request_approved",
    title: "Join Request Approved",
    message: `Your request to join ${clubData.name} was approved!`,
    link: `/club/${clubData.slug || request.club_id}`,
    club_id: request.club_id,
    read: false,
  });

  // Check and award club badges for member count milestone
  try {
    await checkAndAwardClubBadges(request.club_id);
  } catch (error) {
    // Don't fail approval if badge check fails
    console.error("Failed to check club badges:", error);
  }

  invalidateMember(request.club_id, request.user_id);

  return { success: true };
}

/**
 * Deny a join request with an optional reason message
 */
export async function denyJoinRequest(
  requestId: string,
  denialReason?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get request with club info
  const { data: request, error: requestError } = await supabase
    .from("club_join_requests")
    .select(
      `
      *,
      clubs!inner (id, name, slug)
    `
    )
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (requestError) {
    return { error: requestError.message };
  }

  if (!request) {
    return { error: "Request not found or already processed" };
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", request.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only producers and directors can deny requests" };
  }

  // Update request status
  await supabase
    .from("club_join_requests")
    .update({
      status: "denied",
      denial_reason: denialReason?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  // Only notify requester if a denial reason was provided
  if (denialReason?.trim()) {
    const clubData = request.clubs as { id: string; name: string; slug: string | null };
    await supabase.from("notifications").insert({
      user_id: request.user_id,
      type: "join_request_denied",
      title: "Join Request Denied",
      message: `Your request to join ${clubData.name} was denied: ${denialReason.trim()}`,
      club_id: request.club_id,
      read: false,
    });
  }

  invalidateClub(request.club_id);

  return { success: true };
}

/**
 * Get pending join requests for a club (admin only)
 */
export async function getPendingRequests(
  clubId: string
): Promise<{ success?: boolean; requests?: JoinRequest[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only producers and directors can view join requests" };
  }

  const { data, error } = await supabase
    .from("club_join_requests")
    .select(
      `
      *,
      users!inner (id, email, username, display_name, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index)
    `
    )
    .eq("club_id", clubId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { success: true, requests: data as JoinRequest[] };
}

/**
 * Get count of pending join requests for a club
 */
export async function getPendingRequestCount(
  clubId: string
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("club_join_requests")
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("status", "pending");

  if (error) {
    return { error: error.message };
  }

  return { success: true, count: count || 0 };
}

export interface UserPendingRequest {
  id: string;
  status: string;
  created_at: string | null;
}

/**
 * Check if the current user has a pending request for a club
 */
export async function getUserPendingRequest(clubId: string): Promise<{
  success?: boolean;
  hasPendingRequest?: boolean;
  request?: UserPendingRequest;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: true, hasPendingRequest: false };
  }

  const { data, error } = await supabase
    .from("club_join_requests")
    .select("id, status, created_at")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    hasPendingRequest: !!data,
    request: data ? { id: data.id, status: data.status, created_at: data.created_at } : undefined,
  };
}
