"use client";

/**
 * Calendar Month View
 *
 * Grid view showing all days of the month with festivals, events, and deadlines.
 */

import { Card, CardContent } from "@/components/ui/card";
import { DAYS } from "./calendarUtils";
import { CalendarDayCell } from "./CalendarDayCell";
import type { CalendarDay, ClubColor } from "./calendarTypes";

interface CalendarMonthViewProps {
  calendarDays: CalendarDay[];
  mode: "global" | "club";
  clubColorMap: Map<string, ClubColor>;
  currentClubSlug?: string;
}

export function CalendarMonthView({
  calendarDays,
  mode,
  clubColorMap,
  currentClubSlug,
}: CalendarMonthViewProps) {
  return (
    <Card className="border-[var(--border)] bg-[var(--surface-0)]">
      <CardContent className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-[var(--text-muted)] py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
          {calendarDays.map((day, index) => (
            <CalendarDayCell
              key={index}
              day={day}
              mode={mode}
              clubColorMap={clubColorMap}
              currentClubSlug={currentClubSlug}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
