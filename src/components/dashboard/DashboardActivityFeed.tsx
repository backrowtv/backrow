import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Text } from "@/components/ui/typography";
import { RatingBadge } from "./RatingBadge";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
}

interface ActivityItem {
  id: string;
  rating: number;
  created_at: string;
  tmdb_id: number | null;
  movie_title: string | null;
  movie_year: number | null;
  club_id: string | null;
  club_slug: string | null;
  club_name: string | null;
  festival_id: string | null;
  festival_slug: string | null;
}

// Shape of the deeply-nested ratings → nominations → festivals → clubs join.
// Supabase generated types treat embedded 1:1 relations as arrays in some paths,
// so each level accepts both object and array shapes; unwrapping happens at the
// call site.
type RatingActivityClub = { id?: string; slug?: string | null; name?: string | null };
type RatingActivityFestival = {
  id?: string;
  slug?: string | null;
  clubs?: RatingActivityClub | RatingActivityClub[] | null;
};
type RatingActivityNomination = {
  tmdb_id?: number | null;
  festivals?: RatingActivityFestival | RatingActivityFestival[] | null;
};
type RatingActivityRow = {
  id: string;
  rating: number | null;
  created_at: string;
  nominations?: RatingActivityNomination | RatingActivityNomination[] | null;
};

async function getRecentActivity(userId: string): Promise<ActivityItem[]> {
  const supabase = await createClient();

  // Get recent ratings with nested data
  const { data: ratings } = await supabase
    .from("ratings")
    .select(
      `
      id,
      rating,
      created_at,
      nominations:nomination_id (
        tmdb_id,
        festivals:festival_id (
          id,
          slug,
          clubs:club_id (
            id,
            slug,
            name
          )
        )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<RatingActivityRow[]>();

  if (!ratings || ratings.length === 0) {
    return [];
  }

  // Extract tmdb_ids and get movie details
  const tmdbIds = ratings
    .map((r) => {
      const nomination = Array.isArray(r.nominations) ? r.nominations[0] : r.nominations;
      return nomination?.tmdb_id ?? null;
    })
    .filter((id): id is number => id !== null && id !== undefined);

  if (tmdbIds.length === 0) {
    return [];
  }

  const { data: movies } = await supabase
    .from("movies")
    .select("tmdb_id, title, year")
    .in("tmdb_id", [...new Set(tmdbIds)]);

  const moviesMap = new Map((movies || []).map((m) => [m.tmdb_id, m]));

  // Build activity items
  return ratings
    .map((rating) => {
      const nomination = Array.isArray(rating.nominations)
        ? rating.nominations[0]
        : rating.nominations;
      const festivalsRelation = nomination?.festivals;
      const festival = Array.isArray(festivalsRelation)
        ? festivalsRelation[0]
        : festivalsRelation || null;
      const clubsRelation = festival?.clubs;
      const club = Array.isArray(clubsRelation) ? clubsRelation[0] : clubsRelation || null;
      const tmdbId = nomination?.tmdb_id ?? null;
      const movie = tmdbId ? moviesMap.get(tmdbId) : null;

      return {
        id: rating.id,
        rating: Number(rating.rating),
        created_at: rating.created_at,
        tmdb_id: tmdbId,
        movie_title: movie?.title || null,
        movie_year: movie?.year || null,
        club_id: club?.id || null,
        club_slug: club?.slug || null,
        club_name: club?.name || null,
        festival_id: festival?.id || null,
        festival_slug: festival?.slug || null,
      };
    })
    .filter((item) => item.tmdb_id !== null);
}

export async function DashboardActivityFeed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const activities = await getRecentActivity(user.id);

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Text size="sm" muted>
          No recent activity
        </Text>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {activities.slice(0, 5).map((activity) => {
        const dateWatched = activity.created_at
          ? formatTimeAgo(new Date(activity.created_at))
          : null;

        const clubSlug = activity.club_slug || activity.club_id;
        const festivalSlug = activity.festival_slug || activity.festival_id;
        const href =
          activity.club_id && activity.festival_id
            ? `/club/${clubSlug}/festival/${festivalSlug}`
            : activity.club_id
              ? `/club/${clubSlug}`
              : "#";

        return (
          <Link
            key={activity.id}
            href={href}
            className="block group p-3 rounded-lg hover:bg-zinc-900/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Text
                    size="sm"
                    className="font-semibold group-hover:opacity-80 transition-colors"
                  >
                    {activity.movie_title || "Unknown Movie"}
                  </Text>
                  {activity.movie_year && (
                    <Text size="tiny" muted>
                      ({activity.movie_year})
                    </Text>
                  )}
                </div>
                {activity.club_name && (
                  <Text size="tiny" muted className="mb-1">
                    {activity.club_name}
                  </Text>
                )}
                {dateWatched && (
                  <Text size="tiny" muted>
                    {dateWatched}
                  </Text>
                )}
              </div>
              <div className="flex-shrink-0">
                <RatingBadge rating={activity.rating} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
