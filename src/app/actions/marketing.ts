"use server";

import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache/invalidate";
import { createPublicClient } from "@/lib/supabase/server";
import { getUpcomingMovies } from "@/lib/tmdb/upcoming";
import { parseRSSFeed } from "@/lib/rss/parser";
import { primaryFilmNewsFeed, movieHeadlinesFeeds } from "@/data/film-news";
import { handleActionError } from "@/lib/errors/handler";
import type {
  UpcomingMovie,
  FilmNewsData,
  CuratedPick,
  FeaturedClub,
  PopularMovie,
} from "./marketing.types";

/**
 * Get upcoming movies from TMDB
 * Cached for 24 hours to reduce API calls
 */
export async function getUpcomingMoviesData(): Promise<UpcomingMovie[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.upcomingMovies());

  try {
    return await getUpcomingMovies(20);
  } catch (error) {
    handleActionError(error, { action: "getUpcomingMoviesData", silent: true });
    return [];
  }
}

/**
 * Get film news from RSS feeds
 * Cached for 1 hour to reduce server load
 */
export async function getFilmNewsData(): Promise<FilmNewsData> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.filmNews());

  try {
    // Fetch all feeds in parallel
    const allFeeds = [primaryFilmNewsFeed, ...movieHeadlinesFeeds.map((feed) => feed.rssUrl)];

    // Fetch feeds with timeout - don't let slow feeds block the page
    const feedPromises = allFeeds.map((url) =>
      parseRSSFeed(url, 3000).catch((err) => {
        handleActionError(err, { action: "getFilmNewsData", silent: true });
        return null;
      })
    );
    const feeds = await Promise.allSettled(feedPromises).then((results) =>
      results.map((result) => (result.status === "fulfilled" ? result.value : null))
    );

    // Combine all items from all feeds
    const allItems = feeds
      .filter((feed): feed is NonNullable<typeof feed> => feed !== null)
      .flatMap((feed) => feed.items);

    // Filter out reviews, TV shows, and opinion pieces about released films
    const filteredItems = allItems.filter((item) => {
      const title = item.title.toLowerCase();
      const description = item.description.toLowerCase();

      // Exclude TV shows - keywords that indicate TV content (aggressive filtering)
      const tvKeywords = [
        " tv ",
        " television",
        " season ",
        " episode",
        " show ",
        " streaming ",
        " netflix ",
        " hulu ",
        " disney+",
        " hbo ",
        " max ",
        " paramount+",
        " apple tv+",
        " peacock ",
        " prime video",
        " tv show",
        "tv series",
        "reality tv",
        "reality show",
        "bachelor",
        "bachelorette",
        "survivor",
        "big brother",
        "the voice",
        "american idol",
        "dancing with the stars",
        "anime ",
        " cartoon",
        " animated series",
        "sitcom",
        "crime series",
        "crime show",
        "drama series",
        "comedy series",
        "thriller series",
        "miniseries",
        "limited series",
        " anthology",
        "season finale",
        "season premiere",
        "renewed for",
        "canceled",
        "cancelled",
        "cast for",
        "joins cast",
        "leaves show",
        "golden bachelor",
        "golden bachelorette",
        "the golden",
        "competition show",
        "game show",
        "talk show",
        "late night",
        "daytime",
        "soap opera",
        "telenovela",
        "k-drama",
        "k-dramas",
        "korean drama",
        "korean dramas",
        "j-drama",
        "j-dramas",
        "japanese drama",
        "japanese dramas",
        "c-drama",
        "c-dramas",
        "chinese drama",
        "chinese dramas",
        "thai drama",
        "thai dramas",
        "spanish drama",
        "spanish dramas",
        "turkish drama",
        "turkish dramas",
        "british drama",
        "british dramas",
        "european drama",
        "european dramas",
      ];

      const hasTvKeyword = tvKeywords.some(
        (keyword) => title.includes(keyword) || description.includes(keyword)
      );

      // Check for patterns that indicate TV (e.g., "Season X", "Episode X")
      const tvPattern =
        /\b(season|episode)\s+\d+/i.test(title) ||
        /\b\d+\s+(season|episode)/i.test(title) ||
        /\bseason\s+\d+/i.test(title) ||
        /\bepisode\s+\d+/i.test(title) ||
        (/\bseries\s+\d+/i.test(title) && (/\bseason/i.test(title) || /\bepisode/i.test(title)));

      // Check for foreign drama patterns (K-drama, J-drama, etc.)
      const foreignDramaPattern =
        /\b(k|j|c|korean|japanese|chinese|thai|spanish|turkish|british|european)\s*[-]?\s*drama/i.test(
          title
        ) ||
        /\bdrama\s+(series|show)/i.test(title) ||
        (/\b(male|female)\s+leads/i.test(title) && /\bdrama/i.test(title)) ||
        (/\bdrama/i.test(title) && /\b(male|female)\s+leads/i.test(title));

      // Exclude if it mentions any streaming platform prominently (likely TV)
      const streamingPlatforms = [
        "netflix",
        "hulu",
        "disney+",
        "hbo",
        "max",
        "paramount+",
        "apple tv+",
        "peacock",
        "prime video",
        "amazon prime",
      ];
      const hasStreamingPlatform = streamingPlatforms.some(
        (platform) => title.includes(platform) && !title.includes("movie")
      );

      // Keywords that indicate reviews/opinions about released films
      const reviewKeywords = [
        " review",
        "rt score",
        "rotten tomatoes",
        "critics score",
        " critics say",
        "audience score",
        "box office",
        "opening weekend",
        " flop",
        " bomb",
        "disappoints",
        "disappointment",
        "verdict",
        "our take",
        "our review",
        "movie review",
        "film review",
        "review:",
        "review -",
        "gets ",
        "earns ",
        "receives ",
        "score",
        "rating:",
      ];

      const titleHasReviewKeyword = reviewKeywords.some((keyword) => title.includes(keyword));

      // Also check for patterns like "Movie Name Review" or "Review: Movie Name"
      const isReviewPattern =
        /^(.*\s)?review(\s|:|-|$)/i.test(title) ||
        /review(\s|:|-).*(score|rating|verdict)/i.test(title);

      // Exclude TV shows, reviews, and opinion pieces
      return (
        !hasTvKeyword &&
        !tvPattern &&
        !foreignDramaPattern &&
        !hasStreamingPlatform &&
        !titleHasReviewKeyword &&
        !isReviewPattern
      );
    });

    // Sort by publication date (newest first) and limit to 5
    const sortedItems = filteredItems
      .sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    // Determine which sources actually have items
    const sourceUrls = new Set(
      sortedItems.map((item) => {
        try {
          const url = new URL(item.link);
          return url.hostname.replace("www.", "");
        } catch {
          return "";
        }
      })
    );

    const sourceNames: string[] = [];
    if (sourceUrls.has("screenrant.com")) sourceNames.push("Screen Rant");
    if (sourceUrls.has("collider.com")) sourceNames.push("Collider");
    if (sourceUrls.has("slashfilm.com")) sourceNames.push("/Film");

    return {
      items: sortedItems,
      sources: sourceNames,
    };
  } catch (error) {
    handleActionError(error, { action: "getFilmNewsData", silent: true });
    return { items: [], sources: [] };
  }
}

