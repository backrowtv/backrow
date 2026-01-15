import { createClient } from "@/lib/supabase/server";
import {
  getFestivalCarouselMovies,
  getWatchedMoviesForUser,
  getUserRatingsForFestival,
} from "@/app/actions/festival-carousel";
import { FestivalCarouselWrapper } from "./FestivalCarouselWrapper";
import type { ClubRatingSettings } from "../endless/EndlessFestivalSection";
import type { RatingRubric } from "@/types/club-settings";

interface FestivalCarouselSectionProps {
  festivalId: string;
  festivalSlug?: string;
  clubId: string;
  clubSlug: string;
  clubName: string;
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  festivalType?: "standard" | "endless";
}

/**
 * Server component that fetches standard festival data and renders the carousel view
 * Used for Watch & Rate phase of standard (non-endless) festivals
 */
export async function FestivalCarouselSection({
  festivalId,
  festivalSlug,
  clubId,
  clubSlug,
  clubName,
  isAdmin,
  isMember,
  currentUserId,
  festivalType = "standard",
}: FestivalCarouselSectionProps) {
  const supabase = await createClient();

  // Fetch festival movies and club settings in parallel
  const [data, { data: club }] = await Promise.all([
    getFestivalCarouselMovies(festivalId),
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

  // Fetch watched status and user ratings for movies
  const tmdbIds = data.movies
    .map((m) => m.tmdb_id)
    .filter((id): id is number => id !== null && id !== undefined);
  const nominationIds = data.movies.map((m) => m.id);

  const [watchedSet, ratingsMap] = await Promise.all([
    getWatchedMoviesForUser(tmdbIds),
    getUserRatingsForFestival(nominationIds, festivalId),
  ]);

  // Enhance movies with watched/rated status
  const enhancedMovies = data.movies.map((movie) => ({
    ...movie,
    isWatched: movie.tmdb_id ? watchedSet.has(movie.tmdb_id) : false,
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
    rating_rubrics: (settings.rating_rubrics as RatingRubric[]) ?? [],
    rubric_enforcement:
      (settings.rubric_enforcement as ClubRatingSettings["rubric_enforcement"]) ?? "off",
  };

  return (
    <FestivalCarouselWrapper
      festivalId={festivalId}
      festivalSlug={festivalSlug || festivalId}
      clubId={clubId}
      clubSlug={clubSlug}
      clubName={clubName}
      movies={enhancedMovies}
      theme={data.theme}
      ratingDeadline={data.ratingDeadline}
      guessingEnabled={data.guessingEnabled}
      isAdmin={isAdmin}
      isMember={isMember}
      currentUserId={currentUserId}
      festivalType={festivalType}
      ratingSettings={ratingSettings}
    />
  );
}
