// Timeline utility functions and type definitions

export type TimelineItemType =
  | "nomination_deadline"
  | "watch_deadline"
  | "rating_deadline"
  | "results"
  | "event"
  | "festival_start";

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  title: string; // Festival theme or event title
  subtitle: string; // "Nominations due" or "Watch Party"
  clubId: string;
  clubName: string;
  clubSlug: string;
  clubAvatarUrl?: string | null;
  clubAvatarIcon?: string | null;
  clubAvatarColorIndex?: number | null;
  clubAvatarBorderColorIndex?: number | null;
  link: string;
  urgent: boolean; // < 48 hours
  isPast?: boolean;
  // Event-specific fields
  eventType?: "watch_party" | "discussion" | "meetup" | "custom";
  location?: string | null;
  attendeeCount?: number;
}

export interface TimelineGroup {
  id: string;
  label: string; // "Today", "Tomorrow", etc.
  dateLabel?: string; // Optional formatted date
  items: TimelineItem[];
}

export type TimelineGroupId =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this-week"
  | "next-week"
  | "this-month"
  | "later"
  | "past";

/**
 * Get the start of today (midnight)
 */
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the start of the week (Sunday)
 */
function getStartOfWeek(date: Date): Date {
  const d = getStartOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Get the end of the week (Saturday 23:59:59)
 */
function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get the start of the month
 */
function _getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the month
 */
function getEndOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Determine which time group a date belongs to
 */
export function getTimeGroup(itemDate: Date, now: Date = new Date()): TimelineGroupId {
  const today = getStartOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const thisWeekEnd = getEndOfWeek(now);
  const nextWeekStart = new Date(thisWeekEnd);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  nextWeekStart.setHours(0, 0, 0, 0);
  const nextWeekEnd = getEndOfWeek(nextWeekStart);

  const thisMonthEnd = getEndOfMonth(now);

  const itemDay = getStartOfDay(itemDate);

  // Past/Overdue
  if (itemDate < now) {
    return "past";
  }

  // Today
  if (itemDay.getTime() === today.getTime()) {
    return "today";
  }

  // Tomorrow
  if (itemDay.getTime() === tomorrow.getTime()) {
    return "tomorrow";
  }

  // This Week (rest of the week after tomorrow)
  if (itemDate <= thisWeekEnd) {
    return "this-week";
  }

  // Next Week
  if (itemDate <= nextWeekEnd) {
    return "next-week";
  }

  // This Month
  if (itemDate <= thisMonthEnd) {
    return "this-month";
  }

  // Later
  return "later";
}

/**
 * Get display label for a time group
 */
export function getGroupLabel(groupId: TimelineGroupId): string {
  switch (groupId) {
    case "overdue":
      return "Overdue";
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "this-week":
      return "This Week";
    case "next-week":
      return "Next Week";
    case "this-month":
      return "This Month";
    case "later":
      return "Later";
    case "past":
      return "Past";
    default:
      return "Other";
  }
}

/**
 * Group timeline items by time period
 */
export function groupTimelineItems(
  items: TimelineItem[],
  includePast: boolean = false
): TimelineGroup[] {
  const now = new Date();
  const groups = new Map<TimelineGroupId, TimelineItem[]>();

  // Initialize groups in order
  const groupOrder: TimelineGroupId[] = [
    "overdue",
    "today",
    "tomorrow",
    "this-week",
    "next-week",
    "this-month",
    "later",
    "past",
  ];

  groupOrder.forEach((id) => groups.set(id, []));

  // Sort items into groups
  items.forEach((item) => {
    const itemDate = new Date(item.date);
    let groupId = getTimeGroup(itemDate, now);

    // Handle overdue (past but not in history mode)
    if (groupId === "past" && !includePast) {
      // Check if it's within the last hour (overdue but show it)
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      if (itemDate >= hourAgo) {
        groupId = "overdue";
      } else {
        return; // Skip old past items if not showing history
      }
    }

    groups.get(groupId)?.push(item);
  });

  // Convert to array and filter empty groups
  const result: TimelineGroup[] = [];

  groupOrder.forEach((groupId) => {
    const groupItems = groups.get(groupId) || [];

    // Skip empty groups (except 'today' which we might want to show empty)
    if (groupItems.length === 0) {
      return;
    }

    // Skip past unless explicitly included
    if (groupId === "past" && !includePast) {
      return;
    }

    // Sort items within group by date
    groupItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    result.push({
      id: groupId,
      label: getGroupLabel(groupId),
      items: groupItems,
    });
  });

  return result;
}

/**
 * Check if a date is urgent (within 48 hours)
 */
export function isUrgent(date: string | Date): boolean {
  const itemDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const hoursDiff = (itemDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursDiff > 0 && hoursDiff <= 48;
}

/**
 * Get hours until a date
 */
export function getHoursUntil(date: string | Date): number {
  const itemDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return Math.floor((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60));
}

/**
 * Get days until a date
 */
export function getDaysUntil(date: string | Date): number {
  const itemDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return Math.ceil((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format countdown text for display (abbreviated)
 */
export function formatCountdown(date: string | Date): string {
  const itemDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = itemDate.getTime() - now.getTime();

  if (diffMs < 0) {
    const hoursAgo = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
    if (hoursAgo < 1) {
      const minsAgo = Math.abs(Math.floor(diffMs / (1000 * 60)));
      return `${minsAgo}m ago`;
    }
    if (hoursAgo < 24) {
      return `${hoursAgo}h ago`;
    }
    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins}m`;
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w`;
  }

  const months = Math.floor(days / 30);
  return `${months}mo`;
}

/**
 * Format countdown text with spelled-out units (e.g., "in 5 days", "in 2 weeks")
 * Used when the countdown is displayed as the primary/only text on a line
 */
export function formatCountdownLong(date: string | Date): string {
  const itemDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = itemDate.getTime() - now.getTime();

  if (diffMs < 0) {
    const hoursAgo = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
    if (hoursAgo < 1) {
      const minsAgo = Math.abs(Math.floor(diffMs / (1000 * 60)));
      return `${minsAgo} ${minsAgo === 1 ? "minute" : "minutes"} ago`;
    }
    if (hoursAgo < 24) {
      return `${hoursAgo} ${hoursAgo === 1 ? "hour" : "hours"} ago`;
    }
    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return `in ${mins} ${mins === 1 ? "minute" : "minutes"}`;
  }

  if (hours < 24) {
    return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `in ${days} ${days === 1 ? "day" : "days"}`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }

  const months = Math.floor(days / 30);
  return `in ${months} ${months === 1 ? "month" : "months"}`;
}

/**
 * Get type label for display
 */
export function getTypeLabel(type: TimelineItemType): string {
  switch (type) {
    case "nomination_deadline":
      return "Nominations Due";
    case "watch_deadline":
      return "Watch Deadline";
    case "rating_deadline":
      return "Ratings Due";
    case "results":
      return "Results Revealed";
    case "event":
      return "Event";
    case "festival_start":
      return "Festival Starts";
    default:
      return "Deadline";
  }
}

/**
 * Get type color classes
 */
export function getTypeColors(type: TimelineItemType): {
  bg: string;
  text: string;
  dot: string;
  border: string;
  ring: string;
} {
  switch (type) {
    case "nomination_deadline":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-500",
        dot: "bg-blue-500",
        border: "border-blue-500/30",
        ring: "ring-blue-500",
      };
    case "watch_deadline":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        dot: "bg-amber-500",
        border: "border-amber-500/30",
        ring: "ring-amber-500",
      };
    case "rating_deadline":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-500",
        dot: "bg-purple-500",
        border: "border-purple-500/30",
        ring: "ring-purple-500",
      };
    case "results":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        dot: "bg-emerald-500",
        border: "border-emerald-500/30",
        ring: "ring-emerald-500",
      };
    case "event":
      return {
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        dot: "bg-rose-500",
        border: "border-rose-500/30",
        ring: "ring-rose-500",
      };
    case "festival_start":
      return {
        bg: "bg-[var(--primary)]/10",
        text: "text-[var(--primary)]",
        dot: "bg-[var(--primary)]",
        border: "border-[var(--primary)]/30",
        ring: "ring-[var(--primary)]",
      };
    default:
      return {
        bg: "bg-[var(--surface-2)]",
        text: "text-[var(--text-muted)]",
        dot: "bg-[var(--text-muted)]",
        border: "border-[var(--border)]",
        ring: "ring-[var(--text-muted)]",
      };
  }
}
