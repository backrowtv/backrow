/** Known static hint keys */
export type StaticHintKey =
  | "profile-completion"
  | "tour-home"
  | "tour-profile"
  | "tour-profile-stats"
  | "tour-profile-display-case"
  | "tour-profile-nominations"
  | "tour-club-creator"
  | "tour-club-member"
  | "tour-festival"
  | "tour-movie"
  | "tour-discover";

/** Dynamic keys like "year-wrap-2025" */
export type DynamicHintKey = `year-wrap-${number}`;

export type HintKey = StaticHintKey | DynamicHintKey;

/** Shape stored in the dismissed_hints JSONB column */
export type DismissedHints = Record<string, boolean>;
