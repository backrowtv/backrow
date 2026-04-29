"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, FilmReel } from "@phosphor-icons/react";
import { DateDisplay } from "@/components/ui/date-display";

export interface FestivalWinner {
  festivalId: string;
  festivalSlug: string | null;
  festivalTheme: string;
  resultsDate: string | null;
  winner: {
    userId: string;
    userName: string;
    avatarUrl: string | null;
  };
  winningMovie: {
    tmdbId: number | null;
    title: string | null;
    posterPath: string | null;
    averageRating: number;
  } | null;
}

interface FestivalWinnersListProps {
  winners: FestivalWinner[];
  clubSlug: string;
  initialCount?: number;
}

const DEFAULT_INITIAL_COUNT = 5;

export function FestivalWinnersList({
  winners,
  clubSlug,
  initialCount = DEFAULT_INITIAL_COUNT,
}: FestivalWinnersListProps) {
  const [showAll, setShowAll] = useState(false);
  const total = winners.length;
  const visibleCount = showAll ? total : Math.min(initialCount, total);
  const visibleWinners = winners.slice(0, visibleCount);
  const remaining = total - initialCount;

  return (
    <div className="space-y-2">
      {visibleWinners.map((winner) => (
        <WinnerCard key={winner.festivalId} winner={winner} clubSlug={clubSlug} />
      ))}
      {total > initialCount && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full text-center text-xs font-medium py-2 px-4 rounded-md bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors text-[var(--text-secondary)]"
        >
          {showAll ? "Show fewer" : `Show all ${total} winners (${remaining} more)`}
        </button>
      )}
    </div>
  );
}

function WinnerCard({ winner, clubSlug }: { winner: FestivalWinner; clubSlug: string }) {
  const festivalLink = `/club/${clubSlug}/festival/${winner.festivalSlug || winner.festivalId}`;
  const posterUrl = winner.winningMovie?.posterPath || null;

  return (
    <Link href={festivalLink} className="block group">
      <div className="flex gap-4 p-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
        {posterUrl ? (
          <div className="relative w-14 flex-shrink-0 rounded overflow-hidden bg-[var(--surface-2)] aspect-[2/3]">
            <Image
              src={posterUrl}
              alt={winner.winningMovie?.title || "Movie"}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        ) : (
          <div className="w-14 flex-shrink-0 rounded bg-[var(--surface-2)] flex items-center justify-center aspect-[2/3]">
            <FilmReel className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                {winner.festivalTheme}
              </h3>
              {winner.resultsDate && (
                <p className="text-xs text-[var(--text-muted)]">
                  <DateDisplay date={winner.resultsDate} format="date" />
                </p>
              )}
            </div>
            {winner.winningMovie && (
              <div className="text-right flex-shrink-0">
                <div
                  className="text-base font-bold"
                  style={{ color: "var(--club-accent, var(--primary))" }}
                >
                  {winner.winningMovie.averageRating.toFixed(1)}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">avg rating</div>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-secondary)]">{winner.winner.userName}</span>
            {winner.winningMovie?.title && (
              <>
                <span className="text-xs text-[var(--text-muted)]">·</span>
                <span className="text-xs text-[var(--text-muted)] truncate">
                  {winner.winningMovie.title}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
