"use client";

import { CalendarBlank, FilmStrip, PencilSimple } from "@phosphor-icons/react";
import { DateDisplay } from "@/components/ui/date-display";
import { ConcludeSeasonButton } from "@/components/seasons/ConcludeSeasonButton";
import { EditSeasonModal } from "@/components/seasons/EditSeasonModal";
import Link from "next/link";

interface Season {
  id: string;
  slug?: string | null;
  name: string;
  subtitle: string | null;
  start_date: string;
  end_date: string;
  festival_count?: number;
}

interface SeasonCardProps {
  season: Season;
  clubId: string;
  clubSlug?: string;
  isActive?: boolean;
  compact?: boolean;
}

export function SeasonCard({
  season,
  clubId,
  clubSlug,
  isActive = false,
  compact = false,
}: SeasonCardProps) {
  // Calculate days remaining for active season
  const endDate = new Date(season.end_date);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (compact) {
    const historyHref = clubSlug ? `/club/${clubSlug}/history?tab=festivals` : undefined;

    const cardContent = (
      <div className="p-3 rounded-lg border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors group">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{season.name}</p>
            <p className="text-xs text-[var(--text-muted)]">
              <DateDisplay date={season.start_date} format="date" /> –{" "}
              <DateDisplay date={season.end_date} format="date" />
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <FilmStrip className="w-3 h-3" />
              <span>{season.festival_count || 0}</span>
            </div>
            <EditSeasonModal
              season={season}
              trigger={
                <button className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)] opacity-0 group-hover:opacity-100">
                  <PencilSimple className="w-3.5 h-3.5" />
                </button>
              }
            />
          </div>
        </div>
      </div>
    );

    if (historyHref) {
      return <Link href={historyHref}>{cardContent}</Link>;
    }
    return cardContent;
  }

  return (
    <div className="p-4 rounded-xl border border-[var(--border)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isActive && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-[var(--text-primary)]">
                Active
              </span>
            )}
            {isActive && daysRemaining > 0 && daysRemaining <= 30 && (
              <span className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
                {daysRemaining}d remaining
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{season.name}</h3>
          {season.subtitle && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{season.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <EditSeasonModal
            season={season}
            trigger={
              <button className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]">
                <PencilSimple className="w-4 h-4" />
              </button>
            }
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] flex-wrap">
          <span className="flex items-center gap-1.5">
            <CalendarBlank className="w-3.5 h-3.5" />
            <DateDisplay date={season.start_date} format="date" /> –{" "}
            <DateDisplay date={season.end_date} format="date" />
          </span>
          <span className="flex items-center gap-1.5">
            <FilmStrip className="w-3.5 h-3.5" />
            {season.festival_count || 0} festival{(season.festival_count || 0) !== 1 ? "s" : ""}
          </span>
        </div>
        {isActive && (
          <div className="flex items-center gap-1">
            <ConcludeSeasonButton clubId={clubId} />
          </div>
        )}
      </div>
    </div>
  );
}
