// TMDB API client
// Note: User must provide TMDB_API_KEY in environment variables

import { env } from "@/lib/config/env";
import { retryWithBackoff } from "@/lib/retry";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_REQUEST_TIMEOUT_MS = 3000;

function getTmdbApiKey(): string {
  const apiKey = env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured");
  }
  return apiKey;
}

// Wraps 5xx so retry kicks in; .catch below unwraps so callers still get a Response.
class TmdbTransientError extends Error {
  constructor(public response: Response) {
    super(`TMDB ${response.status}`);
    this.name = "TmdbTransientError";
  }
}

/** Fetch from TMDB with API key auth, 3s timeout, and 2 retries on network/5xx. */
function tmdbFetch(url: string, options?: { revalidate?: number }): Promise<Response> {
  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}api_key=${getTmdbApiKey()}`;
  const next = options?.revalidate ? { revalidate: options.revalidate } : undefined;

  return retryWithBackoff(async () => {
    const response = await fetch(fullUrl, {
      next,
      signal: AbortSignal.timeout(TMDB_REQUEST_TIMEOUT_MS),
    });
    if (response.status >= 500) throw new TmdbTransientError(response);
    return response;
  }).catch((err: unknown) => {
    if (err instanceof TmdbTransientError) return err.response;
    throw err;
  });
}

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  tagline: string | null;
  runtime: number | null;
  status?: string;
  budget?: number;
  revenue?: number;
  genres: { id: number; name: string }[];
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    crew: Array<{ id: number; name: string; job: string; profile_path: string | null }>;
  };
  external_ids?: {
    imdb_id: string | null;
    wikidata_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        release_date: string;
        type: number;
      }>;
    }>;
  };
  images?: {
    backdrops: Array<{
      file_path: string;
      width: number;
      height: number;
      vote_average: number;
      vote_count: number;
      iso_639_1: string | null;
    }>;
  };
}

export interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity?: number;
  movie_credits: {
    cast: Array<{
      id: number;
      title: string;
      poster_path: string | null;
      backdrop_path: string | null;
      character: string;
      release_date: string;
      popularity: number;
      vote_count: number;
      vote_average: number;
    }>;
    crew: Array<{
      id: number;
      title: string;
      poster_path: string | null;
      backdrop_path: string | null;
      job: string;
      release_date: string;
      popularity: number;
      vote_count: number;
      vote_average: number;
    }>;
  };
  external_ids?: {
    imdb_id: string | null;
    wikidata_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
}

export interface TMDBMovieSearchResult {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  popularity: number;
  vote_count: number;
  vote_average: number;
  overview: string;
  genre_ids: number[];
  original_language: string;
  /** Enriched from our DB cache (not from TMDB search) */
  director?: string | null;
  /** Enriched from our DB cache (not from TMDB search) */
  cast?: string[] | null;
}

export interface TMDBPersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export async function searchMovies(query: string, year?: number): Promise<TMDBMovieSearchResult[]> {
  let url = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false`;
  if (year) {
    url += `&year=${year}`;
  }

  const response = await tmdbFetch(url, { revalidate: 3600 });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }

  const data = await response.json();
  const results = (data.results || []) as TMDBMovieSearchResult[];

  // Sort by popularity (descending) so famous movies appear first
  // e.g., "titan" returns Titanic before obscure movies named Titan
  // Secondary sort by vote_count to prefer well-known movies
  return results.sort((a, b) => {
    // Heavily weight popularity but also consider vote count
    const scoreA = (a.popularity || 0) + (a.vote_count || 0) * 0.01;
    const scoreB = (b.popularity || 0) + (b.vote_count || 0) * 0.01;
    return scoreB - scoreA;
  });
}

export async function getMovieDetails(movieId: number): Promise<TMDBMovie> {
  const response = await tmdbFetch(
    `${TMDB_BASE_URL}/movie/${movieId}?language=en-US&append_to_response=credits,external_ids,release_dates,images`,
    { revalidate: 86400 }
  );

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Extract US MPAA certification from TMDB release_dates
 * @param releaseDates - The release_dates object from TMDB movie details
 * @returns The certification string (e.g., "PG-13", "R") or null if not found
 */
export function extractUSCertification(releaseDates: TMDBMovie["release_dates"]): string | null {
  if (!releaseDates?.results) return null;

  // Find US release dates
  const usRelease = releaseDates.results.find((r) => r.iso_3166_1 === "US");
  if (!usRelease?.release_dates) return null;

  // Find a release date with a certification
  // Prefer theatrical releases (type 3) but accept any with certification
  const theatrical = usRelease.release_dates.find((rd) => rd.type === 3 && rd.certification);
  if (theatrical?.certification) return theatrical.certification;

  // Fallback to any release with certification
  const anyWithCert = usRelease.release_dates.find((rd) => rd.certification);
  return anyWithCert?.certification || null;
}

export async function getPersonDetails(personId: number): Promise<TMDBPerson> {
  const response = await tmdbFetch(
    `${TMDB_BASE_URL}/person/${personId}?append_to_response=movie_credits,external_ids`,
    { revalidate: 86400 }
  );

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }

  return await response.json();
}

