export interface MovieSearchResult {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_url: string | null;
  slug?: string;
}

export interface ActorSearchResult {
  id?: number;
  name: string;
  slug?: string;
  profile_url: string | null;
  movies: string[];
  popularity?: number;
  known_for_department?: string;
}

export interface DirectorSearchResult {
  id?: number;
  name: string;
  slug?: string;
  profile_url: string | null;
  movies: string[];
  popularity?: number;
  known_for_department?: string;
}

export interface NoteSearchResult {
  id: string;
  preview: string;
  club_id: string | null;
  club_name: string | null;
  movie_title: string | null;
  tmdb_id: number | null;
}

export interface UserSearchResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface ComposerSearchResult {
  id?: number;
  name: string;
  slug?: string;
  profile_url: string | null;
  movies: string[];
  popularity?: number;
  known_for_department?: string;
}

export interface DiscussionSearchResult {
  id: string;
  slug: string | null;
  title: string;
  club_id: string;
  club_name: string | null;
  club_slug: string | null;
  preview: string | null;
}

export interface SearchResults {
  movies: MovieSearchResult[];
  actors: ActorSearchResult[];
  directors: DirectorSearchResult[];
  composers: ComposerSearchResult[];
  notes: NoteSearchResult[];
  discussions: DiscussionSearchResult[];
}
