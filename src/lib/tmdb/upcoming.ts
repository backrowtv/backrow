/**
 * TMDB Upcoming Movies
 *
 * Fetch upcoming movie releases from TMDB
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export interface UpcomingMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
}

export async function getUpcomingMovies(limit: number = 10): Promise<UpcomingMovie[]> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    console.warn("TMDB_API_KEY is not configured");
    return [];
  }

  try {
    // Fetch multiple pages if needed to get enough movies
    const movies: UpcomingMovie[] = [];
    let page = 1;
    const maxPages = Math.ceil(limit / 20); // TMDB returns 20 per page

    while (movies.length < limit && page <= maxPages) {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/upcoming?region=US&page=${page}&api_key=${apiKey}`,
        {
          next: { revalidate: 86400 }, // Cache for 24 hours
        }
      );

      if (!response.ok) {
        console.error(`TMDB API error: ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const pageMovies = (data.results || []).map(
        (movie: {
          id: number;
          title: string;
          release_date: string;
          poster_path: string | null;
          overview: string;
        }) => ({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          overview: movie.overview,
        })
      );

      movies.push(...pageMovies);
      page++;

      // If we got less than 20 movies, we've reached the end
      if (pageMovies.length < 20) break;
    }

    return movies.slice(0, limit);
  } catch (error) {
    console.error("Error fetching upcoming movies:", error);
    return [];
  }
}

export function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}
