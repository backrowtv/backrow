/**
 * Consistent color mappings for movie genres and crew roles.
 *
 * Each color is defined as an HSL triplet stored in a CSS custom property
 * (--genre-* / --role-*) so light/dark mode is handled in globals.css.
 * The utility functions return { bg, text, border } strings ready for
 * inline `style` attributes, following the RoleBadge pattern.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TagColor {
  bg: string;
  text: string;
  border: string;
}

// ---------------------------------------------------------------------------
// Genre colors
// ---------------------------------------------------------------------------

const GENRE_VAR: Record<string, string> = {
  Action: "--genre-action",
  Adventure: "--genre-adventure",
  Animation: "--genre-animation",
  Comedy: "--genre-comedy",
  Crime: "--genre-crime",
  Documentary: "--genre-documentary",
  Drama: "--genre-drama",
  Family: "--genre-family",
  Fantasy: "--genre-fantasy",
  History: "--genre-history",
  Horror: "--genre-horror",
  Music: "--genre-music",
  Mystery: "--genre-mystery",
  Romance: "--genre-romance",
  "Science Fiction": "--genre-scifi",
  "TV Movie": "--genre-tvmovie",
  Thriller: "--genre-thriller",
  War: "--genre-war",
  Western: "--genre-western",
};

const GENRE_FALLBACK = "--genre-fallback";

// ---------------------------------------------------------------------------
// Crew role colors
// ---------------------------------------------------------------------------

const ROLE_VAR: Record<string, string> = {
  Director: "--role-director",
  Writer: "--role-writer",
  Screenplay: "--role-screenplay",
  Composer: "--role-composer",
  Cinematography: "--role-cinematography",
  Editor: "--role-editor",
  "Production Design": "--role-production",
  "Costume Design": "--role-costume",
};

const ROLE_FALLBACK = "--role-fallback";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorFromVar(cssVar: string): TagColor {
  return {
    bg: `hsl(var(${cssVar}) / 0.12)`,
    text: `hsl(var(${cssVar}))`,
    border: `hsl(var(${cssVar}) / 0.30)`,
  };
}

/**
 * Returns { bg, text, border } CSS values for a genre name.
 * Falls back to a neutral color for unknown genres.
 */
export function getGenreColor(genre: string): TagColor {
  const cssVar = GENRE_VAR[genre] ?? GENRE_FALLBACK;
  return colorFromVar(cssVar);
}

/**
 * Returns { bg, text, border } CSS values for a crew role label.
 * Falls back to a neutral color for unknown roles.
 */
export function getCrewRoleColor(role: string): TagColor {
  const cssVar = ROLE_VAR[role] ?? ROLE_FALLBACK;
  return colorFromVar(cssVar);
}
