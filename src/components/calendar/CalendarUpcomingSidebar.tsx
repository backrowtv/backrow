"use client";

/**
 * Calendar Upcoming Sidebar
 *
 * Shows upcoming events, deadlines, and legend.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FilmReel,
  Star,
  Trophy,
  Clock,
  Play,
  MapPin,
  CalendarBlank as CalendarIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UpcomingItem, Deadline, ClubColor } from "./calendarTypes";

interface CalendarUpcomingSidebarProps {
  upcomingItems: UpcomingItem[];
  mode: "global" | "club";
  clubColorMap: Map<string, ClubColor>;
}

function getDeadlineIcon(type: Deadline["type"]) {
  switch (type) {
    case "nomination":
      return <FilmReel className="w-3 h-3" />;
    case "watch_rate":
      return <Star className="w-3 h-3" />;
    case "results":
      return <Trophy className="w-3 h-3" />;
  }
}

export function CalendarUpcomingSidebar({
  upcomingItems,
  mode,
  clubColorMap,
}: CalendarUpcomingSidebarProps) {
  return (
    <div className="lg:col-span-1">
      <Card className="border-[var(--border)] bg-[var(--surface-0)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {upcomingItems.length > 0 ? (
            <div className="space-y-2">
              {upcomingItems.map((item, index) => {
                const daysUntil = Math.ceil(
                  (item.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                const clubColor = item.club ? clubColorMap.get(item.club.id) : undefined;

                return (
                  <Link key={index} href={item.link}>
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors cursor-pointer",
                        item.urgent
                          ? "bg-[var(--destructive)]/10 hover:bg-[var(--destructive)]/20"
                          : "bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5",
                            item.type === "deadline"
                              ? "bg-[var(--destructive)] text-white"
                              : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                          )}
                        >
                          {item.type === "deadline" && item.deadlineType ? (
                            getDeadlineIcon(item.deadlineType)
                          ) : (
                            <CalendarIcon className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{item.subtitle}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">
                            {item.title}
                          </div>
                          {mode === "global" && item.club && (
                            <div
                              className={cn(
                                "text-[10px] truncate",
                                clubColor?.text || "text-[var(--text-muted)]"
                              )}
                            >
                              {item.club.name}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={item.urgent ? "danger" : "secondary"}
                          className="text-[10px] shrink-0"
                          suppressHydrationWarning
                        >
                          {daysUntil === 0
                            ? "Today"
                            : daysUntil === 1
                              ? "Tomorrow"
                              : `${daysUntil}d`}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-[var(--text-muted)]">
              No upcoming events or deadlines
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-[var(--border)] bg-[var(--surface-0)] mt-4">
        <CardContent className="p-4">
          <div className="text-xs font-medium mb-2 text-[var(--text-muted)]">Legend</div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[var(--primary)]/20 border border-[var(--primary)]" />
              <span>Active Festival</span>
            </div>
            <div className="flex items-center gap-2">
              <FilmReel className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Festival Start</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-[var(--destructive)]" />
              <span>Deadline</span>
            </div>
            <div className="flex items-center gap-2">
              <Play className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Watch Party</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Meetup/Event</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
