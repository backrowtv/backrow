// Re-export all discussion actions from the modular directory
// This maintains backward compatibility with existing imports
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
} from "./discussions/types";

// Thread operations
export {
  getThreadsByClub,
  getThreadsWithSpoilerStates,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
} from "./discussions/threads";

// Comment operations
export {
  getCommentsByThread,
  createComment,
  updateComment,
  deleteComment,
} from "./discussions/comments";

// Voting and unlocking
export {
  toggleVote,
  getUserVote,
  unlockThread,
  checkThreadUnlocked,
  revealThreadSpoilers,
} from "./discussions/voting";

// Auto-created threads
export {
  createFestivalDiscussionOnStart,
  updateFestivalThreadWithMovieLinks,
  autoCreateMovieThread,
  createPlayingMovieThread,
} from "./discussions/auto";

// Tag management
export { addTagToThread, removeTagFromThread, getThreadTags } from "./discussions/tags";

// NOTE: Spoiler utilities are NOT exported here to avoid bundling server-only code
// into client components. Server pages should import directly:
// import { getSpoilerStatesForThreads } from '@/app/actions/discussions/spoiler-utils'
