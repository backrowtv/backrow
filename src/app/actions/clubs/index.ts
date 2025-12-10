/**
 * Club Actions - Unified Export
 *
 * This module re-exports all club-related server actions from their
 * domain-specific modules. Import from this file for cleaner imports.
 *
 * @example
 * // Instead of:
 * import { createAnnouncement } from '@/app/actions/clubs/announcements'
 * import { toggleFavoriteClub } from '@/app/actions/clubs/membership'
 *
 * // Use:
 * import { createAnnouncement, toggleFavoriteClub } from '@/app/actions/clubs'
 */

// CRUD operations (create, update, archive)
export { createClub, updateClub, fixClubSlug, fixAllClubSlugs, archiveClub } from "./crud";

// Membership operations (join, favorites)
export { joinPublicClub, toggleFavoriteClub } from "./membership";

// Invite tokens (for private clubs) + email invites
export { createInviteToken, validateInviteToken, markInviteTokenUsed, sendInviteEmails } from "./invites";

// Join requests (for public_moderated clubs)
export {
  createJoinRequest,
  approveJoinRequest,
  denyJoinRequest,
  getPendingRequests,
  getPendingRequestCount,
  getUserPendingRequest,
  type JoinRequest,
} from "./join-requests";

// Announcements
export {
  createAnnouncement,
  createRichAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./announcements";

// Polls
export {
  createPoll,
  voteOnPoll,
  deletePoll,
  closePoll,
  updatePoll,
  type UpdatePollData,
} from "./polls";

// Moderation (blocked users, word blacklist)
export { unblockUser, addWordToBlacklist, removeWordFromBlacklist } from "./moderation";

// Ownership (transfer, delete)
export { transferOwnership, deleteClub } from "./ownership";

// Settings
export {
  updateClubSettings,
  updateClubMemberPersonalization,
  isFestivalTypeLocked,
} from "./settings";

// Cached queries
export {
  getClubBySlug,
  getClubMembers,
  getClubById,
  getUserClubs,
  type UserClub,
  type UserClubsData,
} from "./queries";
