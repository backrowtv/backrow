// Re-export all endless festival actions from the modular directory
// This maintains backward compatibility for existing imports
// Note: No 'use server' here - individual files have the directive

// Types
export type {
  EndlessStatus,
  DisplaySlot,
  EndlessMovie,
  EndlessFestivalData,
} from "./endless-festival/types";

// Main data fetching
export {
  getEndlessFestivalData,
  updateEndlessFestivalName,
  isEndlessFestivalClub,
  getMoviePoolCount,
} from "./endless-festival/data";

// Pool management
export { addMovieToPool, removeFromPool, deleteFromEndlessFestival } from "./endless-festival/pool";

// Status management (playing, completed)
export {
  addMovieToPlaying,
  moveToPlaying,
  moveToCompleted,
  hideFromRecentlyWatched,
} from "./endless-festival/status";

// Legacy aliases
export { addMovieToPlaying as addEndlessMovie } from "./endless-festival/status";
export { moveToCompleted as advanceEndlessFestival } from "./endless-festival/status";

// Voting
export {
  togglePoolMovieVote,
  getPoolMovieVotes,
  getPoolMoviesVotes,
  pickRandomFromPool,
} from "./endless-festival/voting";

// Display and homepage
export {
  updateNominationPitch,
  setDisplaySlot,
  getHomepageMovies,
} from "./endless-festival/display";

// Watch history
export {
  markMovieWatched,
  unmarkMovieWatched,
  updateWatchCount,
  getWatchHistoryEntry,
  getWatchedMovies,
  getUserRatingsForNominations,
  getUserGenericRatings,
} from "./endless-festival/watch-history";
