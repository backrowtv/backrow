// Barrel exports for endless-festival module
// This provides a clean public API for endless festival actions
// Note: No 'use server' here - individual files have the directive

// Types
export type {
  EndlessStatus,
  DisplaySlot,
  EndlessMovie,
  EndlessFestivalData,
  PoolVoteState,
} from "./types";

// Main data fetching
export {
  getEndlessFestivalData,
  getClubMoviePool,
  updateEndlessFestivalName,
  isEndlessFestivalClub,
  getMoviePoolCount,
} from "./data";

// Pool management
export { addMovieToPool, removeFromPool, deleteFromEndlessFestival } from "./pool";

// Status management (playing, completed)
export {
  addMovieToPlaying,
  moveToPlaying,
  moveToCompleted,
  hideFromRecentlyWatched,
} from "./status";

// Voting
export {
  togglePoolMovieVote,
  getPoolMovieVotes,
  getPoolMoviesVotes,
  pickRandomFromPool,
} from "./voting";

// Display and homepage
export { updateNominationPitch, setDisplaySlot, getHomepageMovies } from "./display";

// Watch history
export {
  markMovieWatched,
  unmarkMovieWatched,
  updateWatchCount,
  getWatchHistoryEntry,
  getWatchedMovies,
  getUserRatingsForNominations,
  getUserGenericRatings,
} from "./watch-history";

// Member activity (watch/rating data for a movie across club members)
export { getMovieMemberActivity } from "./member-activity";
export type { MemberActivity } from "./member-activity.types";

// Legacy exports for backwards compatibility
export { addMovieToPlaying as addEndlessMovie } from "./status";
export { moveToCompleted as advanceEndlessFestival } from "./status";
