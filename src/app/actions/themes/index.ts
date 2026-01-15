/**
 * Theme Actions
 *
 * Re-exports all theme-related server actions from organized modules.
 */

// Theme pool CRUD operations
export { addTheme, removeTheme, updateTheme } from './pool'

// Theme voting (festival selection and pool voting)
export { voteForTheme, getThemeVotes, voteOnThemePool, getThemePoolVotes } from './voting'

// Theme selection for festivals
export {
  selectFestivalTheme,
  selectCustomTheme,
  selectRandomTheme,
  getTopVotedThemes,
} from './selection'

// Re-export helpers for direct access if needed
export { MAX_THEME_LENGTH, getClubSlug, getFestivalSlug } from './helpers'
