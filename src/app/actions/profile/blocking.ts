"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMemberActivity } from "@/lib/activity/logger";
import type {
  BlockUserResult,
  BlockedUser,
  GetBlockedUsersResult,
  ReportUserResult,
} from "./types";
import { handleActionError } from "@/lib/errors/handler";

/**
 * Block a user
 */
export async function blockUser(userId: string): Promise<BlockUserResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  if (user.id === userId) {
    return { error: "You cannot block yourself" };
  }

  // Check if already blocked
  const { data: existing } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId)
    .maybeSingle();

  if (existing) {
    return { error: "You have already blocked this user" };
  }

  // Get blocked user info for activity log
  const { data: blockedUser } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await supabase.from("user_blocks").insert({
    blocker_id: user.id,
    blocked_id: userId,
  });

  if (error) {
    return handleActionError(error, "blockUser");
  }

  // Log activity
  if (blockedUser) {
    await logMemberActivity(user.id, "user_blocked", {
      target_user_name: blockedUser.display_name,
    });
  }

  revalidatePath("/profile/settings/account");
  return { success: true };
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<BlockUserResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId);

  if (error) {
    return handleActionError(error, "unblockUser");
  }

  revalidatePath("/profile/settings/account");
  return { success: true };
}

/**
 * Get all users blocked by current user
 */
export async function getBlockedUsers(): Promise<GetBlockedUsersResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("user_blocks")
    .select(
      `
      id,
      blocked_id,
      created_at,
      user:blocked_id (
        id,
        display_name,
        username,
        avatar_url
      )
    `
    )
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return handleActionError(error, "getBlockedUsers");
  }

  // Transform the data to flatten the user relation
  const blockedUsers: BlockedUser[] = (data || []).map((block) => ({
    id: block.id,
    blocked_id: block.blocked_id,
    created_at: block.created_at,
    user: Array.isArray(block.user) ? block.user[0] : block.user,
  }));

  return { data: blockedUsers };
}

/**
 * Check if there's a block between current user and target user
 */
export async function checkUserBlocked(targetUserId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if current user blocked the target OR target blocked current user
  const { data, error } = await supabase
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`
    )
    .maybeSingle();

  if (error) {
    handleActionError(error, { action: "checkUserBlocked", silent: true });
    return false;
  }

  return !!data;
}

/**
 * Check if target user has blocked current user
 */
export async function hasUserBlockedMe(targetUserId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if target user has blocked the current user
  const { data, error } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", targetUserId)
    .eq("blocked_id", user.id)
    .maybeSingle();

  if (error) {
    handleActionError(error, { action: "hasUserBlockedMe", silent: true });
    return false;
  }

  return !!data;
}

/**
 * Report a user
 */
export async function reportUser(
  userId: string,
  reason: string,
  details?: string
): Promise<ReportUserResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  if (user.id === userId) {
    return { error: "You cannot report yourself" };
  }

  if (!reason.trim()) {
    return { error: "Please provide a reason for the report" };
  }

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: user.id,
    reported_id: userId,
    reason: reason.trim(),
    details: details?.trim() || null,
  });

  if (error) {
    return handleActionError(error, "reportUser");
  }

  return { success: true };
}
