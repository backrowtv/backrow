import { Card, CardContent } from "@/components/ui/card";
import { FilmStrip, Clock, Calendar, FilmSlate, Users } from "@phosphor-icons/react/dist/ssr";
import type { ClubAdvancedStats } from "@/app/actions/profile/types";
import { getGenreColor } from "@/lib/movies/colors";

interface ClubMovieStatsProps {
  stats: ClubAdvancedStats;
}

function formatWatchTime(minutes: number): string {
  if (minutes <= 0) return "0h";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function ClubMovieStats({ stats }: ClubMovieStatsProps) {
  if (stats.totalMoviesWatched === 0) return null;

  const maxGenreCount = stats.genreBreakdown.length > 0 ? stats.genreBreakdown[0].count : 1;

  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide mb-2">
        Movies
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        <Card variant="default">
          <CardContent className="px-3 py-2.5">
            <FilmStrip className="w-4 h-4 text-[var(--text-muted)] mb-1" weight="bold" />
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {stats.totalMoviesWatched}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Movies Watched</p>
          </CardContent>
        </Card>
        {stats.totalWatchTimeMinutes > 0 && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <Clock className="w-4 h-4 text-[var(--text-muted)] mb-1" weight="bold" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {formatWatchTime(stats.totalWatchTimeMinutes)}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Total Watch Time</p>
            </CardContent>
          </Card>
        )}
        {stats.avgMovieRuntime != null && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {stats.avgMovieRuntime}m
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Avg Runtime</p>
            </CardContent>
          </Card>
        )}
        {stats.averageMovieYear != null && (
          <Card variant="default">
            <CardContent className="px-3 py-2.5">
              <Calendar className="w-4 h-4 text-[var(--text-muted)] mb-1" weight="bold" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {stats.averageMovieYear}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Avg Year</p>
            </CardContent>
          </Card>
        )}
      </div>

      {(stats.oldestMovie || stats.newestMovie) && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {stats.oldestMovie && (
            <Card variant="default" className="min-w-0 overflow-hidden">
              <CardContent className="px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-0.5">
                  Oldest
                </p>
                <p className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2">
                  {stats.oldestMovie.title}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{stats.oldestMovie.year}</p>
              </CardContent>
            </Card>
          )}
          {stats.newestMovie && (
            <Card variant="default" className="min-w-0 overflow-hidden">
              <CardContent className="px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-0.5">
                  Newest
                </p>
                <p className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2">
                  {stats.newestMovie.title}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{stats.newestMovie.year}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(stats.topDirector || stats.topActor) && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {stats.topDirector && (
            <Card variant="default" className="min-w-0 overflow-hidden">
              <CardContent className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FilmSlate
                    className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
                    weight="bold"
                  />
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                    Top Director
                  </p>
                </div>
                <p className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2">
                  {stats.topDirector.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {stats.topDirector.count} {stats.topDirector.count === 1 ? "movie" : "movies"}
                </p>
              </CardContent>
            </Card>
          )}
          {stats.topActor && (
            <Card variant="default" className="min-w-0 overflow-hidden">
              <CardContent className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Users className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" weight="bold" />
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                    Top Actor
                  </p>
                </div>
                <p className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2">
                  {stats.topActor.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {stats.topActor.count} {stats.topActor.count === 1 ? "movie" : "movies"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {stats.genreBreakdown.length > 0 && (
        <Card variant="default">
          <CardContent className="px-3 py-2.5">
            <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Genre Breakdown</p>
            <div className="space-y-1.5">
              {stats.genreBreakdown.map((g, i) => (
                <div key={g.genre} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] w-4 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {g.genre}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-2">{g.count}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(g.count / maxGenreCount) * 100}%`,
                          backgroundColor: getGenreColor(g.genre).text,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
