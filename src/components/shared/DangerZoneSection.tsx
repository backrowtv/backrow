'use client'

import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Warning, CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface DangerZoneSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  defaultOpen?: boolean
}

export function DangerZoneSection({
  children,
  title = 'Danger Zone',
  description = 'Irreversible actions',
  className,
  defaultOpen = false,
}: DangerZoneSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "border border-[var(--error)]/30 rounded-lg overflow-hidden bg-[var(--error)]/5",
        className
      )}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-3 p-4 hover:bg-[var(--error)]/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[var(--error)]/10 flex items-center justify-center flex-shrink-0">
              <Warning className="h-4 w-4 text-[var(--error)]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[var(--error)]">{title}</p>
              <p className="text-xs text-[var(--text-muted)]">{description}</p>
            </div>
            <CaretDown
              className={cn(
                "h-4 w-4 text-[var(--error)] transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-[var(--error)]/20">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

