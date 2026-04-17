"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import type {
  Notification,
  GroupedNotifications,
  NotificationGroup,
  NotificationType,
} from "./notifications.types";
import {
  sendNotificationEmail,
  sendNotificationEmailBatch,
} from "@/lib/email/send-notification-email";
import { sendPushToUser, sendPushToUsers } from "@/lib/push";
import {
  parseNotificationPrefs,
  parseClubNotificationPrefs,
  getPreferenceKey,
} from "@/lib/notifications/prefs";

/**
 * Get all notifications for the current user
 * Ordered by created_at DESC (newest first)
 * Excludes archived notifications
 */
export async function getNotifications(): Promise<{ error?: string; data?: Notification[] }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, user_id, type, title, message, link, read, created_at, club_id, festival_id, related_user_id, archived, archived_at"
      )
      .eq("user_id", user.id)
      .eq("archived", false) // Exclude archived notifications
      .order("created_at", { ascending: false })
      .limit(100); // Limit to recent 100 notifications

    if (error) {
      return handleActionError(error, "getNotifications");
    }

    return { data: (data || []) as Notification[] };
  } catch (error) {
    return handleActionError(error, "getNotifications");
  }
}

/**
 * Get grouped notifications for the current user
 * Groups by date (Today, Yesterday, This Week, Older)
 */
export async function getGroupedNotifications(): Promise<{
  error?: string;
  data?: GroupedNotifications;
}> {
  const result = await getNotifications();
  if (result.error || !result.data) {
    return { error: result.error };
  }

  const notifications = result.data;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const grouped: GroupedNotifications = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  notifications.forEach((notification) => {
    const createdAt = new Date(notification.created_at);

    if (createdAt >= today) {
      grouped.today.push(notification);
    } else if (createdAt >= yesterday) {
      grouped.yesterday.push(notification);
    } else if (createdAt >= thisWeek) {
      grouped.thisWeek.push(notification);
    } else {
      grouped.older.push(notification);
    }
  });

  return { data: grouped };
}

/**
 * Get notifications grouped by type
 */
export async function getNotificationsByType(): Promise<{
  error?: string;
  data?: NotificationGroup[];
}> {
  const result = await getNotifications();
  if (result.error || !result.data) {
    return { error: result.error };
  }

  const notifications = result.data;
  const groupedByType = new Map<string, Notification[]>();

  notifications.forEach((notification) => {
    const type = notification.type;
    if (!groupedByType.has(type)) {
      groupedByType.set(type, []);
    }
    groupedByType.get(type)!.push(notification);
  });

  const groups: NotificationGroup[] = Array.from(groupedByType.entries()).map(([type, notifs]) => ({
    label: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    notifications: notifs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    count: notifs.length,
    unreadCount: notifs.filter((n) => !n.read).length,
  }));

  // Sort groups by most recent notification
  groups.sort((a, b) => {
    const aLatest = a.notifications[0]?.created_at || "";
    const bLatest = b.notifications[0]?.created_at || "";
    return bLatest.localeCompare(aLatest);
  });

  return { data: groups };
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // First verify the notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("id", notificationId)
      .single();

    if (fetchError || !notification) {
      return { error: "Notification not found" };
    }

    if (notification.user_id !== user.id) {
      return { error: "Unauthorized" };
    }

    // Update the notification
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (updateError) {
      return handleActionError(updateError, "markAsRead");
    }

    return {};
  } catch (error) {
    return handleActionError(error, "markAsRead");
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllAsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      return handleActionError(error, "markAllAsRead");
    }

    return {};
  } catch (error) {
    return handleActionError(error, "markAllAsRead");
  }
}

/**
 * Get count of unread notifications for the current user
 */
export async function getUnreadCount(): Promise<{ error?: string; data?: number }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .eq("archived", false); // Exclude archived notifications

    if (error) {
      return handleActionError(error, "getUnreadCount");
    }

    return { data: count || 0 };
  } catch (error) {
    return handleActionError(error, "getUnreadCount");
  }
}

