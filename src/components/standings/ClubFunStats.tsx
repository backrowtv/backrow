import { Card, CardContent } from "@/components/ui/card";
import {
  Crown,
  Scales,
  Heart,
  Target,
  Lightning,
  CalendarBlank,
  Smiley,
  CheckCircle,
  Fire,
} from "@phosphor-icons/react/dist/ssr";
import type { ClubAdvancedStats } from "@/app/actions/profile/types";

interface ClubFunStatsProps {
  stats: ClubAdvancedStats;
}

export function ClubFunStats({ stats }: ClubFunStatsProps) {
  const items: {
    icon: typeof Crown;
    label: string;
    name: string;
    detail: string;
  }[] = [];

  if (stats.biggestCrowdPleaser) {
    items.push({
      icon: Crown,
      label: "Crowd Pleaser",
      name: stats.biggestCrowdPleaser.name,
      detail: `${stats.biggestCrowdPleaser.avgRating.toFixed(1)} avg nom rating`,
    });
  }

  if (stats.boldChoices) {
    items.push({
      icon: Smiley,
      label: "Bold Choices",
      name: stats.boldChoices.name,
      detail: `${stats.boldChoices.avgRating.toFixed(1)} avg received`,
    });
  }

  if (stats.toughestCritic) {
    items.push({
      icon: Scales,
      label: "Harshest Critic",
      name: stats.toughestCritic.name,
      detail: `${stats.toughestCritic.avgRating.toFixed(1)} avg given`,
    });
  }

  if (stats.mostGenerousRater) {
    items.push({
      icon: Heart,
      label: "Most Generous",
      name: stats.mostGenerousRater.name,
      detail: `${stats.mostGenerousRater.avgRating.toFixed(1)} avg given`,
    });
  }

  if (stats.completionist) {
    items.push({
      icon: CheckCircle,
      label: "Completionist",
      name: stats.completionist.name,
      detail: `${stats.completionist.percent}% completion`,
    });
  }

  if (stats.bestGuesser) {
    items.push({
      icon: Target,
      label: "Guess Master",
      name: stats.bestGuesser.name,
      detail: `${stats.bestGuesser.accuracy}% accuracy`,
    });
  }

  if (stats.bombshell) {
    items.push({
      icon: Fire,
      label: "Bombshell",
      name: stats.bombshell.name,
      detail: `${stats.bombshell.count} perfect 10s received`,
    });
  }

  if (stats.nominationSpeedDemon) {
    items.push({
      icon: Lightning,
      label: "Speed Nominator",
      name: stats.nominationSpeedDemon.name,
      detail: `${stats.nominationSpeedDemon.avgHours}h avg`,
    });
  }

  if (stats.busiestMonth) {
    items.push({
      icon: CalendarBlank,
      label: "Busiest Month",
      name: stats.busiestMonth.month,
      detail: `${stats.busiestMonth.count} ${stats.busiestMonth.count === 1 ? "festival" : "festivals"}`,
    });
  }

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide mb-2">
        Club Superlatives
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
