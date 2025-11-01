// Re-export all festival actions from the modular directory
// This maintains backward compatibility for existing imports
// Note: No 'use server' here - individual files have the directive

// CRUD operations
export {
  createFestival,
  getFestivalBySlug,
  getFestivalsByClub,
} from './festivals/crud'

// Phase management
export {
  advanceFestivalPhase,
  revertFestivalPhase,
  forceAdvanceFestivalPhase,
  getPhaseRequirements,
} from './festivals/phases'

// Automatic phase advancement
export {
  checkAndAdvanceFestivalPhases,
} from './festivals/auto'

// Festival updates
export {
  updateFestivalTheme,
  updateFestivalAppearance,
  updateFestivalDeadlines,
  cancelFestival,
  getIncompleteParticipants,
} from './festivals/updates'
