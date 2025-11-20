/**
 * Type definitions for profile actions
 */


import type { UserRatingPreferences } from "@/types/user-rating-preferences";

// Favorites
export interface UpdateFavoriteResult {
  success?: boolean;
  error?: string;
}

// Privacy settings
export interface UpdatePrivacySettingsResult {
  success?: boolean;
  error?: string;
}

// Notification preferences
export interface UpdateNotificationPreferencesResult {
  success?: boolean;
  error?: string;
}

export interface UpdateClubNotificationPreferencesResult {
  success?: boolean;
  error?: string;
}

// Year wrap stats
export interface GetUserYearWrapStatsResult {
  error?: string;
  data?: {
    moviesWatched: number;
    festivalsWon: number;
    topGenres: Array<{ genre: string; count: number }>;
    averageRating: number;
  };
}

// Future nominations
export interface AddToFutureNominationsResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export interface RemoveFromFutureNominationsResult {
  success?: boolean;
  error?: string;
}

export interface FutureNominationLink {
  id: string;
  future_nomination_id: string;
  club_id: string;
  festival_id: string | null;
  theme_pool_id: string | null;
  nominated: boolean;
  nominated_at: string | null;
  created_at: string;
  club?: {
    id: string;
    name: string;
    slug: string | null;
    picture_url: string | null;
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
  };
  festival?: {
    id: string;
    theme: string | null;
    start_date: string;
  } | null;
  theme_pool?: {
    id: string;
    theme_name: string;
  } | null;
}

export interface GetFutureNominationLinksResult {
  data?: FutureNominationLink[];
  error?: string;
}

export interface AddFutureNominationLinkResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export interface RemoveFutureNominationLinkResult {
  success?: boolean;
  error?: string;
}

export interface NominateFromFutureListResult {
  success?: boolean;
  error?: string;
  nominationId?: string;
}

// User blocking
export interface BlockUserResult {
  success?: boolean;
  error?: string;
}

export interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string | null;
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

export interface GetBlockedUsersResult {
  data?: BlockedUser[];
  error?: string;
}

// User reporting
export interface ReportUserResult {
  success?: boolean;
  error?: string;
}

// Rating preferences
export interface UpdateRatingPreferencesResult {
  success?: boolean;
  error?: string;
}

export interface GetRatingPreferencesResult {
  data?: UserRatingPreferences;
  error?: string;
}

// Notification preferences input types
export interface NotificationPreferencesInput {
  // Master toggles
  allNotifications?: boolean;
  allSiteNotifications?: boolean;
  allEmailNotifications?: boolean;
  allPushNotifications?: boolean;
  // Festivals
  newFestivals?: boolean;
  festivalUpdates?: boolean;
  deadlineChanges?: boolean;
  resultsRevealed?: boolean;
  // Endless Festival
  endlessFestival?: boolean;
  // Club Updates
  clubInvites?: boolean;
  clubUpdates?: boolean;
  announcements?: boolean;
  // Events
  events?: boolean;
  // Polls
  polls?: boolean;
  // Seasons
  seasons?: boolean;
  // Social
  mentions?: boolean;
  newMessages?: boolean;
  badges?: boolean;
  // Email — global per-category
  emailNotifications?: boolean;
  digestFrequency?: "never" | "daily" | "weekly";
  emailEnabledClubs?: string[];
  emailNewFestivals?: boolean;
  emailFestivalUpdates?: boolean;
  emailDeadlineChanges?: boolean;
  emailResultsRevealed?: boolean;
  emailEndlessFestival?: boolean;
  emailClubInvites?: boolean;
  emailClubUpdates?: boolean;
  emailAnnouncements?: boolean;
  emailEvents?: boolean;
  emailPolls?: boolean;
  emailSeasons?: boolean;
  emailMentions?: boolean;
  emailNewMessages?: boolean;
  emailBadges?: boolean;
}

// User profile stats (full stats page)
export interface UserProfileStats {
  // Overview
  moviesWatched: number;
  clubsJoined: number;
  festivalsPlayed: number;
  festivalsWon: number;
  nominationsTotal: number;
  totalPoints: number;

  // Ratings
  ratingsGiven: number;
  averageRatingGiven: number;
  averageRatingReceived: number;
  ratingDistribution: { range: string; count: number }[];
  highestRatedMovie: { title: string; tmdbId: number; posterPath?: string; rating: number } | null;
  lowestRatedMovie: { title: string; tmdbId: number; posterPath?: string; rating: number } | null;

