"use client";

import { Bell, Check, Checks, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NumberFlow, { timingPresets } from "@/components/ui/number-flow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getGroupedNotifications,
  markAsRead,
  markAllAsRead,
  archiveAllNotifications,
} from "@/app/actions/notifications";
import type { Notification, GroupedNotifications } from "@/app/actions/notifications.types";
import { DateDisplay } from "@/components/ui/date-display";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotifications | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Flatten notifications for counting and real-time updates
  const allNotifications = groupedNotifications
    ? [
        ...groupedNotifications.today,
        ...groupedNotifications.yesterday,
        ...groupedNotifications.thisWeek,
        ...groupedNotifications.older,
      ]
    : [];
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  // Fetch notifications on mount
  useEffect(() => {
    async function loadNotifications() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          setGroupedNotifications({ today: [], yesterday: [], thisWeek: [], older: [] });
          return;
        }

        setUserId(user.id);

        const result = await getGroupedNotifications();
        if ("error" in result && result.error) {
          console.error("Error loading notifications:", result.error);
          // Set empty state on error to prevent UI breakage
          setGroupedNotifications({ today: [], yesterday: [], thisWeek: [], older: [] });
          setLoading(false);
          return;
        }

        setGroupedNotifications(
          result.data || { today: [], yesterday: [], thisWeek: [], older: [] }
        );
      } catch (error) {
        console.error("Error loading notifications:", error);
        // Set empty state on error to prevent UI breakage
        setGroupedNotifications({ today: [], yesterday: [], thisWeek: [], older: [] });
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: initial notification load
  }, []);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    const channelName = `notifications:${userId}`;

    // Remove any existing channel with this name first (handles React strict mode double-invoke)
    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const _newNotification = payload.new as Notification;
          // Reload grouped notifications to maintain proper grouping
          getGroupedNotifications()
            .then((result) => {
              if (!result.error && result.data) {
                setGroupedNotifications(result.data);
              }
              // Silently fail if error - don't break UI
            })
            .catch((error) => {
              console.error("Error reloading notifications:", error);
              // Don't update state on error - keep existing notifications
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is a stable singleton
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const result = await markAsRead(notificationId);
    if (!result.error && groupedNotifications) {
      // Update the notification in grouped structure
      const updateNotification = (notifs: Notification[]) =>
        notifs.map((n) => (n.id === notificationId ? { ...n, read: true } : n));

      setGroupedNotifications({
        today: updateNotification(groupedNotifications.today),
        yesterday: updateNotification(groupedNotifications.yesterday),
        thisWeek: updateNotification(groupedNotifications.thisWeek),
        older: updateNotification(groupedNotifications.older),
      });
    }
  };

  const handleMarkAllAsRead = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = await markAllAsRead();
    if (!result.error && groupedNotifications) {
      // Mark all as read in grouped structure
      const markAllRead = (notifs: Notification[]) => notifs.map((n) => ({ ...n, read: true }));

      setGroupedNotifications({
        today: markAllRead(groupedNotifications.today),
        yesterday: markAllRead(groupedNotifications.yesterday),
        thisWeek: markAllRead(groupedNotifications.thisWeek),
        older: markAllRead(groupedNotifications.older),
      });
    }
  };

  const handleClearAll = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = await archiveAllNotifications();
    if (!result.error) {
      setGroupedNotifications({ today: [], yesterday: [], thisWeek: [], older: [] });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
    // Mark as read when clicked
    if (!notification.read && groupedNotifications) {
      markAsRead(notification.id);
      const updateNotification = (notifs: Notification[]) =>
        notifs.map((n) => (n.id === notification.id ? { ...n, read: true } : n));

      setGroupedNotifications({
        today: updateNotification(groupedNotifications.today),
        yesterday: updateNotification(groupedNotifications.yesterday),
        thisWeek: updateNotification(groupedNotifications.thisWeek),
        older: updateNotification(groupedNotifications.older),
      });
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative flex-shrink-0 rounded-full"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          style={{ willChange: "auto" }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="danger"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
            >
              {unreadCount > 9 ? (
                "9+"
              ) : (
                <NumberFlow value={unreadCount} transformTiming={timingPresets.snappy} />
              )}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[400px] overflow-y-auto"
        sideOffset={8}
        variant="rollDown"
      >
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={handleMarkAllAsRead}
                >
                  <Checks className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              {allNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={handleClearAll}
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          {loading ? (
            <div className="px-2 py-4 text-center">
              <p className="text-sm text-[var(--text-muted)]">Loading...</p>
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-sm text-[var(--text-muted)]">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Today */}
              {groupedNotifications && groupedNotifications.today.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1">
                    Today
                  </DropdownMenuLabel>
                  {groupedNotifications.today.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </>
              )}

              {/* Yesterday */}
              {groupedNotifications && groupedNotifications.yesterday.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1">
                    Yesterday
                  </DropdownMenuLabel>
                  {groupedNotifications.yesterday.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </>
              )}

              {/* This Week */}
              {groupedNotifications && groupedNotifications.thisWeek.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1">
                    This Week
                  </DropdownMenuLabel>
                  {groupedNotifications.thisWeek.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </>
              )}

              {/* Older */}
              {groupedNotifications && groupedNotifications.older.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1">
                    Older
                  </DropdownMenuLabel>
                  {groupedNotifications.older.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Notification item component for reusability
function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead: (id: string, e: React.MouseEvent) => void;
  onClick: (notification: Notification) => void;
}) {
  return (
    <DropdownMenuItem
      className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.read ? "bg-[var(--hover)]" : ""}`}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1" />
            )}
            <p
              className={`text-sm font-semibold ${!notification.read ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
            >
              {notification.title}
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">{notification.message}</p>
          <div className="flex items-center gap-2 mt-1">
            <DateDisplay
              date={notification.created_at}
              format="relative"
              className="text-xs text-[var(--text-muted)]"
            />
          </div>
        </div>
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => onMarkAsRead(notification.id, e)}
            aria-label="Mark as read"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
      </div>
    </DropdownMenuItem>
  );
}
