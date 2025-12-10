'use client'

import { Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

interface SidebarSectionProps {
  label: string
  children: React.ReactNode
  className?: string
  collapsed?: boolean
}

export function SidebarSection({ label, children, className, collapsed = false }: SidebarSectionProps) {
  if (collapsed) {
    return (
      <div className={cn('space-y-1', className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="px-3 py-2 mb-1">
        <Text 
          size="sm" 
          className="text-[var(--text-muted)] font-semibold uppercase tracking-wider transition-opacity duration-200"
        >
          {label}
        </Text>
      </div>
      <div className="space-y-1 transition-all duration-200">
        {children}
      </div>
    </div>
  )
}

