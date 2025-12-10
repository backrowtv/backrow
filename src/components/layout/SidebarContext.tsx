'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebarState, type SidebarMode } from './useSidebarState'

export type { SidebarMode }

interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  sidebarWidth: number
  mode: SidebarMode
  setMode: (mode: SidebarMode) => void
  isHovered: boolean
  setIsHovered: (hovered: boolean) => void
  // Secondary sidebar tracking for header positioning
  secondarySidebarWidth: number
  setSecondarySidebarWidth: (width: number) => void
  totalLeftOffset: number
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // Use shared sidebar state hook
  const sidebarState = useSidebarState({
    storageKeyPrefix: 'backrow-sidebar',
    defaultMode: 'expanded',
    shortcutKey: 'b',
    shortcutRequiresShift: false,
    collapsedWidth: 56, // Narrower when collapsed - matches secondary
  })
  
  // Secondary sidebar width tracking for header positioning
  const [secondarySidebarWidth, setSecondarySidebarWidth] = useState(0)
  
  // Check if current route should show secondary sidebar
  // Note: Search and Activity base pages don't have secondary sidebars
  const _showSecondarySidebar = pathname.startsWith('/profile') ||
                               pathname.startsWith('/club/') ||
                               pathname.startsWith('/clubs/')
  
  // Calculate total left offset for header positioning (main sidebar + secondary sidebar)
  const totalLeftOffset = sidebarState.sidebarWidth + secondarySidebarWidth

  return (
    <SidebarContext.Provider value={{ 
      ...sidebarState,
      secondarySidebarWidth,
      setSecondarySidebarWidth,
      totalLeftOffset
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