/**
 * Archive old read notifications (30+ days old)
 * Should be called periodically via cron job
 */
export async function archiveOldNotifications(): Promise<{ error?: string; archived?: number }> {
  const supabase = await createClient();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("notifications")
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq("archived", false)
      .eq("read", true)
      .lt("created_at", thirtyDaysAgo.toISOString())
      .select("id");

    if (error) {
      return handleActionError(error, "archiveOldNotifications");
    }

    return { archived: data?.length || 0 };
  } catch (error) {
    return handleActionError(error, "archiveOldNotifications");
  }
}

/**
 * Delete very old archived notifications (90+ days old)
 * Should be called periodically via cron job
 */
export async function deleteOldArchivedNotifications(): Promise<{
  error?: string;
  deleted?: number;
}> {
  const supabase = await createClient();

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("archived", true)
      .lt("archived_at", ninetyDaysAgo.toISOString())
      .select("id");

    if (error) {
      return handleActionError(error, "deleteOldArchivedNotifications");
    }

    return { deleted: data?.length || 0 };
  } catch (error) {
    return handleActionError(error, "deleteOldArchivedNotifications");
  }
}

/**
 * Batch get notification preferences for multiple users (single query)
 */
interface UserPrefsData {
  socialLinks: Record<string, unknown> | null;
  email: string;
  displayName: string;
}

async function batchGetNotificationPreferences(
  userIds: string[]
): Promise<Map<string, UserPrefsData>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("users")
    .select("id, social_links, email, display_name")
    .in("id", userIds);

  const prefsMap = new Map<string, UserPrefsData>();

  // Initialize all users with defaults
  for (const userId of userIds) {
    prefsMap.set(userId, { socialLinks: null, email: "", displayName: "" });
  }

  // Populate with actual data
  if (profiles) {
    for (const profile of profiles) {
      prefsMap.set(profile.id, {
        socialLinks: profile.social_links as Record<string, unknown> | null,
        email: profile.email,
        displayName: profile.display_name,
      });
    }
  }

  return prefsMap;
}

/**
 * Get user notification preferences along with email info
 */
async function getUserNotificationPreferences(userId: string): Promise<{
  prefs: Record<string, boolean>;
  email: string;
  displayName: string;
  socialLinks: Record<string, unknown> | null;
}> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("social_links, email, display_name")
    .eq("id", userId)
    .single();

  return {
    prefs: parseNotificationPrefs(profile?.social_links as Record<string, unknown> | null),
    email: profile?.email || "",
    displayName: profile?.display_name || "",
    socialLinks: profile?.social_links as Record<string, unknown> | null,
  };
}

/**
 * Get club notification preferences for a user
 */
async function getClubNotificationPreferences(
  userId: string,
  clubId: string
): Promise<Record<string, boolean>> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", userId)
    .single();

  return parseClubNotificationPrefs(
    profile?.social_links as Record<string, unknown> | null,
    clubId
  );
}

/**
 * Create a notification for a user
 * Respects user and club notification preferences
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  clubId?: string;
  festivalId?: string;
  relatedUserId?: string;
}): Promise<{ error?: string; created?: boolean }> {
  const supabase = await createClient();

  try {
    // 1. Check user-level preferences
    const {
      prefs: userPrefs,
      email,
      displayName,
      socialLinks,
    } = await getUserNotificationPreferences(params.userId);
    const prefKey = getPreferenceKey(params.type, params.clubId);

    if (userPrefs[prefKey] === false) {
      // User has disabled this notification type globally
      return { created: false };
    }

    // 2. Check club-level preferences (if club-specific)
    if (params.clubId) {
      const clubPrefs = await getClubNotificationPreferences(params.userId, params.clubId);
      if (clubPrefs[prefKey] === false) {
        // User has disabled this notification type for this club
        return { created: false };
      }
    }

    // 3. Create notification
    const { error } = await supabase.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      club_id: params.clubId || null,
      festival_id: params.festivalId || null,
      related_user_id: params.relatedUserId || null,
      read: false,
      archived: false,
    });

    if (error) {
      return handleActionError(error, "createNotification");
    }

    // 4. Fire-and-forget email notification
    sendNotificationEmail({
      email,
      displayName,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      clubId: params.clubId,
      socialLinks,
    }).catch((err) => console.error("Email notification failed:", err));

    // 5. Fire-and-forget web push (master-gated by all_push_notifications)
    if (userPrefs.all_push_notifications !== false) {
      void sendPushToUser(params.userId, {
        title: params.title,
        body: params.message,
        url: params.link ?? "/",
        type: params.type,
        tag: params.type,
      }).catch((err) => console.error("Push notification failed:", err));
    }

    return { created: true };
  } catch (error) {
    return handleActionError(error, "createNotification");
  }
}

/**
 * Create notifications for multiple users (e.g., all club members)
 * Respects each user's preferences using batch operations
 */
