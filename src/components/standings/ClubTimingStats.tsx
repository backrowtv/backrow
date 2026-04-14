import { Card, CardContent } from "@/components/ui/card";
import {
  Timer,
  Hourglass,
  Lightning,
  Clock,
  FastForward,
  Rewind,
} from "@phosphor-icons/react/dist/ssr";
import type { ClubAdvancedStats } from "@/app/actions/profile/types";

interface ClubTimingStatsProps {
  stats: ClubAdvancedStats;
}

function formatDays(days: number): string {
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatHours(hours: number): string {
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  if (remaining === 0) return `${days}d`;
  return `${days}d ${remaining}h`;
}

export function ClubTimingStats({ stats }: ClubTimingStatsProps) {
  const hasAny =
    stats.avgFestivalDurationDays != null ||
    stats.avgTimeToFirstNominationHours != null ||
    stats.avgWatchPhaseDays != null ||
    stats.avgRatingTurnaroundDays != null;

  if (!hasAny) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide mb-2">
        Timing
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        {stats.avgFestivalDurationDays != null && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <Timer className="w-4 h-4 text-[var(--text-muted)] mb-1" weight="bold" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {formatDays(stats.avgFestivalDurationDays)}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Avg Duration</p>
            </CardContent>
          </Card>
        )}
        {stats.avgTimeToFirstNominationHours != null && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <Lightning className="w-4 h-4 text-[var(--text-muted)] mb-1" weight="bold" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {formatHours(stats.avgTimeToFirstNominationHours)}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">First Nomination</p>
            </CardContent>
          </Card>
        )}
        {stats.avgWatchPhaseDays != null && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <Hourglass className="w-4 h-4 text-[var(--text-muted)] mb-1" weight="bold" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {formatDays(stats.avgWatchPhaseDays)}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Watch Phase</p>
            </CardContent>
          </Card>
        )}
        {stats.avgRatingTurnaroundDays != null && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <Clock className="w-4 h-4 text-[var(--text-muted)] mb-1" weight="bold" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {formatDays(stats.avgRatingTurnaroundDays)}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Rating Phase</p>
            </CardContent>
          </Card>
        )}
      </div>

      {(stats.fastestFestival || stats.slowestFestival) && (
        <div className="grid grid-cols-2 gap-2">
          {stats.fastestFestival && (
            <Card variant="default">
              <CardContent className="px-3 py-2 flex items-center gap-2.5">
                <FastForward className="w-5 h-5 text-[var(--text-muted)] shrink-0" weight="bold" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                    Fastest
                  </p>
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {stats.fastestFestival.theme}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {formatDays(stats.fastestFestival.days)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.slowestFestival && (
            <Card variant="default">
              <CardContent className="px-3 py-2 flex items-center gap-2.5">
                <Rewind className="w-5 h-5 text-[var(--text-muted)] shrink-0" weight="bold" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                    Slowest
                  </p>
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {stats.slowestFestival.theme}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {formatDays(stats.slowestFestival.days)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
