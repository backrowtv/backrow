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

// Movie search
export { useMovieSearch } from "./useMovieSearch";

// Theme detection
export { useTheme, useThemeSimple } from "./useTheme";

// Web Push subscription
export { usePushSubscription, type PushSubscriptionStatus } from "./usePushSubscription";
