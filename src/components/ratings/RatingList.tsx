import { RatingCard } from "./RatingCard";
import { Database } from "@/types/database";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

type Rating = Database["public"]["Tables"]["ratings"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface RatingListProps {
  ratings: (Rating & {
    users: User | null;
  })[];
  averageRating?: number;
}

export function RatingList({ ratings, averageRating }: RatingListProps) {
  if (ratings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">No ratings yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {averageRating !== undefined && (
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Average Rating</div>
          <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            {formatRatingDisplay(averageRating)}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {ratings.map((rating) => (
          <RatingCard key={rating.id} rating={rating} />
        ))}
      </div>
    </div>
  );
}
