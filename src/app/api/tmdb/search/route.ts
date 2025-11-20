import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb/client";
import { rateLimit, getRateLimitResponse, addRateLimitHeaders } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResult = await rateLimit(request);
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.reset);
  }

  const searchParams = request.nextUrl.searchParams;
  // Accept both 'q' and 'query' parameters for flexibility
  const query = searchParams.get("q") || searchParams.get("query");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter "q" or "query" is required' },
      { status: 400 }
    );
  }

  // Parse year from query: "Halloween 2018" → query="Halloween", year=2018
  // Only extract if there's non-year text too (bare "1984" should search as title)
  let searchQuery = query.trim();
  let year: number | undefined;

  const yearMatch = searchQuery.match(/\b(1[89]\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const potentialQuery = searchQuery.replace(yearMatch[0], "").trim();
    if (potentialQuery.length >= 1) {
      year = parseInt(yearMatch[1], 10);
      searchQuery = potentialQuery;
    }
  }

  try {
    const results = await searchMovies(searchQuery, year);

    // Enrich results with director/cast from our movies cache (no extra TMDB calls)
    const tmdbIds = results.map((r) => r.id);
    if (tmdbIds.length > 0) {
      const supabase = await createClient();
      const { data: cached } = await supabase
        .from("movies")
        .select('tmdb_id, director, "cast"')
        .in("tmdb_id", tmdbIds);

      if (cached && cached.length > 0) {
        const cacheMap = new Map(cached.map((m) => [m.tmdb_id, m]));
        for (const result of results) {
          const movie = cacheMap.get(result.id);
          if (movie) {
            result.director = movie.director;
            result.cast = movie.cast;
          }
        }
      }
    }

    const response = NextResponse.json({ results });
    addRateLimitHeaders(response, rateLimitResult);
    // Cache search results for 1 hour, stale-while-revalidate for 24 hours
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return response;
  } catch (error) {
    console.error("TMDB search error:", error);
    return NextResponse.json({ error: "Failed to search movies" }, { status: 500 });
  }
}