  // Festival performance
  winRate: number;
  podiumFinishes: { first: number; second: number; third: number };
  guessingAccuracy: { correct: number; total: number };
  hotStreak: number;

  // Genres
  topGenres: { genre: string; count: number }[];

  // Timing
  avgTimeToNominateHours: number | null;
  avgTimeToRateHours: number | null;
  earlyBirdPercent: number | null;
  avgWatchTimeHours: number | null;

  // Fun
  totalWatchTimeMinutes: number;
  longestMovie: { title: string; runtime: number } | null;
  shortestMovie: { title: string; runtime: number } | null;
  averageMovieYear: number | null;
  crowdPleasePercent: number | null;
  genreLoyalty: { genre: string; percent: number } | null;
  participationRate: number | null;
  perfectScores: number;
  highestRatingGiven: number | null;
  lowestRatingGiven: number | null;
  ratingConsistency: number | null;
  favoriteDecade: string | null;
  avgNominationsPerFestival: number | null;
  uniqueGenresExplored: number;
  moviesFromThisYear: number;
  moviesFromBefore1980: number;
}

export interface GetUserProfileStatsResult {
  data?: UserProfileStats;
  error?: string;
}

// Club advanced stats
export interface ClubAdvancedStats {
  // Timing
  avgFestivalDurationDays: number | null;
  avgTimeToFirstNominationHours: number | null;
  avgWatchPhaseDays: number | null;
  avgRatingTurnaroundDays: number | null;
  fastestFestival: { theme: string; days: number } | null;
  slowestFestival: { theme: string; days: number } | null;

  // Ratings
  ratingConsensusScore: number | null;
  mostControversialMovie: { title: string; stdDev: number; avgRating: number } | null;
  mostUnanimousMovie: { title: string; stdDev: number; avgRating: number } | null;

  // Movies
  totalMoviesWatched: number;
  totalWatchTimeMinutes: number;
  avgMovieRuntime: number | null;
  oldestMovie: { title: string; year: number } | null;
  newestMovie: { title: string; year: number } | null;
  averageMovieYear: number | null;
  genreBreakdown: { genre: string; count: number }[];
  topDirector: { name: string; count: number } | null;
  topActor: { name: string; count: number } | null;

  // Fun / Member superlatives
  biggestCrowdPleaser: { name: string; avgRating: number } | null;
  boldChoices: { name: string; avgRating: number } | null;
  toughestCritic: { name: string; avgRating: number } | null;
  mostGenerousRater: { name: string; avgRating: number } | null;
  bestGuesser: { name: string; accuracy: number } | null;
  completionist: { name: string; percent: number } | null;
  nominationSpeedDemon: { name: string; avgHours: number } | null;
  bombshell: { name: string; count: number } | null;
  busiestMonth: { month: string; count: number } | null;
}

export interface GetClubAdvancedStatsResult {
  data?: ClubAdvancedStats;
  error?: string;
}

export interface ClubNotificationPreferencesInput {
  // Master toggle
  allClubNotifications?: boolean;
  // Festival
  festivalUpdates?: boolean;
  newFestivals?: boolean;
  newNominations?: boolean;
  phaseChanges?: boolean;
  deadlineChanges?: boolean;
  resultsRevealed?: boolean;
  // Endless Festival
  endlessFestival?: boolean;
  // Club
  clubUpdates?: boolean;
  announcements?: boolean;
  // Events
  events?: boolean;
  // Polls
  polls?: boolean;
  // Seasons
  seasons?: boolean;
  // Social
  newMessages?: boolean;
  mentions?: boolean;
  // Email — per-club per-category
  emailEnabled?: boolean;
  emailFestivalUpdates?: boolean;
  emailNewFestivals?: boolean;
  emailNewNominations?: boolean;
  emailPhaseChanges?: boolean;
  emailDeadlineChanges?: boolean;
  emailResultsRevealed?: boolean;
  emailEndlessFestival?: boolean;
  emailClubUpdates?: boolean;
  emailAnnouncements?: boolean;
  emailEvents?: boolean;
  emailPolls?: boolean;
  emailSeasons?: boolean;
  emailNewMessages?: boolean;
  emailMentions?: boolean;
}
