import { createClient } from "@/lib/supabase/server";
import {
  getEndlessFestivalData,
  getWatchedMovies,
  getUserRatingsForNominations,
} from "@/app/actions/endless-festival";
import { EndlessFestivalViewWrapper } from "./EndlessFestivalViewWrapper";
import type { DiscussionThreadMap } from "./EndlessFestivalView";
import type { RatingRubric } from "@/types/club-settings";

interface EndlessFestivalSectionProps {
  clubId: string;
  clubSlug: string;
  clubName: string;
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  festivalType?: "standard" | "endless";
  /** Hide Recently Played section on desktop (shown in sidebar instead) */
  hideRecentlyPlayedOnDesktop?: boolean;
}

export interface ClubRatingSettings {
  club_ratings_enabled: boolean;
  rating_min: number;
  rating_max: number;
  rating_increment: number;
  rating_slider_icon?: "default" | "stars" | "popcorn" | "ticket" | "film";
  rating_rubrics: RatingRubric[];
  rubric_enforcement: "off" | "suggested" | "required";
  rating_rubric_name?: string;
}

/**
 * Server component that fetches endless festival data and renders the view
 */
export async function EndlessFestivalSection({
  clubId,
  clubSlug,
  clubName,
  isAdmin,
  isMember,
  currentUserId,
  festivalType = "endless",
  hideRecentlyPlayedOnDesktop = false,
}: EndlessFestivalSectionProps) {
  const supabase = await createClient();

  // Fetch the endless festival data and club settings in parallel
  const [data, { data: club }] = await Promise.all([
    getEndlessFestivalData(clubId),
    supabase.from("clubs").select("settings").eq("id", clubId).single(),
  ]);

  if ("error" in data) {
    return (
      <div className="p-4 rounded-lg bg-[var(--surface-1)] text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Unable to load festival data. Please try again later.
        </p>
      </div>
    );
  }

  // Fetch watched status and user ratings for now playing movies
  const tmdbIds = data.nowPlaying.map((m) => m.tmdb_id);
  const nominationIds = data.nowPlaying.map((m) => m.id);

  // Get tmdb_ids from recently played for discussion thread lookup
  const recentlyPlayedTmdbIds = data.recentlyPlayed.map((m) => m.tmdb_id);

  const [watchedSet, ratingsMap, discussionThreadsData] = await Promise.all([
    getWatchedMovies(tmdbIds),
    data.festivalId
      ? getUserRatingsForNominations(nominationIds, data.festivalId)
      : Promise.resolve(new Map<string, number>()),
    // Fetch discussion threads for recently played movies
    recentlyPlayedTmdbIds.length > 0
      ? supabase
          .from("discussion_threads")
          .select("id, slug, tmdb_id")
          .eq("club_id", clubId)
          .in("tmdb_id", recentlyPlayedTmdbIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Build discussion threads map
  const discussionThreads: DiscussionThreadMap = {};
  if (discussionThreadsData.data) {
    for (const thread of discussionThreadsData.data) {
      if (thread.tmdb_id) {
        discussionThreads[thread.tmdb_id] = { id: thread.id, slug: thread.slug };
      }
    }
  }

  // Enhance nowPlaying with watched/rated status
  const enhancedNowPlaying = data.nowPlaying.map((movie) => ({
    ...movie,
    isWatched: watchedSet.has(movie.tmdb_id),
    isRated: ratingsMap.has(movie.id),
    userRating: ratingsMap.get(movie.id),
  }));

  // Extract rating settings from club settings
  const settings = (club?.settings as Record<string, unknown>) || {};
  const ratingSettings: ClubRatingSettings = {
    club_ratings_enabled: (settings.club_ratings_enabled as boolean) ?? true,
    rating_min: (settings.rating_min as number) ?? 0,
    rating_max: (settings.rating_max as number) ?? 10,
    rating_increment: (settings.rating_increment as number) ?? 0.1,
    rating_slider_icon:
      (settings.rating_slider_icon as ClubRatingSettings["rating_slider_icon"]) ?? "default",
    rating_rubrics: (settings.rating_rubrics as RatingRubric[]) ?? [],
    rubric_enforcement:
      (settings.rubric_enforcement as ClubRatingSettings["rubric_enforcement"]) ?? "off",
    rating_rubric_name: settings.rating_rubric_name as string | undefined,
  };

  return (
    <EndlessFestivalViewWrapper
      clubId={clubId}
      clubSlug={clubSlug}
      clubName={clubName}
      festivalId={data.festivalId}
      festivalName={settings.endless_festival_show_title !== false ? data.festivalName : null}
      nowPlaying={enhancedNowPlaying}
      pool={data.pool}
      recentlyPlayed={data.recentlyPlayed}
      discussionThreads={discussionThreads}
      isAdmin={isAdmin}
      isMember={isMember}
      currentUserId={currentUserId}
      festivalType={festivalType}
      ratingSettings={ratingSettings}
      hideRecentlyPlayedOnDesktop={hideRecentlyPlayedOnDesktop}
      detailsUrl={`/club/${clubSlug}/endless`}
    />
  );
}
