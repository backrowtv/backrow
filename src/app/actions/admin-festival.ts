/**
 * Admin Festival Actions (Backwards Compatibility)
 *
 * Re-exports from festivals/ for backwards compatibility.
 * New imports should use @/app/actions/festivals instead.
 */

export {
  uploadFestivalPoster,
  removeFestivalPoster,
  removeMemberFromFestival,
  removeMovieFromFestival,
  adminOverrideRating,
  adminOverrideGuess,
  recalculateFestivalResults,
} from "./festivals/admin";

// updateFestivalTheme is in updates.ts, re-export for backwards compatibility
export { updateFestivalTheme } from "./festivals/updates";
