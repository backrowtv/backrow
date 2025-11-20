import { Card, CardContent } from "@/components/ui/card";
import { getGenreColor } from "@/lib/movies/colors";

interface TopGenresDisplayProps {
  genres: { genre: string; count: number }[];
}

export function TopGenresDisplay({ genres }: TopGenresDisplayProps) {
  if (genres.length === 0) return null;

  const maxCount = genres[0].count;

  return (
    <section className="border-t border-[var(--border)] pt-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        Top Genres
      </h2>
      <Card variant="default">
        <CardContent className="px-3 py-2.5">
          <div className="space-y-1.5">
            {genres.map((g, i) => (
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
                        width: `${(g.count / maxCount) * 100}%`,
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
    </section>
  );
}
