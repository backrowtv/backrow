"use server";

import { env } from "@/lib/config/env";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  overview: string;
}

interface TMDBResponse {
  results: TMDBMovie[];
  page: number;
  total_pages: number;
  total_results: number;
}

async function fetchTMDB<T>(endpoint: string): Promise<T | null> {
  const apiKey = env.TMDB_API_KEY;
  if (!apiKey) {
    // Silently return null if TMDB not configured - graceful degradation
    return null;
  }

  try {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${apiKey}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      // Silently return null for API errors - graceful degradation
      return null;
    }

    return response.json();
  } catch {
    // Silently return null for any errors - graceful degradation
    return null;
  }
}

export async function getNowPlayingMovies(): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBResponse>("/movie/now_playing?language=en-US&page=1&region=US");
  return data?.results?.slice(0, 10) || [];
}

export async function getUpcomingMovies(): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBResponse>("/movie/upcoming?language=en-US&page=1&region=US");

  // Filter to only show movies that are actually upcoming (release date is in the future)
  const now = new Date();
  const upcoming =
    data?.results?.filter((movie) => {
      const releaseDate = new Date(movie.release_date);
      return releaseDate > now;
    }) || [];

  // Sort by release date (closest first)
  upcoming.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());

  return upcoming.slice(0, 8);
}

export async function getPopularMovies(): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBResponse>("/movie/popular?language=en-US&page=1");
  return data?.results?.slice(0, 10) || [];
}

export async function getTrendingMovies(): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBResponse>("/trending/movie/week?language=en-US");
  return data?.results?.slice(0, 10) || [];
}

export async function searchMovies(query: string): Promise<
  | Array<{
      id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
    }>
  | { error: string }
> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const data = await fetchTMDB<TMDBResponse>(
    `/search/movie?query=${encodedQuery}&language=en-US&page=1&include_adult=false`
  );

  if (!data?.results) {
    return { error: "Failed to search movies" };
  }

  return data.results.map((movie) => ({
    id: movie.id,
    title: movie.title,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    poster_path: movie.poster_path,
  }));
}

// Movie details for display (used by Future Nominations page)
export interface CrewMemberForDisplay {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface MovieDetailsForDisplay {
  tmdb_id: number;
  title: string;
  year: number | null;
  overview: string;
  cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
  directors: CrewMemberForDisplay[];
  writers: CrewMemberForDisplay[];
  cinematographers: CrewMemberForDisplay[];
  composers: CrewMemberForDisplay[];
  editors: CrewMemberForDisplay[];
  productionDesigners: CrewMemberForDisplay[];
  costumeDesigners: CrewMemberForDisplay[];
  studio: string | null;
  external_ids: {
    imdb_id: string | null;
    wikidata_id: string | null;
  };
  // Additional stats for quick display
  budget: number | null;
  revenue: number | null;
  vote_average: number | null;
  runtime: number | null;
  certification: string | null; // MPAA rating (e.g., "PG-13", "R")
  status: string | null; // e.g., "Released", "Post Production"
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  status?: string;
  budget?: number;
  revenue?: number;
  vote_average?: number;
  runtime?: number;
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    crew: Array<{ id: number; name: string; job: string; profile_path: string | null }>;
  };
  external_ids?: {
    imdb_id: string | null;
    wikidata_id: string | null;
  };
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        type: number;
      }>;
    }>;
  };
}

/**
 * Get full movie details for display purposes (used by Future Nominations page)
 * Fetches overview, credits (cast/crew), production companies, external IDs, and certification
 */
export async function getMovieDetailsForDisplay(
  tmdbId: number
): Promise<MovieDetailsForDisplay | null> {
  const data = await fetchTMDB<TMDBMovieDetails>(
    `/movie/${tmdbId}?language=en-US&append_to_response=credits,external_ids,release_dates`
  );

  if (!data) {
    return null;
  }

  const allCrew = data.credits?.crew || [];

  const extractCrew = (jobs: string[]): CrewMemberForDisplay[] => {
    const seen = new Set<number>();
    return allCrew
      .filter((p) => jobs.includes(p.job) && !seen.has(p.id) && (seen.add(p.id), true))
      .map((p) => ({ id: p.id, name: p.name, profile_path: p.profile_path }));
  };

  const directors = extractCrew(["Director"]);
  const writers = extractCrew(["Writer", "Screenplay", "Story"]);
  const cinematographers = extractCrew(["Director of Photography"]);
  const composers = extractCrew(["Original Music Composer", "Music"]);
  const editors = extractCrew(["Editor"]);
  const productionDesigners = extractCrew(["Production Design", "Production Designer"]);
  const costumeDesigners = extractCrew(["Costume Design", "Costume Designer"]);

  // Get top 8 cast members
  const cast = (data.credits?.cast || []).slice(0, 8);

  // Get the first production company as the studio
  const studio = data.production_companies?.[0]?.name || null;

  // Extract US certification (MPAA rating)
  let certification: string | null = null;
  if (data.release_dates?.results) {
    const usRelease = data.release_dates.results.find((r) => r.iso_3166_1 === "US");
    if (usRelease?.release_dates) {
      // Prefer theatrical releases (type 3) but accept any with certification
      const theatrical = usRelease.release_dates.find((rd) => rd.type === 3 && rd.certification);
      if (theatrical?.certification) {
        certification = theatrical.certification;
      } else {
        // Fallback to any release with certification
        const anyWithCert = usRelease.release_dates.find((rd) => rd.certification);
        certification = anyWithCert?.certification || null;
      }
    }
  }

  return {
    tmdb_id: data.id,
    title: data.title,
    year: data.release_date ? new Date(data.release_date).getFullYear() : null,
    overview: data.overview || "",
    cast,
    directors,
    writers,
    cinematographers,
    composers,
    editors,
    productionDesigners,
    costumeDesigners,
    studio,
    external_ids: {
      imdb_id: data.external_ids?.imdb_id || null,
      wikidata_id: data.external_ids?.wikidata_id || null,
    },
    // Additional stats
    budget: data.budget && data.budget > 0 ? data.budget : null,
    revenue: data.revenue && data.revenue > 0 ? data.revenue : null,
    vote_average: data.vote_average && data.vote_average > 0 ? data.vote_average : null,
    runtime: data.runtime && data.runtime > 0 ? data.runtime : null,
    certification,
    status: data.status || null,
  };
}
