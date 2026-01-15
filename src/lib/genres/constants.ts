/**
 * Genre constants and utilities — server-safe (no Phosphor icon imports).
 * For icon rendering, use GenreIcon component (client-side).
 */

export interface GenreInfo {
  slug: string;
  name: string;
  tmdbId: number;
}

export const MAX_CLUB_GENRES = 3;

export const CLUB_GENRES: GenreInfo[] = [
  { slug: "action", name: "Action", tmdbId: 28 },
  { slug: "adventure", name: "Adventure", tmdbId: 12 },
  { slug: "animation", name: "Animation", tmdbId: 16 },
  { slug: "comedy", name: "Comedy", tmdbId: 35 },
  { slug: "crime", name: "Crime", tmdbId: 80 },
  { slug: "documentary", name: "Documentary", tmdbId: 99 },
  { slug: "drama", name: "Drama", tmdbId: 18 },
  { slug: "family", name: "Family", tmdbId: 10751 },
  { slug: "fantasy", name: "Fantasy", tmdbId: 14 },
  { slug: "history", name: "History", tmdbId: 36 },
  { slug: "horror", name: "Horror", tmdbId: 27 },
  { slug: "music", name: "Music", tmdbId: 10402 },
  { slug: "mystery", name: "Mystery", tmdbId: 9648 },
  { slug: "romance", name: "Romance", tmdbId: 10749 },
  { slug: "sci-fi", name: "Sci-Fi", tmdbId: 878 },
  { slug: "thriller", name: "Thriller", tmdbId: 53 },
  { slug: "war", name: "War", tmdbId: 10752 },
  { slug: "western", name: "Western", tmdbId: 37 },
];

/** O(1) lookup by slug */
export const GENRE_BY_SLUG = new Map<string, GenreInfo>(CLUB_GENRES.map((g) => [g.slug, g]));

const validSlugs = new Set(CLUB_GENRES.map((g) => g.slug));

export function getGenreBySlug(slug: string): GenreInfo | undefined {
  return GENRE_BY_SLUG.get(slug);
}

export function getGenreNames(slugs: string[]): string[] {
  return slugs.map((s) => GENRE_BY_SLUG.get(s)?.name).filter((n): n is string => !!n);
}

export function validateGenres(genres: string[]): {
  isValid: boolean;
  errors: string[];
  validGenres: string[];
} {
  const errors: string[] = [];
  const seen = new Set<string>();
  const validGenres: string[] = [];

  if (genres.length > MAX_CLUB_GENRES) {
    errors.push(`Maximum ${MAX_CLUB_GENRES} genres allowed`);
  }

  for (const genre of genres) {
    if (!validSlugs.has(genre)) {
      errors.push(`Invalid genre: ${genre}`);
    } else if (seen.has(genre)) {
      errors.push(`Duplicate genre: ${genre}`);
    } else {
      seen.add(genre);
      validGenres.push(genre);
    }
  }

  // Enforce max even on valid genres
  const trimmed = validGenres.slice(0, MAX_CLUB_GENRES);

  return {
    isValid: errors.length === 0,
    errors,
    validGenres: trimmed,
  };
}
