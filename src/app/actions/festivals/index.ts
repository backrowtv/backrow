// Barrel exports for festivals module
// This provides a clean public API for festival actions
// Note: No 'use server' here - individual files have the directive

// CRUD operations
export { createFestival, getFestivalBySlug, getFestivalsByClub } from "./crud";

// Phase management
export {
  advanceFestivalPhase,
  revertFestivalPhase,
  forceAdvanceFestivalPhase,
  getPhaseRequirements,
} from "./phases";

// Automatic phase advancement
export { checkAndAdvanceFestivalPhases } from "./auto";

// Festival updates
export {
  updateFestivalTheme,
  updateFestivalAppearance,
  updateFestivalDeadlines,
  cancelFestival,
  getIncompleteParticipants,
} from "./updates";

// Results calculation and retrieval
export { calculateResults, getResults, getResultsData } from "./results";

// Admin operations
export {
  uploadFestivalPoster,
  removeFestivalPoster,
  removeMemberFromFestival,
  removeMovieFromFestival,
  adminOverrideRating,
  adminOverrideGuess,
  recalculateFestivalResults,
} from "./admin";