export async function createNotificationsForUsers(params: {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  clubId?: string;
  festivalId?: string;
  relatedUserId?: string;
}): Promise<{ error?: string; created?: number }> {
  if (params.userIds.length === 0) {
    return { created: 0 };
  }

  try {
    const supabase = await createClient();
    const prefKey = getPreferenceKey(params.type, params.clubId);

    // 1. Batch fetch all user preferences in a single query
    const userPrefsMap = await batchGetNotificationPreferences(params.userIds);

    // 2. Filter users based on preferences in memory
    const eligibleUserIds: string[] = [];

    for (const userId of params.userIds) {
      const userData = userPrefsMap.get(userId);
      const socialLinks = userData?.socialLinks ?? null;

      // Check user-level preferences
      const userPrefs = parseNotificationPrefs(socialLinks);
      if (userPrefs[prefKey] === false) {
        continue; // User has disabled this notification type globally
      }

      // Check club-level preferences (if club-specific)
      if (params.clubId) {
        const clubPrefs = parseClubNotificationPrefs(socialLinks, params.clubId);
        if (clubPrefs[prefKey] === false) {
          continue; // User has disabled this notification type for this club
        }
      }

      eligibleUserIds.push(userId);
    }

    if (eligibleUserIds.length === 0) {
      return { created: 0 };
    }

    // 3. Batch insert all notifications in a single query
    const notificationsToInsert = eligibleUserIds.map((userId) => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      club_id: params.clubId || null,
      festival_id: params.festivalId || null,
      related_user_id: params.relatedUserId || null,
      read: false,
      archived: false,
    }));

    const { error } = await supabase.from("notifications").insert(notificationsToInsert);

    if (error) {
      return handleActionError(error, "createNotificationsForUsers");
    }

    // 4. Fire-and-forget batch email notifications
    const emailUsers = eligibleUserIds.map((userId) => {
      const userData = userPrefsMap.get(userId);
      return {
        email: userData?.email || "",
        displayName: userData?.displayName,
        socialLinks: userData?.socialLinks ?? null,
      };
    });

    sendNotificationEmailBatch({
      users: emailUsers,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      clubId: params.clubId,
    }).catch((err) => console.error("Batch email notification failed:", err));

    // 5. Fire-and-forget batch web push (filter by master all_push_notifications)
    const pushEligibleUserIds = eligibleUserIds.filter((userId) => {
      const userData = userPrefsMap.get(userId);
      const userPrefs = parseNotificationPrefs(userData?.socialLinks ?? null);
      return userPrefs.all_push_notifications !== false;
    });
    if (pushEligibleUserIds.length > 0) {
      void sendPushToUsers(pushEligibleUserIds, {
        title: params.title,
        body: params.message,
        url: params.link ?? "/",
        type: params.type,
        tag: params.type,
      }).catch((err) => console.error("Batch push notification failed:", err));
    }

    return { created: eligibleUserIds.length };
  } catch (error) {
    return handleActionError(error, "createNotificationsForUsers");
  }
}
