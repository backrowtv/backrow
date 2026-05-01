"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { DateDisplay } from "@/components/ui/date-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, Users, CaretRight, Crown, Medal, FilmReel } from "@phosphor-icons/react";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

interface FestivalResult {
  id: string;
  festival_id: string;
  festival_slug: string | null;
  festival_theme: string;
  club_id: string;
  club_slug: string | null;
  club_name: string;
  club_picture_url: string | null;
  rank: number;
  total_nominations: number;
  average_rating: number;
  rating_count: number;
  points_earned: number;
  results_date: string;
  nominator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface MovieFestivalHistoryProps {
  tmdbId: number;
  movieTitle: string;
  results?: FestivalResult[];
  isLoading?: boolean;
  showEmpty?: boolean;
}

// Rank display helper
function getRankDisplay(rank: number, total: number) {
  if (rank === 1) {
    return {
      icon: Crown,
      label: "🏆 Winner",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/30",
    };
  }
  if (rank === 2) {
    return {
      icon: Medal,
      label: "🥈 Runner-up",
      color: "text-[var(--text-secondary)]",
      bgColor: "bg-[var(--surface-2)]",
      borderColor: "border-gray-400/30",
    };
  }
  if (rank === 3) {
    return {
      icon: Medal,
      label: "🥉 Third Place",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/30",
    };
  }
  return {
    icon: Star,
    label: `#${rank} of ${total}`,
    color: "text-[var(--text-muted)]",
    bgColor: "bg-[var(--surface-1)]",
    borderColor: "border-[var(--border)]",
  };
}

// Single festival result card
function FestivalResultCard({ result }: { result: FestivalResult }) {
  const [nominatorPopupOpen, setNominatorPopupOpen] = useState(false);
  const rankDisplay = getRankDisplay(result.rank, result.total_nominations);
  const RankIcon = rankDisplay.icon;
  const festivalUrl = `/club/${result.club_slug || result.club_id}/festival/${result.festival_slug || result.festival_id}`;
  const clubUrl = `/club/${result.club_slug || result.club_id}`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className={`bg-[var(--surface-1)] border-2 ${rankDisplay.borderColor} hover:border-opacity-60 transition-all`}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Rank badge */}
              <div
                className={`shrink-0 w-12 h-12 rounded-full ${rankDisplay.bgColor} flex items-center justify-center`}
              >
                {result.rank <= 3 ? (
                  <RankIcon className={`w-6 h-6 ${rankDisplay.color}`} />
                ) : (
                  <span className={`text-lg font-bold ${rankDisplay.color}`}>{result.rank}</span>
                )}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Festival & Club info */}
                <div className="flex items-center gap-2 mb-2">
                  <Link
                    href={clubUrl}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <EntityAvatar
                      entity={clubToAvatarData({
                        name: result.club_name,
                        slug: result.club_slug,
                        picture_url: result.club_picture_url,
                      })}
                      emojiSet="club"
                      size="tiny"
                    />
                    <span className="text-sm text-[var(--text-muted)]">{result.club_name}</span>
                  </Link>
                </div>

                {/* Festival theme */}
                <Link href={festivalUrl} className="group">
                  <h4 className="font-semibold text-white group-hover:opacity-80 transition-colors line-clamp-1">
                    {result.festival_theme}
                  </h4>
                </Link>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                  <Badge className={`${rankDisplay.bgColor} ${rankDisplay.color} border-0`}>
                    {rankDisplay.label}
                  </Badge>
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    {formatRatingDisplay(result.average_rating)}
                  </span>
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Users className="w-3.5 h-3.5" />
                    {result.rating_count} ratings
                  </span>
                  {result.points_earned > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      +{result.points_earned.toFixed(1)} pts
                    </span>
                  )}
                </div>

                {/* Nominator */}
                {result.nominator && (
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Nominated by{" "}
                    <button
                      onClick={() => setNominatorPopupOpen(true)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {result.nominator.display_name}
                    </button>
                  </p>
                )}
              </div>

              {/* Date & actions */}
              <div className="shrink-0 text-right">
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  <DateDisplay date={result.results_date} format="date" />
                </p>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={festivalUrl}>
                    <span className="sr-only">View festival</span>
                    <CaretRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      {result.nominator && (
        <UserPopupModal
          userId={result.nominator.id}
          open={nominatorPopupOpen}
          onOpenChange={setNominatorPopupOpen}
        />
      )}
    </>
  );
}

