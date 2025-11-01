// Barrel exports for profile module
// This provides a clean public API for profile actions
// Note: No 'use server' here - individual files have the directive

// Types
export type {
  UpdatePrivacySettingsResult,
  UpdateNotificationPreferencesResult,
  UpdateClubNotificationPreferencesResult,
  GetUserYearWrapStatsResult,
  AddToFutureNominationsResult,
  RemoveFromFutureNominationsResult,
  FutureNominationLink,
  GetFutureNominationLinksResult,
  AddFutureNominationLinkResult,
  RemoveFutureNominationLinkResult,
  NominateFromFutureListResult,
  BlockUserResult,
  BlockedUser,
  GetBlockedUsersResult,
  ReportUserResult,
  UpdateRatingPreferencesResult,
  GetRatingPreferencesResult,
  NotificationPreferencesInput,
  ClubNotificationPreferencesInput,
} from "./types";

// Favorites
export {
  getUserFavorites,
  getFeaturedFavorites,
  addFavorite,
  removeFavorite,
  toggleFeatured,
  reorderFavorites,
} from "./favorites";

// Preferences (privacy, notifications, rating)
export {
  updatePrivacySettings,
  updateNotificationPreferences,
  updateClubNotificationPreferences,
  updateRatingPreferences,
  getRatingPreferences,
  getUserPrivacySettings,
  getTargetUserPrivacySettings,
} from "./preferences";

// Future nominations
export {
  addToFutureNominations,
  removeFromFutureNominations,
  getFutureNominationLinks,
  addFutureNominationLink,
  removeFutureNominationLink,
  nominateFromFutureList,
} from "./future-nominations";

// Past nominations
export { getPastNominations } from "./past-nominations";
export type { PastNominationItem, GetPastNominationsResult } from "./past-nominations";

// Blocking and reporting
export {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkUserBlocked,
  hasUserBlockedMe,
  reportUser,
} from "./blocking";

// Stats
export { checkMutualClubMembership, getUserYearWrapStats } from "./stats";
