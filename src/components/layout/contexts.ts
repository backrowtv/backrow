/**
 * Layout Contexts - Unified Export
 * 
 * This module provides centralized access to all layout-related contexts.
 * 
 * Architecture:
 * - useSidebarState: Shared hook for sidebar state management (DRY)
 * - SidebarContext: Main navigation sidebar state
 * - SecondarySidebarContext: Context-specific sidebar (clubs, profile, etc.)
 * - MobileSidebarContext: Mobile drawer overlay state
 */

// Shared hook for sidebar state
export { useSidebarState } from './useSidebarState'
export type { SidebarMode, SidebarState, SidebarStateOptions } from './useSidebarState'

// Main sidebar context
export { SidebarProvider, useSidebar } from './SidebarContext'

// Secondary sidebar context
export { SecondarySidebarProvider, useSecondarySidebar } from './SecondarySidebarContext'
export type { SecondarySidebarMode } from './SecondarySidebarContext'

// Mobile sidebar context
export { MobileSidebarProvider, useMobileSidebar } from './MobileSidebarContext'

