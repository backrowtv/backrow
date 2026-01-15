"use client";

import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Star, ChartBar, Check, Clock } from "@phosphor-icons/react";

interface FestivalProgressIndicatorsProps {
  totalMovies: number;
  watchedCount: number;
  ratedCount: number;
  averageRating: number | null;
}

export function FestivalProgressIndicators({
  totalMovies,
  watchedCount,
  ratedCount,
  averageRating,
}: FestivalProgressIndicatorsProps) {
  const watchedPercent = totalMovies > 0 ? (watchedCount / totalMovies) * 100 : 0;
  const ratedPercent = totalMovies > 0 ? (ratedCount / totalMovies) * 100 : 0;

  const allWatched = watchedCount === totalMovies && totalMovies > 0;
  const allRated = ratedCount === totalMovies && totalMovies > 0;

  return (
    <Card variant="default">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ChartBar className="w-4 h-4" style={{ color: "var(--primary)" }} />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Movies Watched */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">Watched</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {watchedCount} / {totalMovies}
              </span>
              {allWatched ? (
                <Badge variant="primary" size="sm" className="h-5">
                  <Check className="w-3 h-3 mr-0.5" />
                  Done
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm" className="h-5">
                  <Clock className="w-3 h-3 mr-0.5" />
                  {totalMovies - watchedCount} left
                </Badge>
              )}
            </div>
          </div>
          <Progress value={watchedPercent} size="md" variant={allWatched ? "success" : "default"} />
        </div>

        {/* Movies Rated */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">Rated</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {ratedCount} / {totalMovies}
              </span>
              {allRated ? (
                <Badge variant="primary" size="sm" className="h-5">
                  <Check className="w-3 h-3 mr-0.5" />
                  Done
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm" className="h-5">
                  <Clock className="w-3 h-3 mr-0.5" />
                  {totalMovies - ratedCount} left
                </Badge>
              )}
            </div>
          </div>
          <Progress value={ratedPercent} size="md" variant={allRated ? "success" : "default"} />
        </div>

        {/* Average Rating */}
        {averageRating !== null && ratedCount > 0 && (
          <div className="pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-muted)]">Your Average Rating</span>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-current" style={{ color: "var(--primary)" }} />
                <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>
                  {formatRatingDisplay(averageRating)}
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Based on {ratedCount} rating{ratedCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Encouragement message */}
        {!allRated && totalMovies > 0 && (
          <div className="pt-2">
            <p className="text-xs text-[var(--text-muted)] text-center">
              {ratedCount === 0
                ? "Start rating movies to contribute to the festival results!"
                : `Keep going! ${totalMovies - ratedCount} more movie${totalMovies - ratedCount !== 1 ? "s" : ""} to rate.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
