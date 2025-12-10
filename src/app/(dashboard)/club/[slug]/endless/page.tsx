import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import {
  getEndlessFestivalData,
  getWatchedMovies,
  getUserRatingsForNominations,
  getUserGenericRatings,
} from "@/app/actions/endless-festival";
import { EndlessFestivalPageClient } from "@/components/festivals/endless/EndlessFestivalPageClient";
import type { ClubRatingSettings } from "@/components/festivals/endless/EndlessFestivalSection";
import type { DiscussionThreadMap } from "@/components/festivals/endless/EndlessFestivalView";
import type { RatingRubric } from "@/types/club-settings";
import { extractFestivalType } from "@/types/supabase-helpers";

interface EndlessPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EndlessPage({ params }: EndlessPageProps) {
  const identifier = (await params).slug;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Resolve club
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Fetch club data and membership in parallel
  const [{ data: club }, { data: membership }] = await Promise.all([
    supabase.from("clubs").select("name, settings").eq("id", clubId).single(),
    supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!club) redirect("/clubs");

  const isMember = !!membership;
  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const settings = (club.settings as Record<string, unknown>) || {};

  // Verify this is actually an endless festival club
  if (settings.festival_type !== "endless") {
    redirect(`/club/${clubSlug}`);
  }

  // Fetch endless festival data
  const data = await getEndlessFestivalData(clubId);
  if ("error" in data) {
    redirect(`/club/${clubSlug}`);
  }

  // Fetch watched status and user ratings for now playing movies
  const tmdbIds = data.nowPlaying.map((m) => m.tmdb_id);
  const nominationIds = data.nowPlaying.map((m) => m.id);
  const recentlyPlayedTmdbIds = data.recentlyPlayed.map((m) => m.tmdb_id);

  const [watchedSet, ratingsMap, genericRatingsMap, discussionThreadsData] = await Promise.all([
    getWatchedMovies(tmdbIds),
    data.festivalId
      ? getUserRatingsForNominations(nominationIds, data.festivalId)
      : Promise.resolve(new Map<string, number>()),
    getUserGenericRatings(tmdbIds),
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
  // For endless festivals, generic_ratings (global) is the source of truth,
  // but also check festival-scoped ratings as fallback
  const enhancedNowPlaying = data.nowPlaying.map((movie) => ({
    ...movie,
    isWatched: watchedSet.has(movie.tmdb_id),
    isRated: genericRatingsMap.has(movie.tmdb_id) || ratingsMap.has(movie.id),
    userRating: genericRatingsMap.get(movie.tmdb_id) ?? ratingsMap.get(movie.id),
  }));

  // Extract rating settings
  const festivalType = extractFestivalType(settings, "endless");
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
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <EndlessFestivalPageClient
        clubId={clubId}
        clubSlug={clubSlug}
        clubName={club.name}
        festivalId={data.festivalId}
        festivalName={settings.endless_festival_show_title !== false ? data.festivalName : null}
        nowPlaying={enhancedNowPlaying}
        pool={data.pool}
        recentlyPlayed={data.recentlyPlayed}
        discussionThreads={discussionThreads}
        isAdmin={isAdmin}
        isMember={isMember}
        currentUserId={user.id}
        festivalType={festivalType}
        ratingSettings={ratingSettings}
      />
    </div>
  );
}
