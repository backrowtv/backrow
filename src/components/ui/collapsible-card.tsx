'use client'

import * as React from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface CollapsibleCardProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  description?: string
}

export function CollapsibleCard({ 
  title, 
  children, 
  defaultOpen = false,
  className,
  description
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn(
      'rounded-lg border border-[var(--border)] bg-[var(--surface-1)]',
      className
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button 
            className={cn(
              'w-full flex items-center justify-between p-4',
              'text-left hover:bg-[var(--hover)] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset',
              isOpen ? 'rounded-t-lg' : 'rounded-lg'
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {title}
              </span>
              {description && (
                <span className="text-xs text-[var(--text-muted)]">
                  {description}
                </span>
              )}
            </div>
            <CaretDown
              className={cn(
                'h-4 w-4 text-[var(--text-muted)] transition-transform duration-200',
                isOpen ? 'rotate-0' : '-rotate-90'
              )}
              weight="bold"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
            <div className="pt-4">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
