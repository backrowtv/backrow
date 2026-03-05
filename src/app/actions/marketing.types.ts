export interface UpcomingMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
}

export interface FilmNewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
}

export interface FilmNewsData {
  items: FilmNewsItem[];
  sources?: string[];
}

export interface MatineeMovie {
  id: string;
  tmdb_id: number;
  curator_note: string | null;
  featured_at: string;
  expires_at: string | null;
  movie: {
    title: string;
    poster_url: string | null;
    year: string | null;
    director: string | null;
    genres: string[];
    slug: string | null;
  };
}

export interface FeaturedClub {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  picture_url: string | null;
  avatar_icon?: string | null;
  avatar_color_index?: number | null;
  avatar_border_color_index?: number | null;
  member_count: number;
  avg_rating: number;
  festival_count: number;
}

export interface PopularMovie {
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  year: string | null;
  popularity_score: number;
  avg_rating: number | null;
  slug: string | null;
}
