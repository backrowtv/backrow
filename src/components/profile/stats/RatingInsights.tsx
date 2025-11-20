import { Card, CardContent } from "@/components/ui/card";
import { AnimatedDecimalStat } from "@/components/profile/AnimatedStat";
import Image from "next/image";
import type { UserProfileStats } from "@/app/actions/profile/types";

interface RatingInsightsProps {
  stats: UserProfileStats;
}

function RatingBar({ range, count, max }: { range: string; count: number; max: number }) {
  const widthPercent = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 text-right">{range}</span>
      <div className="flex-1 h-3.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${widthPercent}%`,
            backgroundColor: "var(--primary)",
            opacity: 0.8,
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-[var(--text-muted)] w-6">{count}</span>
    </div>
  );
}

function MovieCard({
  label,
  movie,
}: {
  label: string;
  movie: { title: string; tmdbId: number; posterPath?: string; rating: number } | null;
}) {
  if (!movie) return null;
  return (
    <div className="flex items-center gap-2.5">
      {movie.posterPath ? (
        <Image
          src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
          alt={movie.title}
          width={32}
          height={48}
          className="rounded aspect-[2/3] object-cover"
        />
      ) : (
        <div className="w-8 h-12 rounded bg-[var(--surface-2)] flex items-center justify-center">
          <span className="text-[10px] text-[var(--text-muted)]">?</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{movie.title}</p>
      </div>
    </div>
  );
}

export function RatingInsights({ stats }: RatingInsightsProps) {
  const maxCount = Math.max(...stats.ratingDistribution.map((d) => d.count), 1);

  return (
    <section className="border-t border-[var(--border)] pt-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        Rating Insights
      </h2>

      {/* Rating averages */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card variant="default">
          <CardContent className="px-3 py-2 text-center">
            <div className="text-xl font-bold text-[var(--text-primary)]">
              <AnimatedDecimalStat value={stats.averageRatingGiven} decimals={1} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Avg Given</p>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="px-3 py-2 text-center">
            <div className="text-xl font-bold text-[var(--text-primary)]">
              <AnimatedDecimalStat value={stats.averageRatingReceived} decimals={1} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Avg Received</p>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="px-3 py-2 text-center">
            <div className="text-xl font-bold text-[var(--text-primary)]">
              {stats.ratingsGiven.toLocaleString()}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Ratings Given</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating distribution */}
      <Card variant="default" className="mb-3">
        <CardContent className="px-3 py-2.5">
          <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Rating Distribution</p>
          <div className="space-y-1">
            {stats.ratingDistribution.map((d) => (
              <RatingBar key={d.range} range={d.range} count={d.count} max={maxCount} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Highest / Lowest rated movies */}
      {(stats.highestRatedMovie || stats.lowestRatedMovie) && (
        <div className="grid grid-cols-2 gap-2">
          {stats.highestRatedMovie && (
            <Card variant="default">
              <CardContent className="px-3 py-2.5">
                <MovieCard label="Highest Rated" movie={stats.highestRatedMovie} />
              </CardContent>
            </Card>
          )}
          {stats.lowestRatedMovie && (
            <Card variant="default">
              <CardContent className="px-3 py-2.5">
                <MovieCard label="Lowest Rated" movie={stats.lowestRatedMovie} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
