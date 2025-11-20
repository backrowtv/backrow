"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  FilmReel,
  Star,
  CalendarBlank,
  ArrowRight,
  X,
  CaretDown,
} from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { dismissHint } from "@/app/actions/dismissed-hints";

interface YearWrapStats {
  moviesWatched: number;
  festivalsWon: number;
  topGenres: Array<{ genre: string; count: number }>;
  averageRating: number;
}

interface DismissibleYearWrapProps {
  stats: YearWrapStats;
  year: number;
  error?: string;
  initialDismissed?: boolean;
}

export function DismissibleYearWrap({
  stats,
  year,
  error,
  initialDismissed = false,
}: DismissibleYearWrapProps) {
  const [isDismissed, setIsDismissed] = useState(initialDismissed);
  const [isExpanded, setIsExpanded] = useState(!initialDismissed);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsExpanded(false);
    dismissHint(`year-wrap-${year}`);
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (error) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarBlank className="h-5 w-5" />
            {year} Year in Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text size="sm" style={{ color: "var(--error)" }}>
            {error}
          </Text>
        </CardContent>
      </Card>
    );
  }

  // Collapsed mini card view
  if (isDismissed && !isExpanded) {
    return (
      <button
        onClick={handleExpand}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
          "bg-[var(--surface-1)] hover:bg-[var(--surface-2)]",
          "border border-[var(--border)] hover:border-[var(--primary)]/30",
          "text-left group"
        )}
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
          <CalendarBlank className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">{year} Year in Review</p>
          <p className="text-xs text-[var(--text-muted)]">
            {stats.moviesWatched} movies • {stats.festivalsWon} wins
          </p>
        </div>
        <CaretDown className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
      </button>
    );
  }

  // Full expanded card view
  return (
    <Card variant="default" className="relative">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={cn(
          "absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10",
          "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          "hover:bg-[var(--surface-2)]"
        )}
        aria-label="Dismiss year in review"
      >
        <X className="w-4 h-4" />
      </button>

      <CardHeader className="pr-10">
        <CardTitle className="flex items-center gap-2">
          <CalendarBlank className="h-5 w-5" />
          {year} Year in Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Text size="sm" muted>
            Your {year} movie year at a glance
          </Text>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <FilmReel className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Movies Watched
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                {stats.moviesWatched}
              </Text>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Festivals Won
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                {stats.festivalsWon}
              </Text>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Avg Rating
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                {stats.averageRating > 0 ? formatRatingDisplay(stats.averageRating) : "--"}
              </Text>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <FilmReel className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Top Genres
                </Text>
              </div>
              <Text size="sm">
                {stats.topGenres.length > 0 ? stats.topGenres.map((g) => g.genre).join(", ") : "--"}
              </Text>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/profile/year-in-review-${year}`} className="w-full">
          <Button variant="outline" className="w-full">
            View Full Year in Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