// Loading skeleton
function FestivalResultSkeleton() {
  return (
    <Card className="bg-[var(--surface-1)] border-0">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MovieFestivalHistory({
  tmdbId: _tmdbId,
  movieTitle,
  results = [],
  isLoading = false,
  showEmpty = true,
}: MovieFestivalHistoryProps) {
  // Stats calculations
  const totalFestivals = results.length;
  const wins = results.filter((r) => r.rank === 1).length;
  const podiums = results.filter((r) => r.rank <= 3).length;
  const avgRating =
    totalFestivals > 0 ? results.reduce((sum, r) => sum + r.average_rating, 0) / totalFestivals : 0;
  const totalPoints = results.reduce((sum, r) => sum + r.points_earned, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
        </div>
        <FestivalResultSkeleton />
      </div>
    );
  }

  if (results.length === 0) {
    if (!showEmpty) return null;

    return (
      <EmptyState
        icon={FilmReel}
        title="No festival history"
        message="This movie hasn't been nominated in any of your clubs' festivals yet."
        variant="inline"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Festival History
          </h3>
          <p className="text-sm text-[var(--text-muted)]">How this movie performed in your clubs</p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center px-3 py-1 rounded-lg bg-[var(--surface-1)]">
            <p className="text-yellow-400 font-bold">{wins}</p>
            <p className="text-[var(--text-muted)] text-xs">Wins</p>
          </div>
          <div className="text-center px-3 py-1 rounded-lg bg-[var(--surface-1)]">
            <p className="text-orange-400 font-bold">{podiums}</p>
            <p className="text-[var(--text-muted)] text-xs">Podiums</p>
          </div>
          <div className="text-center px-3 py-1 rounded-lg bg-[var(--surface-1)]">
            <p className="text-white font-bold">{formatRatingDisplay(avgRating)}</p>
            <p className="text-[var(--text-muted)] text-xs">Avg Rating</p>
          </div>
          {totalPoints > 0 && (
            <div className="text-center px-3 py-1 rounded-lg bg-[var(--surface-1)]">
              <p className="text-emerald-400 font-bold">+{totalPoints.toFixed(1)}</p>
              <p className="text-[var(--text-muted)] text-xs">Points</p>
            </div>
          )}
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {results.map((result, _index) => (
            <FestivalResultCard key={result.id} result={result} />
          ))}
        </AnimatePresence>
      </div>

      {/* Summary card */}
      {totalFestivals > 1 && (
        <Card className="bg-[var(--surface-2)] border-[var(--border)]">
          <CardContent className="p-4">
            <p className="text-sm text-center">
              <span className="text-white font-semibold">{movieTitle}</span> has been in{" "}
              <span className="font-semibold">{totalFestivals} festivals</span>
              {wins > 0 && (
                <>
                  {" "}
                  and won{" "}
                  <span className="text-yellow-400 font-semibold">
                    {wins} time{wins !== 1 ? "s" : ""}
                  </span>
                </>
              )}
              !
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Server action to get movie festival history
export async function getMovieFestivalHistory(
  _tmdbId: number,
  _userId: string
): Promise<FestivalResult[]> {
  // This would be implemented as a server action
  // For now, return empty array - actual implementation would query:
  // - nominations table for this tmdb_id
  // - join with festivals, clubs for context
  // - join with festival_results for rankings
  // - filter by clubs the user is a member of
  return [];
}
