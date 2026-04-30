"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateFestival, invalidateClub } from "@/lib/cache/invalidate";
import { logMemberActivity } from "@/lib/activity/logger";
import { normalizeRating, INTERNAL_RATING_SCALE } from "@/lib/ratings/normalize";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { markMovieWatched } from "@/app/actions/endless-festival/watch-history";
import { isEndlessFestivalClub } from "@/app/actions/endless-festival/data";

// Shape returned for `festivals!inner(status, theme)` joins on the `ratings` table.
// PostgREST models embedded relations as nullable even when `!inner` guarantees the row,
// so we shape it as a single non-null object.
type RatingFestivalJoin = { status: string; theme: string | null };
type SyncableRatingRow = {
  id: string;
  festival_id?: string;
  nominations: { tmdb_id: number | null } | null;
  festivals: RatingFestivalJoin | null;
};

export async function createRating(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("createRating", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const festivalId = formData.get("festivalId") as string;
  const nominationId = formData.get("nominationId") as string;
  const rating = parseFloat(formData.get("rating") as string);

  if (!festivalId || !nominationId || isNaN(rating)) {
    return { error: "Festival, nomination, and rating are required" };
  }

  // Initial validation - will be re-validated against club settings later
  if (rating < 0) {
    return { error: "Rating must be zero or a positive number" };
  }

  // Get festival to check phase first (needed to determine if endless)
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, status, watch_deadline, theme")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check if watch/rate phase is active
  if (festival.phase !== "watch_rate" && festival.status !== "watching") {
    return { error: "Rating phase is not active" };
  }

  // Check if rating deadline has passed (for standard festivals with deadlines)
  if (festival.watch_deadline && festival.status !== "watching") {
    const deadline = new Date(festival.watch_deadline);
    if (new Date() > deadline) {
      return { error: "The rating deadline has passed" };
    }
  }

  // Source of truth: clubs.festival_type. Standard festivals also use status === "watching"
  // during the watch_rate phase, so the status alone is not enough to distinguish modes.
  const isEndlessFestival = await isEndlessFestivalClub(festival.club_id);

  // Determine if this rating should sync to the global generic_ratings table.
  // Only themed standard festivals keep ratings separate.
  const shouldSyncToGeneric = isEndlessFestival || !festival.theme;

  // Parallelize: Get nomination, membership, and club settings at once
  const [nominationResult, membershipResult, clubResult] = await Promise.all([
    supabase
      .from("nominations")
      .select("user_id")
      .eq("id", nominationId)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("club_members")
      .select("role")
      .eq("club_id", festival.club_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("clubs").select("settings").eq("id", festival.club_id).single(),
  ]);

  const { data: nomination, error: nominationError } = nominationResult;
  const { data: membership } = membershipResult;
  const { data: club } = clubResult;

  if (nominationError || !nomination) {
    return { error: "Nomination not found" };
  }

  // Cannot rate own nomination in regular festivals (allowed in endless festivals)
  if (!isEndlessFestival && nomination.user_id === user.id) {
    return { error: "You cannot rate your own nomination" };
  }

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  const settings = (club?.settings as Record<string, unknown>) || {};
  const clubRatingsEnabled = (settings.club_ratings_enabled as boolean) ?? true;
  const ratingMin = (settings.rating_min as number) ?? 0;
  const ratingMax = (settings.rating_max as number) ?? 10.0;
  const ratingIncrement = (settings.rating_increment as number) ?? 0.1;

  // Check if club ratings are enabled
  if (!clubRatingsEnabled) {
    return { error: "Club ratings are disabled for this club" };
  }

  // Validate rating range against club settings
  if (rating < ratingMin || rating > ratingMax) {
    return { error: `Rating must be between ${ratingMin} and ${ratingMax}` };
  }

  // Round to nearest increment on the club's scale
  const roundedToIncrement =
    Math.round((rating - ratingMin) / ratingIncrement) * ratingIncrement + ratingMin;
  const clampedRating = Math.max(ratingMin, Math.min(ratingMax, roundedToIncrement));

  // NORMALIZE: Convert from club's scale to internal 0-10 scale
  // All ratings are stored internally on a 0-10 scale with 0.1 precision
  const normalizedRating = normalizeRating(clampedRating, ratingMin, ratingMax);

  // Validate the normalized rating is within bounds
  if (
    normalizedRating < INTERNAL_RATING_SCALE.MIN ||
    normalizedRating > INTERNAL_RATING_SCALE.MAX
  ) {
    return { error: "Invalid rating calculation" };
  }

  // The rating to save is the normalized 0-10 value
  const ratingToSave = normalizedRating;

  // Check if user already rated this nomination
  const { data: existingRating, error: existingRatingError } = await supabase
    .from("ratings")
    .select("id")
    .eq("festival_id", festivalId)
    .eq("nomination_id", nominationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingRatingError) {
    return { error: existingRatingError.message };
  }

  if (existingRating) {
    if (isEndlessFestival) {
      // Allow updating ratings in endless festivals
      const { error } = await supabase
        .from("ratings")
        .update({ rating: ratingToSave })
        .eq("id", existingRating.id);

      if (error) {
        return { error: error.message };
      }

      // Get movie info for logging + club slug for the watched-event hook
      const [{ data: nominationData }, { data: clubData }] = await Promise.all([
        supabase
          .from("nominations")
          .select("tmdb_id, movies:tmdb_id(title)")
          .eq("id", nominationId)
          .single(),
        supabase.from("clubs").select("slug").eq("id", festival.club_id).single(),
      ]);

      // Sync to generic_ratings for endless/non-themed festivals
      if (shouldSyncToGeneric && nominationData?.tmdb_id) {
        await supabase.from("generic_ratings").upsert(
          {
            user_id: user.id,
            tmdb_id: nominationData.tmdb_id,
            rating: ratingToSave,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,tmdb_id" }
        );
      }

      // Auto-mark as watched when rated
      if (nominationData?.tmdb_id) {
        try {
          await markMovieWatched(nominationData.tmdb_id, {
            clubId: festival.club_id,
            clubSlug: clubData?.slug,
            festivalId,
          });
        } catch (e) {
          console.error("Failed to auto-mark movie as watched:", e);
        }
      }

      await invalidateFestival(festivalId, { clubId: festival.club_id });

      const movieInfo = Array.isArray(nominationData?.movies)
        ? nominationData.movies[0]
        : nominationData?.movies;

      return {
        success: true,
        updated: true,
        movieTitle: movieInfo?.title || "Unknown",
      };
    }
    return { error: "You have already rated this movie" };
  }

  // Create rating
  const { error } = await supabase.from("ratings").insert({
    festival_id: festivalId,
    nomination_id: nominationId,
    user_id: user.id,
    rating: ratingToSave,
  });

  if (error) {
    return { error: error.message };
  }

  // Get movie info for logging + club slug for the watched-event hook
  const [{ data: nominationData }, { data: clubData }] = await Promise.all([
    supabase
      .from("nominations")
      .select("tmdb_id, movie:movies(title)")
      .eq("id", nominationId)
      .maybeSingle(),
    supabase.from("clubs").select("slug, name").eq("id", festival.club_id).maybeSingle(),
  ]);

  // Sync to generic_ratings for endless/non-themed festivals
  if (shouldSyncToGeneric && nominationData?.tmdb_id) {
    await supabase.from("generic_ratings").upsert(
      {
        user_id: user.id,
        tmdb_id: nominationData.tmdb_id,
        rating: ratingToSave,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tmdb_id" }
    );
  }

  // Auto-mark as watched when rated
  if (nominationData?.tmdb_id) {
    try {
      await markMovieWatched(nominationData.tmdb_id, {
        clubId: festival.club_id,
        clubSlug: clubData?.slug,
        festivalId,
      });
    } catch (e) {
      console.error("Failed to auto-mark movie as watched:", e);
    }
  }

  const movie = Array.isArray(nominationData?.movie)
    ? nominationData.movie[0]
    : nominationData?.movie;

  // Log member activity
  await logMemberActivity(
    user.id,
    "user_rated_movie",
    {
      tmdb_id: nominationData?.tmdb_id,
      movie_title: movie?.title,
      rating: ratingToSave,
      club_id: festival.club_id,
      club_name: clubData?.name,
      club_slug: clubData?.slug || festival.club_id,
      festival_id: festivalId,
    },
    festival.club_id
  );

  // Check achievement badges (non-blocking)
  try {
    const { checkRatingAchievements } = await import("@/app/actions/badges");
    await checkRatingAchievements(user.id, normalizedRating, nominationId);
  } catch (e) {
    console.error("Rating achievement check failed:", e);
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });
  return { success: true };
}

/**
 * Update a generic (non-club) rating for a movie
 *
 * @param tmdbId - The TMDB ID of the movie
 * @param rating - The rating value on the user's personal scale
 * @param ratingMin - The minimum of the user's scale (e.g., 0 or 1)
 * @param ratingMax - The maximum of the user's scale (e.g., 5 or 10)
 */
export async function updateGenericRating(
  tmdbId: number,
  rating: number,
  ratingMin: number = 0,
  ratingMax: number = 10
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Validate rating is within the provided scale bounds
  if (rating < ratingMin || rating > ratingMax) {
    return { error: `Rating must be between ${ratingMin} and ${ratingMax}` };
  }

  // NORMALIZE: Convert from user's scale to internal 0-10 scale
  // All ratings are stored internally on a 0-10 scale with 0.1 precision
  const normalizedRating = normalizeRating(rating, ratingMin, ratingMax);

  // Validate the normalized rating is within bounds
  if (
    normalizedRating < INTERNAL_RATING_SCALE.MIN ||
    normalizedRating > INTERNAL_RATING_SCALE.MAX
  ) {
    return { error: "Invalid rating calculation" };
  }

  // Check if rating already exists to determine if it's new or updated.
  // generic_ratings has a composite PK (user_id, tmdb_id) — no `id` column.
  const { data: existingRating } = await supabase
    .from("generic_ratings")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  // Upsert generic rating with normalized value
  const { error } = await supabase.from("generic_ratings").upsert(
    {
      user_id: user.id,
      tmdb_id: tmdbId,
      rating: normalizedRating,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,tmdb_id",
    }
  );

  if (error) {
    return { error: error.message };
  }

  // Auto-mark as watched when rated
  try {
    await markMovieWatched(tmdbId);
  } catch (e) {
    console.error("Failed to auto-mark movie as watched:", e);
  }

  // Reverse sync: update any matching festival ratings in endless/non-themed festivals
  const { data: syncableRatings } = await supabase
    .from("ratings")
    .select("id, festival_id, nominations!inner(tmdb_id), festivals!inner(status, theme)")
    .eq("user_id", user.id)
    .eq("nominations.tmdb_id", tmdbId)
    .returns<SyncableRatingRow[]>();

  if (syncableRatings) {
    for (const fr of syncableRatings) {
      const fest = fr.festivals;
      if (!fest) continue;
      const isSyncable = fest.status === "watching" || !fest.theme;
      if (isSyncable) {
        await supabase.from("ratings").update({ rating: normalizedRating }).eq("id", fr.id);
      }
    }
  }

  // Get movie title for logging
  const { data: movie } = await supabase
    .from("movies")
    .select("title")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  // Log member activity with normalized rating (always 0-10 scale)
  await logMemberActivity(user.id, existingRating ? "user_rating_changed" : "user_rated_movie", {
    tmdb_id: tmdbId,
    movie_title: movie?.title,
    rating: normalizedRating, // Stored as 0-10 normalized value
  });

  return { success: true };
}

export async function deleteGenericRating(tmdbId: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("generic_ratings")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) {
    return { error: error.message };
  }

  // Reverse sync: delete matching festival ratings in endless/non-themed festivals
  const { data: syncableRatings } = await supabase
    .from("ratings")
    .select("id, nominations!inner(tmdb_id), festivals!inner(status, theme)")
    .eq("user_id", user.id)
    .eq("nominations.tmdb_id", tmdbId)
    .returns<SyncableRatingRow[]>();

  if (syncableRatings) {
    for (const fr of syncableRatings) {
      const fest = fr.festivals;
      if (!fest) continue;
      const isSyncable = fest.status === "watching" || !fest.theme;
      if (isSyncable) {
        await supabase.from("ratings").delete().eq("id", fr.id);
      }
    }
  }

  return { success: true };
}

/**
 * Delete a festival rating (endless festivals only)
 */
export async function deleteEndlessRating(festivalId: string, nominationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Verify this is an endless festival
  const { data: festival } = await supabase
    .from("festivals")
    .select("club_id, status, theme")
    .eq("id", festivalId)
    .single();

  if (!festival || festival.status !== "watching") {
    return { error: "Can only delete ratings in endless festivals" };
  }

  const { error } = await supabase
    .from("ratings")
    .delete()
    .eq("festival_id", festivalId)
    .eq("nomination_id", nominationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  // Sync delete to generic_ratings if this is an endless/non-themed festival
  const shouldSyncToGeneric = !festival.theme;
  if (shouldSyncToGeneric) {
    // Get the tmdb_id from the nomination
    const { data: nom } = await supabase
      .from("nominations")
      .select("tmdb_id")
      .eq("id", nominationId)
      .single();

    if (nom?.tmdb_id) {
      // Only delete the global rating if no other synced festival ratings exist for this movie
      const { data: otherRatings } = await supabase
        .from("ratings")
        .select("id, nominations!inner(tmdb_id), festivals!inner(status, theme)")
        .eq("user_id", user.id)
        .eq("nominations.tmdb_id", nom.tmdb_id)
        .neq("nomination_id", nominationId)
        .returns<SyncableRatingRow[]>();

      const hasOtherSyncedRating = otherRatings?.some((r) => {
        const fest = r.festivals;
        if (!fest) return false;
        return fest.status === "watching" || !fest.theme;
      });

      if (!hasOtherSyncedRating) {
        await supabase
          .from("generic_ratings")
          .delete()
          .eq("user_id", user.id)
          .eq("tmdb_id", nom.tmdb_id);
      }
    }
  }

  invalidateClub(festival.club_id);

  return { success: true };
}

/**
 * Cross-festival ratings for a movie — only the rows that are NOT covered by the
 * global generic_ratings sync. Per project rules, endless festivals and non-themed
 * standard festivals share one rating with `generic_ratings`; only themed standard
 * festivals keep ratings scoped to that festival. So this returns the themed
 * standard-festival ratings the current user has logged for the given tmdb_id —
 * useful on the movie's detail page to show "you rated this for X theme in Y club"
 * when the same movie has been nominated across multiple themed festivals.
 */
export type CrossFestivalRating = {
  rating: number;
  festivalId: string;
  festivalSlug: string | null;
  festivalTheme: string;
  clubName: string;
  clubSlug: string;
  ratedAt: string;
};

export async function getCrossFestivalRatings(tmdbId: number): Promise<CrossFestivalRating[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  type Row = {
    rating: number;
    updated_at: string;
    festival: {
      id: string;
      slug: string | null;
      theme: string | null;
      status: string;
      club: { name: string; slug: string } | null;
    } | null;
    nomination: { tmdb_id: number | null } | null;
  };

  const { data, error } = await supabase
    .from("ratings")
    .select(
      `
      rating,
      updated_at,
      festival:festivals!inner(id, slug, theme, status, club:clubs!inner(name, slug)),
      nomination:nominations!inner(tmdb_id)
    `
    )
    .eq("user_id", user.id)
    .eq("nominations.tmdb_id", tmdbId)
    .returns<Row[]>();

  if (error || !data) return [];

  return data
    .filter((r) => {
      const fest = r.festival;
      if (!fest || !fest.club) return false;
      // Themed standard festivals only — endless and non-themed sync to generic_ratings,
      // so they're already represented by the page's main rating display.
      return fest.status !== "watching" && !!fest.theme;
    })
    .map((r) => {
      const fest = r.festival!;
      const club = fest.club!;
      return {
        rating: r.rating,
        festivalId: fest.id,
        festivalSlug: fest.slug,
        festivalTheme: fest.theme!,
        clubName: club.name,
        clubSlug: club.slug,
        ratedAt: r.updated_at,
      };
    })
    .sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime());
}
