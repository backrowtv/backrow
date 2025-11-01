export interface CuratedMovie {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  overview?: string;
}

export interface CuratedCollection {
  id: string;
  name: string;
  slug: string;
  title: string;
  subtitle: string | null;
  emoji: string | null;
  movies: CuratedMovie[];
  is_active: boolean;
  display_order: number;
  show_on_search: boolean;
  show_on_home: boolean;
  created_at: string;
  updated_at: string;
}