// ============================================
// BACKROW MATINEE (FEATURED MOVIES)
// ============================================

/**
 * Get the current curated pick (admin-selected featured movie on the homepage)
 * Cached for 1 hour
 */
export async function getCurrentCuratedPick(): Promise<CuratedPick | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("curated:current");

  // Use anonymous client for public data (no cookies needed)
  const supabase = createPublicClient();

  try {
    // Get current active matinee
    const { data, error } = await supabase
      .from("backrow_matinee")
      .select(
        `
        id,
        tmdb_id,
        curator_note,
        featured_at,
        expires_at,
        movies:tmdb_id (
          title,
          poster_url,
          year,
          director,
          genres,
          slug
        )
      `
      )
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("featured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      handleActionError(error, { action: "getCurrentCuratedPick", silent: true });
      return null;
    }

    if (!data) {
      return null;
    }

    const moviesData = data.movies;
    const movie = Array.isArray(moviesData)
      ? (moviesData[0] as
          | {
              title: string;
              poster_url: string | null;
              year: string | null;
              director: string | null;
              genres: string[];
              slug: string | null;
            }
          | undefined)
      : (moviesData as
          | {
              title: string;
              poster_url: string | null;
              year: string | null;
              director: string | null;
              genres: string[];
              slug: string | null;
            }
          | null
          | undefined);

    if (!movie) {
      return null;
    }

    return {
      id: data.id,
      tmdb_id: data.tmdb_id,
      curator_note: data.curator_note,
      featured_at: data.featured_at,
      expires_at: data.expires_at,
      movie: {
        title: movie.title,
        poster_url: movie.poster_url,
        year: movie.year,
        director: movie.director,
        genres: movie.genres || [],
        slug: movie.slug || null,
      },
    };
  } catch (error) {
    handleActionError(error, { action: "getCurrentCuratedPick", silent: true });
    return null;
  }
}

