import { Card, CardContent } from "@/components/ui/card";
import { Timer, Lightning, Clock, Eye } from "@phosphor-icons/react/dist/ssr";
import type { UserProfileStats } from "@/app/actions/profile/types";

interface TimingStatsProps {
  stats: UserProfileStats;
}

function formatHours(hours: number): string {
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  if (remaining === 0) return `${days}d`;
  return `${days}d ${remaining}h`;
}

export function TimingStats({ stats }: TimingStatsProps) {
  const hasAnyTiming =
    stats.avgTimeToNominateHours != null ||
    stats.avgTimeToRateHours != null ||
    stats.earlyBirdPercent != null ||
    stats.avgWatchTimeHours != null;

  if (!hasAnyTiming) return null;

  const items: { icon: typeof Timer; label: string; value: string; sub: string }[] = [];
  if (stats.avgTimeToNominateHours != null)
    items.push({
      icon: Timer,
      label: "Avg Time to Nominate",
      value: formatHours(stats.avgTimeToNominateHours),
      sub: "From festival start",
    });
  if (stats.avgTimeToRateHours != null)
    items.push({
      icon: Clock,
      label: "Avg Time to Rate",
      value: formatHours(stats.avgTimeToRateHours),
      sub: "After watch deadline",
    });
  if (stats.earlyBirdPercent != null)
    items.push({
      icon: Lightning,
      label: "Early Bird Score",
      value: `${stats.earlyBirdPercent}%`,
      sub: "Nominated in first half",
    });
  if (stats.avgWatchTimeHours != null)
    items.push({
      icon: Eye,
      label: "Speed Watcher",
      value: formatHours(stats.avgWatchTimeHours),
      sub: "Nomination to watch",
    });

  return (
    <section className="border-t border-[var(--border)] pt-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        Timing
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} variant="default">
              <CardContent className="px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-4 h-4 text-[var(--text-muted)]" weight="bold" />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium truncate">
                    {item.label}
                  </span>
                </div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{item.value}</div>
                <p className="text-[10px] text-[var(--text-muted)]">{item.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
