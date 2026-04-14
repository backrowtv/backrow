"use client";

/**
 * Calendar Timeline View
 *
 * Horizontal timeline view showing festival spans across the month.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate, getFestivalEndDate, getTimelinePosition } from "./calendarUtils";
import type { Festival, TimelineData, ClubColor } from "./calendarTypes";

interface CalendarTimelineViewProps {
  timelineData: TimelineData;
  currentMonth: number;
  currentYear: number;
  mode: "global" | "club";
  clubColorMap: Map<string, ClubColor>;
  currentClubSlug?: string;
}

export function CalendarTimelineView({
  timelineData,
  currentMonth,
  currentYear,
  mode,
  clubColorMap,
  currentClubSlug,
}: CalendarTimelineViewProps) {
  const getClubLink = (festival: Festival) => {
    const clubSlug = festival.club?.slug || currentClubSlug;
    return clubSlug ? `/club/${clubSlug}/festival/${festival.slug}` : "#";
  };

  return (
    <Card className="border-[var(--border)] bg-[var(--surface-0)]">
      <CardContent className="p-4">
        {/* Timeline Header */}
        <div className="flex mb-4">
          <div className="w-32 shrink-0" />
          <div className="flex-1 flex">
            {Array.from({ length: timelineData.daysInMonth }, (_, i) => {
              const isToday =
                i + 1 === new Date().getDate() &&
                currentMonth === new Date().getMonth() &&
                currentYear === new Date().getFullYear();
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 text-center text-[10px] py-1 border-l border-[var(--border)]",
                    isToday &&
                      "bg-[var(--surface-3)] font-bold text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                  )}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Festival Timeline Rows */}
        {timelineData.festivals.length > 0 ? (
          <div className="space-y-2">
            {timelineData.festivals.map((festival) => {
              const startDate = new Date(festival.start_date!);
              const endDate = getFestivalEndDate(festival);
              const clubColor = clubColorMap.get(festival.club_id);

              const startPos = getTimelinePosition(
                startDate,
                timelineData.startOfMonth,
                timelineData.daysInMonth
              );
              const endPos = getTimelinePosition(
                endDate,
                timelineData.startOfMonth,
                timelineData.daysInMonth
              );
              const width = Math.max(endPos - startPos, 3);

              return (
                <div key={festival.id} className="flex items-center">
                  <div className="w-32 shrink-0 pr-2">
                    <div className="text-xs font-medium truncate">
                      {festival.theme || "Festival"}
                    </div>
                    {mode === "global" && festival.club && (
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {festival.club.name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 h-8 relative bg-[var(--surface-1)] rounded">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={getClubLink(festival)}>
                            <div
                              className={cn(
                                "absolute h-6 top-1 rounded border-2 cursor-pointer transition-all hover:brightness-110",
                                clubColor?.bg || "bg-[var(--primary)]/20",
                                clubColor?.border || "border-[var(--primary)]"
                              )}
                              style={{
                                left: `${startPos}%`,
                                width: `${width}%`,
                              }}
                            >
                              <span
                                className={cn(
                                  "text-[10px] px-1 truncate",
                                  clubColor?.text || "text-[var(--primary)]"
                                )}
                              >
                                {festival.theme}
                              </span>
                            </div>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <div className="font-semibold">{festival.theme || "Festival"}</div>
                            <Badge variant="secondary" className="text-[10px] mt-1">
                              {festival.phase}
                            </Badge>
                            <div className="text-xs mt-1 text-[var(--text-muted)]">
                              {formatDate(startDate)} - {formatDate(endDate)}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-[var(--text-muted)]">
            No festivals this month
          </div>
        )}
      </CardContent>
    </Card>
  );
}
