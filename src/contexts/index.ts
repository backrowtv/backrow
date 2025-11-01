/**
 * Contexts - Centralized Export
 *
 * This module provides centralized access to all React contexts used throughout the app.
 *
 * Layout contexts are kept in /components/layout/ due to tight coupling with layout components,
 * but re-exported here for convenient external access.
 */

// Display Preferences Context - date/time formatting
export { DisplayPreferencesProvider, useDisplayPreferences } from './DisplayPreferencesContext'

// Layout Contexts - re-exported from components/layout
export {
  // Main sidebar
  SidebarProvider,
  useSidebar,
  // Secondary sidebar
  SecondarySidebarProvider,
  useSecondarySidebar,
  // Mobile sidebar
  MobileSidebarProvider,
  useMobileSidebar,
  // Shared types and hooks
  useSidebarState,
  type SidebarMode,
  type SidebarState,
  type SidebarStateOptions,
  type SecondarySidebarMode,
} from '@/components/layout/contexts'
