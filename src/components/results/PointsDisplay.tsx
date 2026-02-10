import { formatRatingDisplay } from "@/lib/ratings/normalize";

interface PointsBreakdown {
  nomination_id: string;
  tmdb_id: number;
  average_rating: number;
  rating_count: number;
  movie_title?: string;
}

interface PointsDisplayProps {
  breakdown: PointsBreakdown[];
  memberCount: number;
}

export function PointsDisplay({ breakdown, memberCount }: PointsDisplayProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Points Breakdown</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Points = (your_rating - average_rating) × {memberCount} members
      </p>
      <div className="space-y-2">
        {breakdown.map((item) => (
          <div
            key={item.nomination_id}
            className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-zinc-950 dark:text-zinc-50">
                  {item.movie_title || `Movie ID: ${item.tmdb_id}`}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Average: {formatRatingDisplay(item.average_rating)} / 10.0
                </div>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-500">
                {item.rating_count} {item.rating_count === 1 ? "rating" : "ratings"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
