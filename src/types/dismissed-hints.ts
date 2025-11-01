/** Known static hint keys */
export type StaticHintKey =
  | "rating-customize-hint"
  | "movie-links-customize-hint"
  | "nav-customize-hint"
  | "discussion-customize-hint"
  | "profile-completion";

/** Dynamic keys like "year-wrap-2025" */
export type DynamicHintKey = `year-wrap-${number}`;

export type HintKey = StaticHintKey | DynamicHintKey;

/** Shape stored in the dismissed_hints JSONB column */
export type DismissedHints = Record<string, boolean>;
