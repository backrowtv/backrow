"use client";

/**
 * Calendar Header
 *
 * Month navigation, view toggle, and club filter controls.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaretLeft, CaretRight, Funnel } from "@phosphor-icons/react/dist/ssr";
import { MONTHS } from "./calendarUtils";
import type { Club } from "./calendarTypes";

interface CalendarHeaderProps {
  currentMonth: number;
  currentYear: number;
  view: "month" | "timeline";
  mode: "global" | "club";
  clubs: Club[];
  selectedClubId: string;
  onNavigateMonth: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
  onViewChange: (view: "month" | "timeline") => void;
  onClubChange: (clubId: string) => void;
}

export function CalendarHeader({
  currentMonth,
  currentYear,
  view,
  mode,
  clubs,
  selectedClubId,
  onNavigateMonth,
  onGoToToday,
  onViewChange,
  onClubChange,
}: CalendarHeaderProps) {
  return (
    <Card className="border-[var(--border)] bg-[var(--surface-0)]">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onNavigateMonth("prev")}>
                <CaretLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onGoToToday} className="text-xs">
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onNavigateMonth("next")}>
                <CaretRight className="w-4 h-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Club Filter (Global Mode Only) */}
            {mode === "global" && clubs.length > 1 && (
              <div className="flex items-center gap-2">
                <Funnel className="w-3 h-3 text-[var(--text-muted)]" />
                <select
                  value={selectedClubId}
                  onChange={(e) => onClubChange(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 pr-6 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.25rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.25rem 1.25rem",
                  }}
                >
                  <option value="all">All Clubs</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-[var(--surface-1)] rounded-lg p-1">
              <Button
                variant={view === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onViewChange("month")}
                className="text-xs h-7"
              >
                Month
              </Button>
              <Button
                variant={view === "timeline" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onViewChange("timeline")}
                className="text-xs h-7"
              >
                Timeline
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
