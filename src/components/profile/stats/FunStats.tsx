import { Card, CardContent } from "@/components/ui/card";
import {
  FilmReel,
  Calendar,
  Heartbeat,
  Crown,
  GameController,
  Star,
  Scales,
  Compass,
  FilmSlate,
  Rewind,
  FastForward,
  Hash,
} from "@phosphor-icons/react/dist/ssr";
import type { UserProfileStats } from "@/app/actions/profile/types";

interface FunStatsProps {
  stats: UserProfileStats;
}

function formatWatchTime(minutes: number): string {
  if (minutes <= 0) return "0h";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function StatRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof FilmReel;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card variant="default" className="min-w-0 overflow-hidden">
      <CardContent className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" weight="bold" />
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
            {label}
          </span>
        </div>
        <div className="text-lg font-bold text-[var(--text-primary)] break-words">{value}</div>
        {sub && <p className="text-[10px] text-[var(--text-muted)]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function FunStats({ stats }: FunStatsProps) {
  const items: {
    icon: typeof FilmReel;
    label: string;
    value: string;
    sub?: string;
  }[] = [];

  // Total watch time
  if (stats.totalWatchTimeMinutes > 0) {
    items.push({
      icon: FilmReel,
      label: "Total Watch Time",
      value: formatWatchTime(stats.totalWatchTimeMinutes),
      sub: `${Math.round(stats.totalWatchTimeMinutes / 60)} hours of movies`,
    });
  }

  // Crowd pleaser
  if (stats.crowdPleasePercent != null) {
    items.push({
      icon: Crown,
      label: "Crowd Pleaser",
      value: `${stats.crowdPleasePercent}%`,
      sub: "Noms above festival avg",
    });
  }

  // Rating consistency
  if (stats.ratingConsistency != null) {
    const label =
      stats.ratingConsistency < 1.5
        ? "Very consistent"
        : stats.ratingConsistency < 2.5
          ? "Moderate spread"
          : "All over the place";
    items.push({
      icon: Scales,
      label: "Rating Spread",
      value: stats.ratingConsistency.toFixed(1),
      sub: label,
    });
  }

  // Perfect scores
  if (stats.perfectScores > 0) {
    items.push({
      icon: Star,
      label: "Perfect 10s Given",
      value: String(stats.perfectScores),
    });
  }

  // Highest rating given
  if (stats.highestRatingGiven != null) {
    items.push({
      icon: Star,
      label: "Highest Given",
      value: stats.highestRatingGiven.toFixed(1),
    });
  }

  // Lowest rating given
  if (stats.lowestRatingGiven != null) {
    items.push({
      icon: Scales,
      label: "Harshest Rating",
      value: stats.lowestRatingGiven.toFixed(1),
    });
  }

  // Average movie year
  if (stats.averageMovieYear) {
    items.push({
      icon: Calendar,
      label: "Avg Movie Year",
      value: String(stats.averageMovieYear),
      sub:
        stats.averageMovieYear < 1990
          ? "Classic film lover"
          : stats.averageMovieYear < 2010
            ? "Mix of old and new"
            : "Modern cinema fan",
    });
  }

  // Favorite decade
  if (stats.favoriteDecade) {
    items.push({
      icon: Rewind,
      label: "Favorite Decade",
      value: stats.favoriteDecade,
    });
  }

  // Genre loyalty
  if (stats.genreLoyalty) {
    items.push({
      icon: Heartbeat,
      label: "Genre Loyalty",
      value: stats.genreLoyalty.genre,
      sub: `${stats.genreLoyalty.percent}% of nominations`,
    });
  }

  // Unique genres explored
  if (stats.uniqueGenresExplored > 0) {
    items.push({
      icon: Compass,
      label: "Genres Explored",
      value: String(stats.uniqueGenresExplored),
      sub: stats.uniqueGenresExplored >= 10 ? "True cinephile range" : "Room to explore",
    });
  }

  // Avg nominations per festival
  if (stats.avgNominationsPerFestival != null) {
    items.push({
      icon: FilmSlate,
      label: "Noms Per Festival",
      value: String(stats.avgNominationsPerFestival),
    });
  }

  // Participation rate
  if (stats.participationRate != null) {
    items.push({
      icon: GameController,
      label: "Participation Rate",
      value: `${stats.participationRate}%`,
      sub: "Of available festivals",
    });
  }

  // Movies from this year
  if (stats.moviesFromThisYear > 0) {
    items.push({
      icon: FastForward,
      label: `${new Date().getFullYear()} Releases`,
      value: String(stats.moviesFromThisYear),
      sub: "Keeping current",
    });
  }

  // Movies from before 1980
  if (stats.moviesFromBefore1980 > 0) {
    items.push({
      icon: Rewind,
      label: "Pre-1980 Classics",
      value: String(stats.moviesFromBefore1980),
    });
  }

  // Avg nominations per festival
  if (stats.hotStreak > 1) {
    items.push({
      icon: Hash,
      label: "Win Streak",
      value: String(stats.hotStreak),
      sub: "Consecutive festival wins",
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="border-t border-[var(--border)] pt-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        Fun Stats
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item) => (
          <StatRow key={item.label} {...item} />
        ))}
      </div>

      {/* Movie length extremes */}
      {(stats.longestMovie || stats.shortestMovie) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {stats.longestMovie && (
            <Card variant="default" className="min-w-0 overflow-hidden">
              <CardContent className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-0.5">
                  Longest Movie
                </p>
                <p className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2">
                  {stats.longestMovie.title}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {stats.longestMovie.runtime} min
                </p>
              </CardContent>
            </Card>
          )}
          {stats.shortestMovie && (
            <Card variant="default" className="min-w-0 overflow-hidden">
              <CardContent className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-0.5">
                  Shortest Movie
                </p>
                <p className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2">
                  {stats.shortestMovie.title}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {stats.shortestMovie.runtime} min
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
