import { NextRequest, NextResponse } from "next/server";
import { parseRSSFeed } from "@/lib/rss/parser";
import { movieHeadlinesFeeds } from "@/data/film-news";
import { rateLimit, getRateLimitResponse } from "@/lib/security/rate-limit";

/**
 * API route to fetch and combine movie headlines from multiple RSS feeds
 * Returns top 5 headlines from ComingSoon.net and SlashFilm combined
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.reset);
  }
  try {
    // Fetch feeds in parallel with timeout - don't let slow feeds block
    const feedPromises = movieHeadlinesFeeds.map((feed) =>
      parseRSSFeed(feed.rssUrl, 3000).catch((err) => {
        console.error(`Failed to fetch RSS feed ${feed.rssUrl}:`, err.message);
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

    // Sort by publication date (newest first) and limit to 5
    const sortedItems = allItems
      .sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    return NextResponse.json({ items: sortedItems });
  } catch (error) {
    console.error("Error fetching movie headlines:", error);
    return NextResponse.json({ error: "Failed to fetch movie headlines" }, { status: 500 });
  }
}
