// Barrel exports for discussions module
// This provides a clean public API for discussion actions
// Note: No 'use server' here - individual files have the directive

// Types
export type {
  DiscussionTagType,
  DiscussionThreadTag,
  DiscussionThread,
  DiscussionComment,
  DiscussionVote,
  TagInput,
  SpoilerState,
  CommentSubtreeResult,
} from "./types";

// Thread operations
export {
  getThreadsByClub,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
} from "./threads";

// Comment operations
export {
  getCommentsByThread,
  getCommentSubtree,
  createComment,
  updateComment,
  deleteComment,
} from "./comments";

// Voting and unlocking
export {
  toggleVote,
  getUserVote,
  unlockThread,
  checkThreadUnlocked,
  revealThreadSpoilers,
} from "./voting";

// Auto-created threads
export {
  createFestivalDiscussionOnStart,
  updateFestivalThreadWithMovieLinks,
  autoCreateMovieThread,
  createPlayingMovieThread,
} from "./auto";

// Tag management
export { addTagToThread, removeTagFromThread, getThreadTags } from "./tags";

// Spoiler utilities
export {
  getMovieTmdbIdsFromThread,
  calculateSpoilerState,
  batchCheckSpoilerData,
  getSpoilerStatesForThreads,
  getThreadSpoilerState,
} from "./spoiler-utils";