export async function searchPeople(query: string): Promise<TMDBPersonSearchResult[]> {
  const searchQueries = [query.trim()];

  // For multi-word queries, also try variations
  const words = query.trim().split(/\s+/);
  if (words.length >= 2) {
    // Try reversed order (e.g., "Nolan Christopher" -> "Christopher Nolan")
    searchQueries.push(words.reverse().join(" "));
    // Try just first word if it's likely a last name search
    if (words[0].length > 2) {
      searchQueries.push(words[0]);
    }
  }

  // Run searches in parallel - fetch multiple pages to get more results
  const allResults: TMDBPersonSearchResult[] = [];
  const seenIds = new Set<number>();

  // Create search tasks for each query with 5 pages each (100 results per query)
  const searchTasks: { query: string; page: number }[] = [];
  for (const q of searchQueries) {
    for (let page = 1; page <= 5; page++) {
      searchTasks.push({ query: q, page });
    }
  }

  await Promise.all(
    searchTasks.map(async ({ query: q, page }) => {
      try {
        const response = await tmdbFetch(
          `${TMDB_BASE_URL}/search/person?query=${encodeURIComponent(q)}&include_adult=false&page=${page}`,
          { revalidate: 3600 }
        );

        if (response.ok) {
          const data = await response.json();
          const results = (data.results || []) as TMDBPersonSearchResult[];
          for (const person of results) {
            if (!seenIds.has(person.id)) {
              seenIds.add(person.id);
              allResults.push(person);
            }
          }
        }
      } catch {
        // Silently ignore individual search failures
      }
    })
  );

  // Score results by how well they match the original query
  // For short queries, popularity matters more (famous people should surface)
  // For longer/more specific queries, name match matters more
  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/);
  const isShortQuery = lowerQuery.length <= 6;

  const scoredResults = allResults.map((person) => {
    const name = person.name.toLowerCase();
    const popularity = person.popularity || 0;

    // Scale popularity more heavily - famous people should rank high
    // Popularity ranges from 0-100+ typically, so multiply to make it significant
    let score = popularity * 10;

    // Name match bonuses (scaled down for short queries where popularity matters more)
    const matchMultiplier = isShortQuery ? 0.5 : 1;

    // Exact match bonus
    if (name === lowerQuery) {
      score += 1000 * matchMultiplier;
    }
    // Starts with query bonus
    else if (name.startsWith(lowerQuery)) {
      score += 300 * matchMultiplier;
    }
    // Last name starts with query (e.g., "villeneuve" matches "Denis Villeneuve")
    else if (name.split(" ").some((part) => part.startsWith(lowerQuery))) {
      score += 250 * matchMultiplier;
    }
    // Contains all query words bonus
    else if (queryWords.every((w) => name.includes(w))) {
      score += 200 * matchMultiplier;
    }
    // Contains any query word bonus
    else if (queryWords.some((w) => name.includes(w))) {
      score += 50 * matchMultiplier;
    }

    return { person, score };
  });

  // Sort by score descending
  return scoredResults.sort((a, b) => b.score - a.score).map((r) => r.person);
}

export function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}

/**
 * Get a trending movie backdrop URL for hero/marketing use.
 * Returns a random original-size backdrop from TMDB's weekly trending list
 * (TMDB's largest available — typically 1920×1080, occasionally 3840×2160).
 * Next.js Image optimizes delivery per viewport up to 4K (3840w).
 * Revalidates every hour so the image stays fresh.
 */
export async function getTrendingBackdropUrl(): Promise<string | null> {
  try {
    const response = await tmdbFetch(`${TMDB_BASE_URL}/trending/movie/week`, {
      revalidate: 3600,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const movies = (data.results || []).filter(
      (m: { backdrop_path: string | null }) => m.backdrop_path
    );

    if (movies.length === 0) return null;

    const movie = movies[Math.floor(Math.random() * movies.length)];
    return `https://image.tmdb.org/t/p/original${movie.backdrop_path}`;
  } catch {
    return null;
  }
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface WatchProviders {
  results: {
    [region: string]: {
      link: string;
      flatrate?: WatchProvider[];
      rent?: WatchProvider[];
      buy?: WatchProvider[];
    };
  };
}

/**
 * Get watch providers for a movie
 * @param movieId - TMDB movie ID
 * @param region - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB'). Defaults to 'US'
 */
export async function getWatchProviders(
  movieId: number,
  _region: string = "US"
): Promise<WatchProviders | null> {
  const response = await tmdbFetch(`${TMDB_BASE_URL}/movie/${movieId}/watch/providers`, {
    revalidate: 86400,
  });

  if (!response.ok) {
    console.error(`TMDB API error: ${response.statusText}`);
    return null;
  }

  return await response.json();
}
