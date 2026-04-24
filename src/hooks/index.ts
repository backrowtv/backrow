/**
 * Custom React hooks for the Backrow application
 */

// Form handling
export {
  useFormAction,
  useServerAction,
  type ActionResult,
  type ServerAction,
} from "./useFormAction";

// Confirmation dialogs
export {
  useConfirmDialog,
  useDeleteConfirmDialog,
  type ConfirmDialogConfig,
} from "./useConfirmDialog";

// Debouncing
export { useDebounce } from "./useDebounce";

// Auto-save forms
export {
  useAutoSaveForm,
  type AutoSaveState,
  type AutoSaveResult,
  type UseAutoSaveFormOptions,
  type UseAutoSaveFormReturn,
} from "./useAutoSaveForm";

// Movie search
export { useMovieSearch } from "./useMovieSearch";

// Theme detection
export { useTheme, useThemeSimple } from "./useTheme";

// Web Push subscription
export { usePushSubscription, type PushSubscriptionStatus } from "./usePushSubscription";

// Cookie consent preferences
export {
  useCookiePreferences,
  hasAnalyticsConsent,
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
  type CookiePreferences,
} from "./useCookiePreferences";
