import { NextRequest, NextResponse } from "next/server";
import { parseRSSFeed } from "@/lib/rss/parser";
import { primaryFilmNewsFeed, movieHeadlinesFeeds } from "@/data/film-news";
import { rateLimit, getRateLimitResponse } from "@/lib/security/rate-limit";

/**
 * Combined movie news API - fetches from Variety, ComingSoon.net, and SlashFilm
 * Returns all items sorted by date (newest first)
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.reset);
  }
  try {
    // Fetch all feeds in parallel
    const allFeeds = [primaryFilmNewsFeed, ...movieHeadlinesFeeds.map((feed) => feed.rssUrl)];

    // Fetch feeds with timeout - don't let slow feeds block the page
    const feedPromises = allFeeds.map((url) =>
      parseRSSFeed(url, 3000).catch((err) => {
        console.error(`Failed to fetch RSS feed ${url}:`, err.message);
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
      // Note: "series" alone is NOT filtered - it could be a movie franchise
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
        // Foreign TV shows
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
      // "Series X" alone could be a movie franchise, so only filter when combined with season/episode
      const tvPattern =
        /\b(season|episode)\s+\d+/i.test(title) ||
        /\b\d+\s+(season|episode)/i.test(title) ||
        /\bseason\s+\d+/i.test(title) ||
        /\bepisode\s+\d+/i.test(title) ||
        // "Series X" with "season" or "episode" nearby indicates TV
        (/\bseries\s+\d+/i.test(title) && (/\bseason/i.test(title) || /\bepisode/i.test(title)));

      // Check for foreign drama patterns (K-drama, J-drama, etc.) - these are TV shows
      // Only filter "male leads"/"female leads" when combined with drama keywords (TV context)
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
        (platform) =>
          title.toLowerCase().includes(platform) && !title.toLowerCase().includes("movie")
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

      // Check if title contains review keywords
      const titleHasReviewKeyword = reviewKeywords.some((keyword) => title.includes(keyword));

      // Also check for patterns like "Movie Name Review" or "Review: Movie Name"
      const isReviewPattern =
        /^(.*\s)?review(\s|:|-|$)/i.test(title) ||
        /review(\s|:|-).*(score|rating|verdict)/i.test(title);

      // Exclude TV shows, reviews, and opinion pieces
      // Also exclude if it's prominently about streaming platforms (likely TV content)
      // Exclude foreign TV dramas (K-drama, J-drama, etc.)
      return (
        !hasTvKeyword &&
        !tvPattern &&
        !foreignDramaPattern &&
        !hasStreamingPlatform &&
        !titleHasReviewKeyword &&
        !isReviewPattern
      );
    });

    // Sort by publication date (newest first)
    const sortedItems = filteredItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    // Determine which sources actually have items in the filtered results
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

    // Map hostnames to source names
    const sourceNames: string[] = [];
    if (sourceUrls.has("screenrant.com")) sourceNames.push("Screen Rant");
    if (sourceUrls.has("collider.com")) sourceNames.push("Collider");
    if (sourceUrls.has("slashfilm.com")) sourceNames.push("/Film");

    const descriptionText =
      sourceNames.length > 0
        ? `Latest headlines from ${sourceNames.join(", ")}.`
        : "Latest movie headlines.";

    // Return in the same format as before
    const response = NextResponse.json({
      title: "Movie News",
      description: descriptionText,
      items: sortedItems,
      sources: sourceNames,
    });
    // Cache film news for 1 hour, stale-while-revalidate for 6 hours
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=21600");
    return response;
  } catch (error) {
    console.error("Error fetching film news:", error);
    return NextResponse.json({ error: "Failed to fetch film news" }, { status: 500 });
  }
}
