/**
 * Theme Actions - Re-export Module
 *
 * This file re-exports all theme-related server actions from the themes/ subdirectory.
 * For new imports, prefer importing directly from '@/app/actions/themes'.
 *
 * NOTE: 'use server' is NOT used here because re-exports are not allowed in server action files.
 * Each sub-module has its own 'use server' directive.
 *
 * @see src/app/actions/themes/pool.ts - Theme pool CRUD operations
 * @see src/app/actions/themes/voting.ts - Voting functions
 * @see src/app/actions/themes/selection.ts - Festival theme selection
 * @see src/app/actions/themes/helpers.ts - Shared utilities
 */

// Re-export all theme functions for backward compatibility
export {
  // Theme pool CRUD
  addTheme,
  removeTheme,
  updateTheme,
  // Theme voting
  voteForTheme,
  getThemeVotes,
  voteOnThemePool,
  getThemePoolVotes,
  // Theme selection
  selectFestivalTheme,
  selectCustomTheme,
  selectRandomTheme,
  getTopVotedThemes,
} from './themes/index'