// ============================================
// FEATURED CLUB
// ============================================

/**
 * Get featured club
 * Cached for 1 hour
 */
export async function getFeaturedClub(): Promise<FeaturedClub | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.featuredClub());
  cacheTag(CacheTags.clubsIndex());

  // Use anonymous client for public data (no cookies needed)
  const supabase = createPublicClient();

  try {
    // Get featured club with stats
    const { data: clubs, error: clubsError } = await supabase
      .from("clubs")
      .select(
        "id, name, slug, description, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
      )
      .eq("featured", true)
      .or("featured_until.is.null,featured_until.gt.now()")
      .eq("archived", false)
      .order("featured_at", { ascending: false })
      .limit(1);

    if (clubsError || !clubs || clubs.length === 0) {
      // Fallback: Get most active club (by member count and festivals)
      const { data: fallbackClubs, error: fallbackError } = await supabase
        .from("clubs")
        .select(
          "id, name, slug, description, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
        )
        .eq("archived", false)
        .eq("privacy", "public_open")
        .order("created_at", { ascending: false })
        .limit(10);

      if (fallbackError || !fallbackClubs || fallbackClubs.length === 0) {
        return null;
      }

      // Get stats for each club and pick the most active
      const clubsWithStats = await Promise.all(
        fallbackClubs.map(async (club) => {
          // Get festivals first
          const { data: clubFestivals } = await supabase
            .from("festivals")
            .select("id")
            .eq("club_id", club.id)
            .eq("status", "completed");

          const festIds = clubFestivals?.map((f) => f.id) || [];

          // Get all stats in parallel
          const [memberCount, festivalCount, ratingsResult] = await Promise.all([
            supabase
              .from("club_members")
              .select("*", { count: "exact", head: true })
              .eq("club_id", club.id),
            supabase
              .from("festivals")
              .select("*", { count: "exact", head: true })
              .eq("club_id", club.id)
              .eq("status", "completed"),
            festIds.length > 0
              ? supabase.from("ratings").select("rating").in("festival_id", festIds)
              : Promise.resolve({ data: [], error: null }),
          ]);

          // Calculate average rating
          let avgRating = 0;
          if (ratingsResult.data && ratingsResult.data.length > 0) {
            const sum = ratingsResult.data.reduce((acc, r) => acc + (r.rating || 0), 0);
            avgRating = sum / ratingsResult.data.length;
          }

          return {
            ...club,
            member_count: memberCount.count || 0,
            avg_rating: avgRating,
            festival_count: festivalCount.count || 0,
          };
        })
      );

      const mostActive = clubsWithStats.sort((a, b) => {
        const scoreA = a.member_count + a.festival_count * 5 + a.avg_rating * 10;
        const scoreB = b.member_count + b.festival_count * 5 + b.avg_rating * 10;
        return scoreB - scoreA;
      })[0];

      return {
        id: mostActive.id,
        slug: mostActive.slug,
        name: mostActive.name,
        description: mostActive.description,
        picture_url: mostActive.picture_url,
        avatar_icon: mostActive.avatar_icon,
        avatar_color_index: mostActive.avatar_color_index,
        avatar_border_color_index: mostActive.avatar_border_color_index,
        member_count: mostActive.member_count,
        avg_rating: mostActive.avg_rating,
        festival_count: mostActive.festival_count,
      };
    }

    const club = clubs[0];

    // Get festivals for this club first
    const { data: festivals } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", club.id)
      .eq("status", "completed");

    const festivalIds = festivals?.map((f) => f.id) || [];

    // Get stats for featured club
    const [memberCount, festivalCount, ratingsResult] = await Promise.all([
      supabase
        .from("club_members")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id),
      supabase
        .from("festivals")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id)
        .eq("status", "completed"),
      festivalIds.length > 0
        ? supabase.from("ratings").select("rating").in("festival_id", festivalIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Calculate average rating manually
    let avgRating = 0;
    if (ratingsResult.data && ratingsResult.data.length > 0) {
      const sum = ratingsResult.data.reduce((acc, r) => acc + (r.rating || 0), 0);
      avgRating = sum / ratingsResult.data.length;
    }

    return {
      id: club.id,
      slug: club.slug,
      name: club.name,
      description: club.description,
      picture_url: club.picture_url,
      avatar_icon: club.avatar_icon,
      avatar_color_index: club.avatar_color_index,
      avatar_border_color_index: club.avatar_border_color_index,
      member_count: memberCount.count || 0,
      avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      festival_count: festivalCount.count || 0,
    };
  } catch (error) {
    handleActionError(error, { action: "getFeaturedClub", silent: true });
    return null;
  }
}

