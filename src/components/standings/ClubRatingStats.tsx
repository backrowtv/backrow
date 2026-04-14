import { Card, CardContent } from "@/components/ui/card";
import type { ClubAdvancedStats } from "@/app/actions/profile/types";

interface ClubRatingStatsProps {
  stats: ClubAdvancedStats;
  ratingDistribution?: { range: string; count: number }[];
  topRatedMovies?: { title: string; avgRating: number; ratingCount: number }[];
}

function RatingBar({ range, count, max }: { range: string; count: number; max: number }) {
  const widthPercent = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 text-right">{range}</span>
      <div className="flex-1 h-3.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${widthPercent}%`,
            backgroundColor: "var(--club-accent, var(--primary))",
            opacity: 0.8,
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-[var(--text-muted)] w-6">{count}</span>
    </div>
  );
}

export function ClubRatingStats({
  stats,
  ratingDistribution,
  topRatedMovies,
}: ClubRatingStatsProps) {
  const hasConsensus = stats.ratingConsensusScore != null;
  const hasControversial = stats.mostControversialMovie != null;
  const hasUnanimous = stats.mostUnanimousMovie != null;
  const hasDist = ratingDistribution && ratingDistribution.length > 0;
  const hasTopMovies = topRatedMovies && topRatedMovies.length > 0;

  if (!hasConsensus && !hasControversial && !hasUnanimous && !hasDist && !hasTopMovies) return null;

  const maxDistCount = hasDist ? Math.max(...ratingDistribution.map((d) => d.count), 1) : 1;

  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide mb-2">
        Rating Analytics
      </h2>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {hasConsensus && (
          <Card variant="default">
            <CardContent className="px-3 py-2 text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {stats.ratingConsensusScore!.toFixed(1)}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Avg Disagreement</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {stats.ratingConsensusScore! < 1.5
                  ? "Aligned"
                  : stats.ratingConsensusScore! < 2.5
                    ? "Mixed"
                    : "Divided"}
              </p>
            </CardContent>
          </Card>
        )}
        {hasControversial && (
          <Card variant="default">
            <CardContent className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-0.5">
                Most Controversial
              </p>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {stats.mostControversialMovie!.title}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {stats.mostControversialMovie!.avgRating.toFixed(1)} avg,{" "}
                {stats.mostControversialMovie!.stdDev.toFixed(1)} spread
              </p>
            </CardContent>
          </Card>
        )}
        {hasUnanimous && (
          <Card variant="default">
            <CardContent className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-0.5">
                Most Unanimous
              </p>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {stats.mostUnanimousMovie!.title}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {stats.mostUnanimousMovie!.avgRating.toFixed(1)} avg,{" "}
                {stats.mostUnanimousMovie!.stdDev.toFixed(1)} spread
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {hasDist && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <p className="text-xs font-medium text-[var(--text-primary)] mb-2">
                Rating Distribution
              </p>
              <div className="space-y-1">
                {ratingDistribution.map((d) => (
                  <RatingBar key={d.range} range={d.range} count={d.count} max={maxDistCount} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {hasTopMovies && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <p className="text-xs font-medium text-[var(--text-primary)] mb-2">
                Top Rated Movies
              </p>
              <div className="space-y-1.5">
                {topRatedMovies.slice(0, 5).map((m, i) => (
                  <div key={m.title} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] w-4 text-right shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs text-[var(--text-primary)] truncate">{m.title}</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] shrink-0">
                      {m.avgRating.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
