"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useSidebarState, type SidebarMode } from "./useSidebarState";
import type { SecondarySidebarItem } from "./SecondarySidebar";

export type SecondarySidebarMode = SidebarMode;

interface SecondarySidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
  mode: SecondarySidebarMode;
  setMode: (mode: SecondarySidebarMode) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  items: SecondarySidebarItem[];
  setItems: (items: SecondarySidebarItem[]) => void;
  parentBreadcrumb?: { label: string; href: string };
  setParentBreadcrumb: (breadcrumb?: { label: string; href: string }) => void;
  hasMounted: boolean;
}

const SecondarySidebarContext = createContext<SecondarySidebarContextType | undefined>(undefined);

export function SecondarySidebarProvider({ children }: { children: ReactNode }) {
  // Use shared sidebar state hook
  const sidebarState = useSidebarState({
    storageKeyPrefix: "backrow-secondary-sidebar",
    defaultMode: "expanded", // Secondary sidebar defaults to expanded
    shortcutKey: "b",
    shortcutRequiresShift: true, // Cmd/Ctrl + Shift + B for secondary
    collapsedWidth: 56, // Match main sidebar
  });

  // Secondary sidebar-specific state
  const [items, setItems] = useState<SecondarySidebarItem[]>([]);
  const [parentBreadcrumb, setParentBreadcrumb] = useState<
    { label: string; href: string } | undefined
  >(undefined);

  return (
    <SecondarySidebarContext.Provider
      value={{
        ...sidebarState,
        items,
        setItems,
        parentBreadcrumb,
        setParentBreadcrumb,
      }}
    >
      {children}
    </SecondarySidebarContext.Provider>
  );
}

export function useSecondarySidebar() {
  const context = useContext(SecondarySidebarContext);
  if (context === undefined) {
    throw new Error("useSecondarySidebar must be used within a SecondarySidebarProvider");
  }
  return context;
}

/**
 * Safe version of useSecondarySidebar that returns null when provider is not available.
 * Useful for components that may render during SSR before the provider is mounted.
 */
export function useSecondarySidebarSafe() {
  return useContext(SecondarySidebarContext);
}
