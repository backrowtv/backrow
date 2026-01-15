import { NextRequest, NextResponse } from "next/server";
import { getUpcomingMovies } from "@/lib/tmdb/upcoming";
import { rateLimit, getRateLimitResponse } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.reset);
  }
  try {
    const movies = await getUpcomingMovies(25); // Fetch 25 movies for horizontal scroll
    const response = NextResponse.json(movies);
    // Cache upcoming movies for 24 hours, stale-while-revalidate for 7 days
    response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return response;
  } catch (error) {
    console.error("Error fetching upcoming movies:", error);
    return NextResponse.json([], { status: 500 });
  }
}
