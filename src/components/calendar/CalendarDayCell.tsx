"use client";

/**
 * Calendar Day Cell
 *
 * Individual day cell in the month view with festivals, events, and deadlines.
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FilmReel,
  Play,
  Users,
  MapPin,
  Clock,
  CalendarBlank as CalendarIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatTime,
  getDeadlineLabel,
  getDeadlineShortLabel,
  getClubColorHex,
} from "./calendarUtils";
import type { CalendarDay, Festival, ClubEvent, ClubColor } from "./calendarTypes";

interface CalendarDayCellProps {
  day: CalendarDay;
  mode: "global" | "club";
  clubColorMap: Map<string, ClubColor>;
  currentClubSlug?: string;
}

function getEventIcon(type: ClubEvent["event_type"]) {
  switch (type) {
    case "watch_party":
      return <Play className="w-3 h-3" />;
    case "discussion":
      return <Users className="w-3 h-3" />;
    case "meetup":
      return <MapPin className="w-3 h-3" />;
    case "custom":
    default:
      return <CalendarIcon className="w-3 h-3" />;
  }
}

export function CalendarDayCell({
  day,
  mode,
  clubColorMap,
  currentClubSlug,
}: CalendarDayCellProps) {
  const hasActiveFestival = day.activeFestivals.length > 0;
  const primaryFestival = day.activeFestivals[0];
  const clubColor = primaryFestival ? clubColorMap.get(primaryFestival.club_id) : undefined;

  // Check if this is the start of a festival
  const festivalStarts = day.festivals.length > 0;

  // Check if this day is the first of the week OR festival start
  const dayOfWeek = day.date.getDay();
  const showFestivalLabel = hasActiveFestival && (dayOfWeek === 0 || festivalStarts);

  const getClubLink = (festival: Festival) => {
    const clubSlug = festival.club?.slug || currentClubSlug;
    return clubSlug ? `/club/${clubSlug}/festival/${festival.slug}` : "#";
  };

  return (
    <div
      className={cn(
        "min-h-[90px] p-1.5 bg-[var(--surface-0)] transition-colors relative",
        !day.isCurrentMonth && "bg-[var(--surface-1)] opacity-40",
        day.isToday && "ring-2 ring-[var(--primary)] ring-inset z-10",
        hasActiveFestival &&
          day.isCurrentMonth &&
          cn(
            "border-l-2",
            clubColor?.bg || "bg-[var(--primary)]/5",
            clubColor?.border
              ? `border-l-${clubColor.border.split("-")[1]}-500`
              : "border-l-[var(--primary)]"
          )
      )}
      style={
        hasActiveFestival && clubColor
          ? {
              backgroundColor: `color-mix(in srgb, ${getClubColorHex(clubColor)} 10%, transparent)`,
            }
          : undefined
      }
    >
      {/* Date number */}
      <div
        className={cn(
          "text-xs font-medium mb-1",
          day.isToday && "text-[var(--primary)] font-bold",
          !day.isCurrentMonth && "text-[var(--text-muted)]"
        )}
      >
        {day.date.getDate()}
      </div>

      {/* Content */}
      <div className="space-y-0.5">
        {/* Festival indicator */}
        {showFestivalLabel && primaryFestival && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={getClubLink(primaryFestival)}>
                  <div
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5",
                      clubColor?.bg || "bg-[var(--primary)]/20",
                      clubColor?.text || "text-[var(--primary)]"
                    )}
                  >
                    <FilmReel className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{primaryFestival.theme || "Festival"}</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{primaryFestival.theme || "Festival"}</div>
                  {mode === "global" && primaryFestival.club && (
                    <div className="text-[var(--text-muted)]">{primaryFestival.club.name}</div>
                  )}
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {primaryFestival.phase}
                  </Badge>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Events */}
        {day.events.slice(0, 1).map((event) => {
          const clubSlug = event.club?.slug || currentClubSlug;
          return (
            <TooltipProvider key={event.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={clubSlug ? `/club/${clubSlug}` : "#"}>
                    <div className="text-[9px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5 bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      {getEventIcon(event.event_type)}
                      <span className="truncate">{event.title}</span>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-[var(--text-muted)]">
                      {formatTime(new Date(event.event_date))}
                    </div>
                    {event.location && (
                      <div className="text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Deadlines */}
        {day.deadlines.slice(0, 1).map((deadline, i) => (
          <TooltipProvider key={`${deadline.festival.id}-${deadline.type}-${i}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={getClubLink(deadline.festival)}>
                  <div className="text-[9px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5 bg-[var(--destructive)] text-white">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{getDeadlineShortLabel(deadline.type)}</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{getDeadlineLabel(deadline.type)}</div>
                  <div className="text-[var(--text-muted)]">
                    {deadline.festival.theme || "Festival"}
                  </div>
                  <div className="text-[var(--text-muted)] mt-1">{formatTime(deadline.date)}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* More indicator */}
        {(day.events.length > 1 || day.deadlines.length > 1 || day.activeFestivals.length > 1) && (
          <div className="text-[9px] text-[var(--text-muted)] pl-1">
            +
            {day.events.length +
              day.deadlines.length +
              day.activeFestivals.length -
              Math.min(day.events.length, 1) -
              Math.min(day.deadlines.length, 1) -
              (showFestivalLabel ? 1 : 0)}{" "}
            more
          </div>
        )}
      </div>
    </div>
  );
}
