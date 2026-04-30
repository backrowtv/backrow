"use client";

import { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StandingsTable } from "./StandingsTable";
import { getSeasonStandings } from "@/app/actions/standings";
import type { StandingsEntry } from "@/app/actions/standings.types";
import { CircleNotch } from "@phosphor-icons/react";

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface LeaderboardCardProps {
  title: string;
  entries: StandingsEntry[];
  currentUserId?: string;
  // Season selection props (only for season leaderboard)
  seasons?: Season[];
  clubId?: string;
  initialSeasonId?: string;
}

export function LeaderboardCard({
  title,
  entries: initialEntries,
  currentUserId,
  seasons,
  clubId,
  initialSeasonId,
}: LeaderboardCardProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId || "");
  const [fetchedEntries, setFetchedEntries] = useState<StandingsEntry[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const prevInitialEntriesRef = useRef(initialEntries);

  const hasSeasonSelector = seasons && seasons.length > 0 && clubId;

  // Reset fetched entries when initial entries change (prop-driven update)
  if (prevInitialEntriesRef.current !== initialEntries) {
    prevInitialEntriesRef.current = initialEntries;
    // If showing initial season, clear any fetched data so we use the new initial entries
    if (!hasSeasonSelector || selectedSeasonId === initialSeasonId) {
      setFetchedEntries(null);
    }
  }

  // Derive current entries - use fetched entries if available and not on initial season
  const entries = useMemo(() => {
    if (hasSeasonSelector && selectedSeasonId !== initialSeasonId && fetchedEntries) {
      return fetchedEntries;
    }
    return initialEntries;
  }, [hasSeasonSelector, selectedSeasonId, initialSeasonId, fetchedEntries, initialEntries]);

  // Fetch data when season changes
  useEffect(() => {
    if (!hasSeasonSelector || !selectedSeasonId || selectedSeasonId === initialSeasonId) {
      return;
    }

    startTransition(async () => {
      const result = await getSeasonStandings(clubId, selectedSeasonId);
      if (result.data) {
        setFetchedEntries(result.data);
      }
    });
  }, [selectedSeasonId, clubId, hasSeasonSelector, initialSeasonId]);

  const formatSeasonDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const isActiveSeason = (season: Season) => {
    const now = new Date();
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    return start <= now && end >= now;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <CardTitle className="text-base flex-1 min-w-0 truncate">{title}</CardTitle>

          {hasSeasonSelector && (
            <div className="relative flex-shrink-0 min-w-0 max-w-[170px]">
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                disabled={isPending}
                className="appearance-none bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 pr-8 text-sm text-[var(--text-primary)] cursor-pointer hover:border-[var(--border-hover)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-[170px] truncate text-ellipsis overflow-hidden"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id} suppressHydrationWarning>
                    {season.name}
                    {isActiveSeason(season)
                      ? " (Active)"
                      : ` (${formatSeasonDate(season.start_date)})`}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                {isPending ? (
                  <CircleNotch className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
                ) : (
                  <svg
                    className="w-4 h-4 text-[var(--text-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-0">
        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <CircleNotch className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : (
          <StandingsTable entries={entries} currentUserId={currentUserId} />
        )}
      </CardContent>
    </Card>
  );
}
