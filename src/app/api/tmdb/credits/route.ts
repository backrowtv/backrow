import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { rateLimit, getRateLimitResponse } from "@/lib/security/rate-limit";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request);
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.reset);
  }
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get("id");

  if (!movieId) {
    return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
  }

  const apiKey = env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${apiKey}&language=en-US`,
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      cast: data.cast || [],
      crew: data.crew || [],
    });
  } catch (error) {
    console.error("TMDB credits error:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
