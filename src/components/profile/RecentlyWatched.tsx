import { createClient } from "@/lib/supabase/server";
import { RecentlyWatchedClient } from "./RecentlyWatchedClient";
import { Eye } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentlyWatchedProps {
  userId: string;
  limit?: number;
}

export interface WatchedMovie {
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  year: number | null;
  slug: string | null;
  overview: string | null;
  first_watched_at: string;
}

export async function RecentlyWatched({ userId, limit = 12 }: RecentlyWatchedProps) {
  const supabase = await createClient();

  // Fetch watch history with movie details
  const { data: watchHistory, error } = await supabase
    .from("watch_history")
    .select("tmdb_id, first_watched_at")
    .eq("user_id", userId)
    .order("first_watched_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching watch history:", error);
    return null;
  }

  if (!watchHistory || watchHistory.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="No movies watched yet"
        message="Start watching movies in your clubs to build your history"
        variant="card"
      />
    );
  }

  // Get movie details
  const tmdbIds = watchHistory.map((w) => w.tmdb_id).filter((id): id is number => id !== null);

  const { data: movies } = await supabase
    .from("movies")
    .select("tmdb_id, title, poster_url, year, slug, overview")
    .in("tmdb_id", [...new Set(tmdbIds)]);

  const moviesMap = new Map((movies || []).map((m) => [m.tmdb_id, m]));

  // Fetch hidden watch history items for this user
  const { data: hiddenRows } = await supabase
    .from("hidden_watch_history")
    .select("tmdb_id")
    .eq("user_id", userId);
  const hiddenTmdbIds = new Set(hiddenRows?.map((r) => r.tmdb_id) || []);

  // Combine watch history with movie data, filtering out hidden items
  const watchedMovies: WatchedMovie[] = watchHistory
    .filter((w) => w.tmdb_id !== null && moviesMap.has(w.tmdb_id) && !hiddenTmdbIds.has(w.tmdb_id))
    .map((w) => {
      const movie = moviesMap.get(w.tmdb_id!)!;
      return {
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        poster_url: movie.poster_url,
        year: movie.year,
        slug: movie.slug,
        overview: movie.overview,
        first_watched_at: w.first_watched_at,
      };
    });

  if (watchedMovies.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="No movies watched yet"
        message="Start watching movies in your clubs to build your history"
        variant="card"
      />
    );
  }

  return <RecentlyWatchedClient movies={watchedMovies} />;
}

export function RecentlyWatchedSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`flex gap-4 overflow-hidden ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="w-24 md:w-28 aspect-[2/3] rounded-md flex-shrink-0" />
      ))}
    </div>
  );
}
