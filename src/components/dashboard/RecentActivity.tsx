import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RatingBadge } from "./RatingBadge";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

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

const RECENT_ACTIVITY_LIMIT = 12;

interface RecentActivityItem {
  id: string;
  rating: number;
  created_at: string;
  tmdb_id: number | null;
  movie_title: string | null;
  movie_poster_url: string | null;
  movie_year: number | null;
  club_id: string | null;
  club_slug: string | null;
  club_name: string | null;
  festival_id: string | null;
  festival_slug: string | null;
}

async function getRecentActivity(userId: string): Promise<RecentActivityItem[]> {
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
            name,
            slug
          )
        )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(RECENT_ACTIVITY_LIMIT);

  if (!ratings || ratings.length === 0) {
    return [];
  }

  // Extract tmdb_ids and get movie details
  const tmdbIds = ratings
    .map((r) => {
      const nominationsRelation = Array.isArray(r.nominations) ? r.nominations[0] : r.nominations;
      const nomination = nominationsRelation as {
        tmdb_id?: number | null;
        festivals?: { id?: string; clubs?: { id?: string; name?: string | null } | null } | null;
      } | null;
      return nomination?.tmdb_id ?? null;
    })
    .filter((id): id is number => id !== null && id !== undefined);

  if (tmdbIds.length === 0) {
    return [];
  }

  const { data: movies } = await supabase
    .from("movies")
    .select("tmdb_id, title, poster_url, year")
    .in("tmdb_id", [...new Set(tmdbIds)]);

  const moviesMap = new Map((movies || []).map((m) => [m.tmdb_id, m]));

  // Build activity items
  return ratings
    .map((rating) => {
      const nominationsRelation = Array.isArray(rating.nominations)
        ? rating.nominations[0]
        : rating.nominations;
      const nomination = nominationsRelation as {
        tmdb_id?: number | null;
        festivals?: {
          id?: string;
          slug?: string | null;
          clubs?: { id?: string; name?: string | null; slug?: string | null } | null;
        } | null;
      } | null;
      const festivalsRelation = nomination?.festivals;
      const festival = Array.isArray(festivalsRelation) ? festivalsRelation[0] : festivalsRelation;
      const club = festival?.clubs;
      const tmdbId = nomination?.tmdb_id ?? null;
      const movie = tmdbId ? moviesMap.get(tmdbId) : null;
      const createdAt = rating.created_at;

      if (!createdAt) return null;

      return {
        id: rating.id,
        rating: Number(rating.rating),
        created_at: createdAt,
        tmdb_id: tmdbId,
        movie_title: movie?.title || null,
        movie_poster_url: movie?.poster_url || null,
        movie_year: movie?.year || null,
        club_id: club?.id || null,
        club_slug: club?.slug || club?.id || null,
        club_name: club?.name || null,
        festival_id: festival?.id || null,
        festival_slug: festival?.slug || festival?.id || null,
      };
    })
    .filter((item): item is RecentActivityItem => item !== null && item.tmdb_id !== null); // Only include items with valid movie data
}

export async function RecentActivity() {
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
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: "var(--text-primary)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
          No recent activity
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Start rating movies in festivals to see your activity here!
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto overflow-y-visible pb-4 -mx-4 px-4 overscroll-x-contain"
      data-swipe-ignore
    >
      <div className="flex gap-4 min-w-max">
        {activities.map((activity) => {
          const _isHighRating = activity.rating >= 8;
          const posterUrl = activity.movie_poster_url
            ? `https://image.tmdb.org/t/p/w500${activity.movie_poster_url}`
            : null;
          const dateWatched = activity.created_at
            ? formatTimeAgo(new Date(activity.created_at))
            : null;

          const href =
            activity.club_id && activity.festival_id
              ? `/club/${activity.club_slug || activity.club_id}/festival/${activity.festival_slug || activity.festival_id}`
              : activity.club_id
                ? `/club/${activity.club_slug || activity.club_id}`
                : "#";

          return (
            <Link key={activity.id} href={href} className="group flex-shrink-0 w-40">
              <Card
                variant="default"
                hover
                interactive
                className="relative overflow-hidden p-0 h-full"
              >
                {/* Poster container */}
                <div className="relative aspect-[2/3] w-full overflow-hidden">
                  {posterUrl ? (
                    <>
                      <Image
                        src={posterUrl}
                        alt={activity.movie_title || "Movie"}
                        fill
                        className="object-cover"
                        sizes="160px"
                        placeholder="blur"
                        blurDataURL={getTMDBBlurDataURL()}
                      />
                      {/* Gradient overlay */}
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <div className="text-center p-3">
                        <svg
                          className="w-8 h-8 mx-auto mb-1"
                          style={{ color: "var(--text-muted)" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          No Poster
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rating badge */}
                  <div className="absolute top-2 right-2">
                    <RatingBadge
                      rating={activity.rating}
                      variant="overlay"
                      className="backdrop-blur-md shadow-lg"
                    />
                  </div>

                  {/* Club badge (on hover) */}
                  {activity.club_name && (
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div
                        className="backdrop-blur-md px-2 py-1 rounded text-xs truncate"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {activity.club_name}
                      </div>
                    </div>
                  )}
                </div>

                {/* Movie info */}
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{ backgroundColor: "var(--surface-1)" }}
                >
                  <h3
                    className="font-semibold transition-colors line-clamp-2 mb-1 text-xs leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {activity.movie_title || "Unknown Movie"}
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    {activity.movie_year && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {activity.movie_year}
                      </p>
                    )}
                    {dateWatched && (
                      <p
                        className="text-xs truncate ml-auto"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {dateWatched}
                      </p>
                    )}
                  </div>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 ring-2 ring-transparent rounded-xl transition-all duration-300 pointer-events-none" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
