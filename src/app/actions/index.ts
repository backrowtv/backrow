/**
 * Server Actions - Unified Export
 *
 * This module provides namespace exports for all server actions grouped by domain.
 * Use this for cleaner, more organized imports throughout the application.
 *
 * @example
 * // Namespace imports (recommended for multiple actions)
 * import { auth, clubs, festivals, nominations } from '@/app/actions'
 *
 * await auth.signIn(email, password)
 * await clubs.createClub(formData)
 * await festivals.advanceFestivalPhase(festivalId)
 *
 * @example
 * // Direct imports (for single actions)
 * import { signIn } from '@/app/actions/auth'
 * import { createClub } from '@/app/actions/clubs'
 *
 * NOTE: 'use server' is NOT used here because this is a re-export module.
 * Each sub-module has its own 'use server' directive.
 */

// =============================================================================
// AUTHENTICATION
// =============================================================================

import * as authActions from "./auth";
import * as authOAuthActions from "./auth-oauth";
export const auth = {
  ...authActions,
  ...authOAuthActions,
};

// =============================================================================
// CLUBS
// =============================================================================

export * as clubs from "./clubs";

// =============================================================================
// FESTIVALS & PHASES
// =============================================================================

import * as festivalActions from "./festivals";
import * as themeActions from "./themes";
import * as adminFestivalActions from "./admin-festival";
import * as endlessFestivalActions from "./endless-festival";
import * as festivalCarouselActions from "./festival-carousel";

export const festivals = {
  ...festivalActions,
  ...themeActions,
  ...adminFestivalActions,
  ...endlessFestivalActions,
  ...festivalCarouselActions,
};

// =============================================================================
// NOMINATIONS & MOVIES
// =============================================================================

import * as nominationActions from "./nominations";
import * as nominationDirectActions from "./nominations-direct";
import * as movieActions from "./movies";
import * as movieHistoryActions from "./movie-history";

export const movies = {
  ...movieActions,
  ...movieHistoryActions,
};

export const nominations = {
  ...nominationActions,
  ...nominationDirectActions,
};

// =============================================================================
// RATINGS & RUBRICS
// =============================================================================

import * as ratingActions from "./ratings";
import * as rubricActions from "./rubrics";
import * as clubRubricActions from "./club-rubrics";

export const ratings = {
  ...ratingActions,
};

export const rubrics = {
  ...rubricActions,
  ...clubRubricActions,
};

// =============================================================================
// RESULTS & STANDINGS
// =============================================================================

import * as resultActions from "./results";
import * as standingActions from "./standings";
import * as guessActions from "./guesses";

export const results = {
  ...resultActions,
  ...standingActions,
  ...guessActions,
};

// =============================================================================
// SEASONS
// =============================================================================

export * as seasons from "./seasons";

// =============================================================================
// MEMBERS & EVENTS
// =============================================================================

export * as members from "./members";
export * as events from "./events";

// =============================================================================
// DISCUSSIONS & MESSAGES
// =============================================================================

export * as discussions from "./discussions";

// =============================================================================
// PROFILE & PREFERENCES
// =============================================================================

import * as profileActions from "./profile";
import * as notificationActions from "./notifications";
import * as noteActions from "./notes";
import * as navPreferenceActions from "./navigation-preferences";

export const profile = {
  ...profileActions,
};

export const notifications = {
  ...notificationActions,
};

export const notes = {
  ...noteActions,
};

export const preferences = {
  ...navPreferenceActions,
};

// =============================================================================
// SEARCH & ANALYTICS
// =============================================================================

import * as searchActions from "./search";
import * as searchAnalyticsActions from "./search-analytics";
import * as filterAnalyticsActions from "./filter-analytics";

export const search = {
  ...searchActions,
  ...searchAnalyticsActions,
  ...filterAnalyticsActions,
};

// =============================================================================
// BADGES
// =============================================================================

export * as badges from "./badges";

// =============================================================================
// MARKETING & CONTENT
// =============================================================================

import * as marketingActions from "./marketing";
import * as curatedPickActions from "./backrow-curated-pick";
import * as curatedCollectionActions from "./curated-collections";
import * as contactActions from "./contact";

export const marketing = {
  ...marketingActions,
  ...curatedPickActions,
  ...curatedCollectionActions,
  ...contactActions,
};

// =============================================================================
// STATS
// =============================================================================

export * as stats from "./stats";

// =============================================================================
// ADMIN & SYSTEM
// =============================================================================

import * as adminActions from "./admin";
import * as migrationActions from "./migrations";
import * as wizardAuthActions from "./wizard-auth";

export const admin = {
  ...adminActions,
  ...migrationActions,
  ...wizardAuthActions,
};

// =============================================================================
// BACKGROUNDS
// =============================================================================

export * as backgrounds from "./backgrounds";

// =============================================================================
// TMDB & EXTERNAL DATA
// =============================================================================

import * as tmdbActions from "./tmdb";
import * as personActions from "./persons";
import * as letterboxdActions from "./letterboxd-import";

export const tmdb = {
  ...tmdbActions,
  ...personActions,
};

export const imports = {
  ...letterboxdActions,
};
