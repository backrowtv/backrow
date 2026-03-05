"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin } from "@phosphor-icons/react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { cn } from "@/lib/utils";
import { isUrgent, getHoursUntil } from "./timeline-utils";

export type TimelineItemType =
  | "nomination_deadline"
  | "watch_deadline"
  | "rating_deadline"
  | "watch_rate_deadline"
  | "results"
  | "event"
  | "festival_start";

export interface TimelineItemCompactData {
  id: string;
  type: TimelineItemType;
  date: string;
  title: string; // Festival theme or event title
  subtitle?: string; // "Nominations due" or "Watch Party"
  clubName: string;
  clubSlug: string;
  clubAvatarUrl?: string | null;
  clubAvatarIcon?: string | null;
  clubAvatarColorIndex?: number | null;
  clubAvatarBorderColorIndex?: number | null;
  link: string;
  eventType?: "watch_party" | "discussion" | "meetup" | "custom";
  location?: string | null;
  showClubInfo?: boolean; // Hide club avatar/name when already on club page
}

interface TimelineItemCompactProps {
  item: TimelineItemCompactData;
  isFirst?: boolean;
  isLast?: boolean;
}

function getTypeLabel(type: TimelineItemType): string {
  switch (type) {
    case "nomination_deadline":
      return "Nominations Due";
    case "watch_deadline":
      return "Watch Deadline";
    case "watch_rate_deadline":
      return "Watch & Rate";
    case "rating_deadline":
      return "Ratings Due";
    case "results":
      return "Results";
    case "event":
      return "Event";
    case "festival_start":
      return "Starts";
    default:
      return "Deadline";
  }
}

export function TimelineItemCompact({
  item,
  isFirst: _isFirst = false,
  isLast: _isLast = false,
}: TimelineItemCompactProps) {
  const urgent = isUrgent(item.date);
  const hoursUntil = getHoursUntil(item.date);
  const isPast = hoursUntil < 0;
  const itemDate = new Date(item.date);

  // Use stable numeric values for SSR, locale-formatted strings after mount
  const dayNum = itemDate.getDate();
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [month, setMonth] = useState("");
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const d = new Date(item.date);
    setDayOfWeek(d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase());
    setMonth(d.toLocaleDateString("en-US", { month: "short" }).toUpperCase());
    setTimeStr(d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
  }, [item.date]);

  return (
    <Link
      href={item.link}
      className="group flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-lg transition-all duration-200 hover:bg-[var(--hover)]"
    >
      {/* Date block - compact */}
      <div className={cn("flex-shrink-0 w-[42px] text-center", isPast ? "opacity-50" : "")}>
        <div className="text-[10px] text-[var(--text-muted)] leading-tight">{dayOfWeek}</div>
        <div
          className={cn(
            "text-lg font-bold leading-tight",
            isPast
              ? "text-[var(--text-muted)]"
              : "text-[var(--text-primary)] group-hover:text-[var(--primary)]"
          )}
        >
          {dayNum}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] leading-tight">{month}</div>
      </div>

      {/* Club avatar */}
      {item.showClubInfo !== false && (
        <div className={cn("flex-shrink-0", isPast && "opacity-50")}>
          <EntityAvatar
            entity={clubToAvatarData({
              name: item.clubName,
              slug: item.clubSlug,
              picture_url: item.clubAvatarUrl ?? undefined,
              avatar_icon: item.clubAvatarIcon,
              avatar_color_index: item.clubAvatarColorIndex,
              avatar_border_color_index: item.clubAvatarBorderColorIndex,
            })}
            emojiSet="club"
            size="xs"
          />
        </div>
      )}

      {/* Content - linear flow */}
      <div className="flex-1 min-w-0">
        {/* Primary: Deadline type */}
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            isPast
              ? "text-[var(--text-muted)]"
              : urgent
                ? "text-[var(--destructive)]"
                : "text-[var(--text-primary)] group-hover:text-[var(--primary)]"
          )}
        >
          {item.subtitle || getTypeLabel(item.type)}
        </span>

        {/* Secondary: Festival name */}
        <div
          className={cn(
            "text-xs truncate",
            isPast ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"
          )}
        >
          {item.title}
        </div>

        {/* Location for events */}
        {item.type === "event" && item.location && (
          <div
            className={cn(
              "text-xs flex items-center gap-1 mt-0.5",
              isPast ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"
            )}
          >
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}
      </div>

      {/* Time - right aligned */}
      <span
        className={cn(
          "text-xs flex-shrink-0 tabular-nums",
          isPast ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"
        )}
      >
        {timeStr}
      </span>
    </Link>
  );
}

/**
 * Container component for timeline items
 */
export function TimelineCompactList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-0", className)}>{children}</div>;
}
