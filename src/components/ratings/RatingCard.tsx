import { Database } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

type Rating = Database["public"]["Tables"]["ratings"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface RatingCardProps {
  rating: Rating & {
    users: User | null;
  };
}

export function RatingCard({ rating }: RatingCardProps) {
  const user = rating.users;
  const userName = user?.display_name || user?.email || "Unknown User";

  // Color code rating using semantic colors
  const getRatingColor = (rating: number): string => {
    if (rating < 5) {
      return "text-[var(--error)]";
    } else if (rating < 8) {
      return "text-[var(--warning)]";
    } else {
      return "text-[var(--success)]";
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="font-medium text-[var(--text-primary)] text-base">{userName}</div>
        </div>
        <div className={`text-lg font-bold ${getRatingColor(rating.rating || 0)}`}>
          {formatRatingDisplay(rating.rating ?? 0)}
        </div>
      </CardContent>
    </Card>
  );
}
