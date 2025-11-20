import { Card, CardContent } from "@/components/ui/card";
import { AnimatedStat } from "@/components/profile/AnimatedStat";
import { FilmStrip, UsersThree, Trophy, Flag, Ticket, Star } from "@phosphor-icons/react/dist/ssr";
import type { UserProfileStats } from "@/app/actions/profile/types";

interface StatsOverviewGridProps {
  stats: UserProfileStats;
}

const overviewItems = [
  { key: "moviesWatched", label: "Watched", Icon: FilmStrip },
  { key: "clubsJoined", label: "Clubs", Icon: UsersThree },
  { key: "festivalsPlayed", label: "Festivals", Icon: Flag },
  { key: "festivalsWon", label: "Wins", Icon: Trophy },
  { key: "nominationsTotal", label: "Noms", Icon: Ticket },
  { key: "totalPoints", label: "Points", Icon: Star },
] as const;

export function StatsOverviewGrid({ stats }: StatsOverviewGridProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        Overview
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {overviewItems.map(({ key, label, Icon }) => (
          <Card key={key} variant="default" hover className="overflow-hidden group">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon
                  className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity shrink-0"
                  style={{ color: "var(--text-muted)" }}
                  weight="duotone"
                />
                <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-muted)]">
                  {label}
                </span>
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)] pl-[22px]">
                <AnimatedStat value={Math.round(stats[key])} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
