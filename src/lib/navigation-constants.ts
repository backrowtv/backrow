// Navigation constants - shared between client and server

// Movie page external link types
export const MOVIE_LINK_TYPES = ["imdb", "letterboxd", "trakt", "tmdb", "wikipedia"] as const;

export type MovieLinkType = (typeof MOVIE_LINK_TYPES)[number];

export interface MovieLinkConfig {
  id: MovieLinkType;
  label: string;
  description: string;
}

export const MOVIE_LINK_CONFIG: Record<MovieLinkType, MovieLinkConfig> = {
  imdb: { id: "imdb", label: "IMDb", description: "Internet Movie Database" },
  letterboxd: { id: "letterboxd", label: "Letterboxd", description: "Social film discovery" },
  trakt: { id: "trakt", label: "Trakt", description: "Track what you watch" },

  tmdb: { id: "tmdb", label: "TMDB", description: "The Movie Database" },
  wikipedia: { id: "wikipedia", label: "Wikipedia", description: "Encyclopedia article" },
};

// Default: IMDb, Letterboxd, Wikipedia — Trakt and TMDB hidden by default
export const DEFAULT_VISIBLE_MOVIE_LINKS: MovieLinkType[] = ["imdb", "letterboxd", "wikipedia"];

export interface MovieLinkPreferences {
  visibleLinks: MovieLinkType[];
}

// Mobile nav items (bottom bar)
export const VALID_NAV_ITEMS = [
  "home",
  "clubs",
  "search",
  "discover",
  "profile",
  "activity",
  "favorite_club",
  "timeline",
] as const;

export type NavItemId = (typeof VALID_NAV_ITEMS)[number];

// Desktop sidebar items (main sidebar - these cannot be removed, only reordered)
export const SIDEBAR_NAV_ITEMS = [
  "home",
  "clubs",
  "search",
  "discover",
  "activity",
  "timeline",
  "profile",
] as const;

export type SidebarNavItemId = (typeof SIDEBAR_NAV_ITEMS)[number];

export type MenuPosition = "left" | "right";

export interface MobileNavPreferences {
  items: NavItemId[];
  itemCount: number;
  favoriteClubId?: string | null;
  hideLabels?: boolean;
  menuPosition?: MenuPosition;
}

export interface SidebarNavPreferences {
  itemOrder: SidebarNavItemId[];
}

// Default preferences
export const DEFAULT_NAV_PREFERENCES: MobileNavPreferences = {
  items: ["clubs", "home", "profile", "favorite_club"],
  itemCount: 5,
  favoriteClubId: null,
  hideLabels: false,
  menuPosition: "left",
};

export const DEFAULT_SIDEBAR_PREFERENCES: SidebarNavPreferences = {
  itemOrder: ["home", "clubs", "search", "discover", "activity", "timeline", "profile"],
};