// ============================================
// POPULAR MOVIES
// ============================================

/**
 * Get popular movies
 * Cached for 1 hour
 */
export async function getPopularMovies(limit: number = 12): Promise<PopularMovie[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.popularMovies());

  // Use anonymous client for public data (no cookies needed)
  const supabase = createPublicClient();

  try {
    // Get movies with popularity scores or calculate from generic_ratings
    const { data: movies, error } = await supabase
      .from("movies")
      .select(
        `
        tmdb_id,
        title,
        poster_url,
        year,
        popularity_score,
        slug
      `
      )
      .not("poster_url", "is", null)
      .order("popularity_score", { ascending: false })
      .limit(limit * 2); // Get more to filter out ones without ratings

    if (error || !movies) {
      handleActionError(error, { action: "getPopularMovies", silent: true });
      return [];
    }

    // Get average ratings for these movies from generic_ratings
    const tmdbIds = movies.map((m) => m.tmdb_id);
    const { data: ratings } = await supabase
      .from("generic_ratings")
      .select("tmdb_id, rating")
      .in("tmdb_id", tmdbIds);

    // Calculate average ratings per movie
    const ratingMap = new Map<number, { sum: number; count: number }>();
    if (ratings) {
      ratings.forEach((r) => {
        const existing = ratingMap.get(r.tmdb_id) || { sum: 0, count: 0 };
        ratingMap.set(r.tmdb_id, {
          sum: existing.sum + (r.rating || 0),
          count: existing.count + 1,
        });
      });
    }

    // Combine movies with their average ratings
    const moviesWithRatings = movies.map((movie) => ({
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      poster_url: movie.poster_url,
      year: movie.year,
      popularity_score: movie.popularity_score || 0,
      slug: movie.slug || null,
      avg_rating: (() => {
        const rating = ratingMap.get(movie.tmdb_id);
        return rating && rating.count > 0
          ? Math.round((rating.sum / rating.count) * 10) / 10
          : null;
      })(),
    }));

    // Sort by popularity_score (or avg_rating if popularity_score is 0)
    const sorted = moviesWithRatings.sort((a, b) => {
      const scoreA = a.popularity_score || (a.avg_rating || 0) * 10;
      const scoreB = b.popularity_score || (b.avg_rating || 0) * 10;
      return scoreB - scoreA;
    });

    return sorted.slice(0, limit);
  } catch (error) {
    handleActionError(error, { action: "getPopularMovies", silent: true });
    return [];
  }
}
