"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, MapPin, Clock } from "@phosphor-icons/react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { cn } from "@/lib/utils";
import {
  type TimelineItem as TimelineItemType,
  getTypeLabel,
  getTypeColors,
  isUrgent,
  getHoursUntil,
} from "./timeline-utils";

interface TimelineItemProps {
  item: TimelineItemType;
  isFirst?: boolean;
  isLast?: boolean;
  showClub?: boolean;
}

function useFormattedDateTime(dateStr: string): { date: string; time: string } {
  const [formatted, setFormatted] = useState({ date: "", time: "" });

  useEffect(() => {
    const d = new Date(dateStr);
    setFormatted({
      date: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    });
  }, [dateStr]);

  return formatted;
}

export function TimelineItemCard({
  item,
  isFirst: _isFirst = false,
  isLast: _isLast = false,
  showClub = true,
}: TimelineItemProps) {
  const urgent = isUrgent(item.date);
  const hoursUntil = getHoursUntil(item.date);
  const isPast = hoursUntil < 0;
  const typeColors = getTypeColors(item.type);
  const { date, time } = useFormattedDateTime(item.date);

  return (
    <Link
      href={item.link}
      className={cn(
        "group flex items-center gap-4 py-6 transition-all duration-200",
        "hover:bg-[var(--hover)] rounded-lg -mx-3 px-3",
        isPast && "opacity-60"
      )}
    >
      {/* Club avatar - left anchor */}
      {showClub && item.clubName ? (
        <div
          className={cn(
            "flex-shrink-0 rounded-full ring-2 transition-all duration-200",
            isPast
              ? "ring-[var(--text-disabled)]"
              : urgent
                ? cn(typeColors.ring, "ring-offset-2 ring-offset-[var(--bg-primary)]")
                : "ring-transparent"
          )}
        >
          <EntityAvatar
            entity={clubToAvatarData({
              name: item.clubName,
              picture_url: item.clubAvatarUrl,
              avatar_icon: item.clubAvatarIcon,
              avatar_color_index: item.clubAvatarColorIndex,
              avatar_border_color_index: item.clubAvatarBorderColorIndex,
            })}
            emojiSet="club"
            size="md"
          />
        </div>
      ) : (
        <div
          className={cn(
            "w-10 h-10 rounded-full flex-shrink-0 transition-all duration-200",
            "group-hover:scale-110",
            isPast
              ? "bg-[var(--text-muted)]"
              : urgent
                ? cn(typeColors.dot, "animate-pulse")
                : typeColors.dot
          )}
        />
      )}

      {/* Content - spread horizontally */}
      <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
        {/* Left side: Type + Title */}
        <div className="min-w-0">
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-wide",
              isPast ? "text-[var(--text-muted)]" : typeColors.text
            )}
          >
            {getTypeLabel(item.type)}
          </span>
          <h4
            className={cn(
              "font-semibold text-base leading-tight mt-1",
              "transition-colors duration-200",
              isPast
                ? "text-[var(--text-muted)]"
                : "text-[var(--text-primary)] group-hover:text-[var(--primary)]"
            )}
          >
            {item.title}
          </h4>
        </div>

        {/* Right side: Date/time + extras */}
        <div className="flex-shrink-0 text-right">
          <div
            className={cn(
              "flex items-center justify-end gap-1.5 text-sm",
              isPast ? "text-[var(--text-disabled)]" : "text-[var(--text-secondary)]"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{date}</span>
          </div>
          <div
            className={cn(
              "text-sm mt-0.5",
              isPast ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"
            )}
          >
            {time}
          </div>

          {/* Location for events */}
          {item.type === "event" && item.location && (
            <div
              className={cn(
                "flex items-center justify-end gap-1.5 text-xs mt-1",
                isPast ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"
              )}
            >
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{item.location}</span>
            </div>
          )}

          {/* Attendee count for events */}
          {item.type === "event" &&
            typeof item.attendeeCount === "number" &&
            item.attendeeCount > 0 && (
              <div
                className={cn(
                  "flex items-center justify-end gap-1.5 text-xs mt-1",
                  isPast ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"
                )}
              >
                <Users className="w-3 h-3" />
                <span>{item.attendeeCount} going</span>
              </div>
            )}
        </div>
      </div>
    </Link>
  );
}
