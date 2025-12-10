"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type SidebarMode = "expanded" | "collapsed" | "hover";

export interface SidebarStateOptions {
  /** Key prefix for localStorage (e.g., 'backrow-sidebar' or 'backrow-secondary-sidebar') */
  storageKeyPrefix: string;
  /** Default mode when no preference is saved */
  defaultMode?: SidebarMode;
  /** Keyboard shortcut key (combined with Cmd/Ctrl) */
  shortcutKey?: string;
  /** Whether shortcut requires Shift key */
  shortcutRequiresShift?: boolean;
  /** Delay in ms before collapsing after mouse leaves (hover mode) */
  hoverCollapseDelay?: number;
  /** Sidebar width when expanded */
  expandedWidth?: number;
  /** Sidebar width when collapsed */
  collapsedWidth?: number;
}

export interface SidebarState {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  hasMounted: boolean;
}

/**
 * Shared hook for sidebar state management.
 * Handles mode switching, localStorage persistence, hover behavior, and keyboard shortcuts.
 */
export function useSidebarState(options: SidebarStateOptions): SidebarState {
  const {
    storageKeyPrefix,
    defaultMode = "hover",
    shortcutKey,
    shortcutRequiresShift = false,
    hoverCollapseDelay = 300,
    expandedWidth = 232,
    collapsedWidth = 64,
  } = options;

  const modeKey = `${storageKeyPrefix}-mode`;
  const collapsedKey = `${storageKeyPrefix}-collapsed`;

  const [mode, setModeState] = useState<SidebarMode>(defaultMode);
  const [isCollapsed, setIsCollapsedState] = useState(defaultMode !== "expanded");
  const [isHovered, setIsHovered] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load mode and collapsed state from localStorage on mount
  useEffect(() => {
    setHasMounted(true);
    const storedMode = localStorage.getItem(modeKey) as SidebarMode | null;

    if (storedMode && ["expanded", "collapsed", "hover"].includes(storedMode)) {
      setModeState(storedMode);
      // Set initial collapsed state based on mode
      if (storedMode === "expanded") {
        setIsCollapsedState(false);
      } else {
        setIsCollapsedState(true);
      }
    } else {
      // Use default mode
      setModeState(defaultMode);
      setIsCollapsedState(defaultMode !== "expanded");
    }
  }, [modeKey, defaultMode]);

  // Save mode to localStorage
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem(modeKey, mode);
    }
  }, [mode, modeKey, hasMounted]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem(collapsedKey, String(isCollapsed));
    }
  }, [isCollapsed, collapsedKey, hasMounted]);

  // Set mode and update collapsed state accordingly
  const setMode = useCallback((newMode: SidebarMode) => {
    setModeState(newMode);
    if (newMode === "expanded") {
      setIsCollapsedState(false);
    } else if (newMode === "collapsed") {
      setIsCollapsedState(true);
    } else if (newMode === "hover") {
      setIsCollapsedState(true); // Start collapsed in hover mode
    }
  }, []);

  // Handle hover for hover mode
  useEffect(() => {
    if (mode === "hover") {
      if (isHovered) {
        setIsCollapsedState(false);
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      } else {
        // Delay collapse when mouse leaves
        hoverTimeoutRef.current = setTimeout(() => {
          setIsCollapsedState(true);
        }, hoverCollapseDelay);
      }
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isHovered, mode, hoverCollapseDelay]);

  // Toggle function for manual toggle
  // Toggles between expanded and collapsed modes
  const toggleSidebar = useCallback(() => {
    if (isCollapsed) {
      setMode("expanded");
    } else {
      setMode("collapsed");
    }
  }, [isCollapsed, setMode]);

  // Keyboard shortcut
  useEffect(() => {
    if (!shortcutKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const hasModifier = e.metaKey || e.ctrlKey;
      const hasShift = shortcutRequiresShift ? e.shiftKey : !e.shiftKey;

      if (hasModifier && hasShift && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, shortcutKey, shortcutRequiresShift]);

  // Calculate sidebar width based on collapsed state
  const sidebarWidth = isCollapsed ? collapsedWidth : expandedWidth;

  return {
    isCollapsed,
    setIsCollapsed: setIsCollapsedState,
    toggleSidebar,
    sidebarWidth,
    mode,
    setMode,
    isHovered,
    setIsHovered,
    hasMounted,
  };
}
