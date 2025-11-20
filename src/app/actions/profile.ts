// Re-export all profile actions from the modular directory
// This maintains backward compatibility with existing imports
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
} from "./profile/types";

// Favorites
export {
  getUserFavorites,
  getFeaturedFavorites,
  addFavorite,
  removeFavorite,
  toggleFeatured,
  reorderFavorites,
} from "./profile/favorites";

// Preferences (privacy, notifications, rating)
export {
  updatePrivacySettings,
  updateNotificationPreferences,
  updateClubNotificationPreferences,
  updateRatingPreferences,
  getRatingPreferences,
  getUserPrivacySettings,
  getTargetUserPrivacySettings,
} from "./profile/preferences";

// Future nominations
export {
  addToFutureNominations,
  removeFromFutureNominations,
  getFutureNominationLinks,
  addFutureNominationLink,
  removeFutureNominationLink,
  nominateFromFutureList,
} from "./profile/future-nominations";

// Blocking and reporting
export {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkUserBlocked,
  hasUserBlockedMe,
  reportUser,
} from "./profile/blocking";

// Stats
export { checkMutualClubMembership, getUserYearWrapStats } from "./profile/stats";
