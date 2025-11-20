import { Card, CardContent } from "@/components/ui/card";
import { Medal, Target, TrendUp } from "@phosphor-icons/react/dist/ssr";
import type { UserProfileStats } from "@/app/actions/profile/types";

interface FestivalPerformanceProps {
  stats: UserProfileStats;
}

function PodiumBadge({ place, count, color }: { place: string; count: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: color, color: "var(--background)" }}
      >
        {count}
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">{place}</span>
    </div>
  );
}

export function FestivalPerformance({ stats }: FestivalPerformanceProps) {
  const winRatePercent = Math.round(stats.winRate * 100);
  const guessingPercent =
    stats.guessingAccuracy.total > 0
      ? Math.round((stats.guessingAccuracy.correct / stats.guessingAccuracy.total) * 100)
      : 0;

  return (
    <section className="border-t border-[var(--border)] pt-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        Festival Performance
      </h2>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Win Rate */}
        <Card variant="default" className="min-w-0 overflow-hidden">
          <CardContent className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" weight="bold" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                Win Rate
              </span>
            </div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{winRatePercent}%</div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {stats.festivalsWon}/{stats.festivalsPlayed}
            </p>
          </CardContent>
        </Card>

        {/* Guessing Accuracy */}
        <Card variant="default" className="min-w-0 overflow-hidden">
          <CardContent className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-4 h-4 text-[var(--text-muted)] shrink-0" weight="bold" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                Guessing
              </span>
            </div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{guessingPercent}%</div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {stats.guessingAccuracy.correct}/{stats.guessingAccuracy.total}
            </p>
          </CardContent>
        </Card>

        {/* Podium Finishes */}
        <Card variant="default" className="col-span-2 min-w-0 overflow-hidden">
          <CardContent className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Medal className="w-4 h-4 text-[var(--text-muted)] shrink-0" weight="bold" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                Podium
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <PodiumBadge place="2nd" count={stats.podiumFinishes.second} color="#94a3b8" />
              <PodiumBadge place="1st" count={stats.podiumFinishes.first} color="#eab308" />
              <PodiumBadge place="3rd" count={stats.podiumFinishes.third} color="#cd7c32" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hot Streak */}
      {stats.hotStreak > 1 && (
        <Card variant="default">
          <CardContent className="px-3 py-2 flex items-center gap-2.5">
            <span className="text-base">🔥</span>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {stats.hotStreak} Win Streak
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">Longest consecutive wins</p>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
