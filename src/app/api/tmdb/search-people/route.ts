import { NextRequest, NextResponse } from "next/server";
import { searchPeople, getPersonDetails } from "@/lib/tmdb/client";
import { searchFamousPeople } from "@/lib/tmdb/famous-people";
import { rateLimit, getRateLimitResponse, addRateLimitHeaders } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResult = await rateLimit(request);
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.reset);
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const type = searchParams.get("type") as "director" | "composer" | null;

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // Search TMDB normally
    const tmdbResults = await searchPeople(query.trim());

    // Also search our curated famous people list for directors/composers
    let famousMatches: { id: number; name: string }[] = [];
    if (type === "director" || type === "composer") {
      famousMatches = searchFamousPeople(query.trim(), type);
    } else {
      // If no type specified, search both
      famousMatches = [
        ...searchFamousPeople(query.trim(), "director"),
        ...searchFamousPeople(query.trim(), "composer"),
      ];
    }

    // Get full details for famous matches that aren't already in TMDB results
    const tmdbIds = new Set(tmdbResults.map((r) => r.id));
    const newFamousIds = famousMatches.filter((f) => !tmdbIds.has(f.id));

    // Fetch details for famous people not in results (in parallel)
    const famousDetails = await Promise.all(
      newFamousIds.slice(0, 5).map(async (famous) => {
        try {
          const details = await getPersonDetails(famous.id);
          return {
            id: details.id,
            name: details.name,
            profile_path: details.profile_path,
            known_for_department: details.known_for_department || "Directing",
            popularity: details.popularity || 100, // Famous people get high popularity
          };
        } catch {
          return null;
        }
      })
    );

    // Filter out nulls and combine: famous first, then TMDB results
    const validFamousDetails = famousDetails.filter(Boolean);
    const combinedResults = [...validFamousDetails, ...tmdbResults];

    // Dedupe by ID (keep first occurrence, which prioritizes famous people)
    const seenIds = new Set<number>();
    const dedupedResults = combinedResults.filter((person) => {
      if (!person || seenIds.has(person.id)) return false;
      seenIds.add(person.id);
      return true;
    });

    const response = NextResponse.json({ results: dedupedResults });
    addRateLimitHeaders(response, rateLimitResult);
    return response;
  } catch (error) {
    console.error("TMDB person search error:", error);
    return NextResponse.json({ error: "Failed to search people" }, { status: 500 });
  }
}
