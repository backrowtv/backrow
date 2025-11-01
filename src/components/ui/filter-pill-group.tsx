'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

export interface FilterPillOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface FilterPillGroupProps {
  options: FilterPillOption[]
  /** Single-select mode value */
  value?: string
  /** Multi-select mode values */
  values?: string[]
  /** Single-select onChange handler */
  onChange?: (value: string) => void
  /** Multi-select toggle handler */
  onToggle?: (value: string) => void
  /** Enable multi-select mode */
  multiSelect?: boolean
  /** Enable horizontal scroll (default: true) */
  scrollable?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
  /** Optional label shown before pills */
  label?: string
  className?: string
}

/**
 * Horizontally scrollable pill group for filters.
 * Supports both single-select and multi-select modes.
 */
export function FilterPillGroup({
  options,
  value,
  values = [],
  onChange,
  onToggle,
  multiSelect = false,
  scrollable = true,
  size = 'md',
  label,
  className,
}: FilterPillGroupProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isSelected = (optionValue: string) => {
    if (multiSelect) {
      return values.includes(optionValue)
    }
    return value === optionValue
  }

  const handleClick = (optionValue: string) => {
    if (multiSelect && onToggle) {
      onToggle(optionValue)
    } else if (onChange) {
      onChange(optionValue)
    }
  }

  // Auto-scroll to selected pill (single-select mode)
  React.useEffect(() => {
    if (scrollable && !multiSelect && value && scrollRef.current) {
      const selectedButton = scrollRef.current.querySelector(
        `[data-value="${value}"]`
      ) as HTMLButtonElement
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [value, scrollable, multiSelect])

  const pillsContent = (
    <div
      ref={scrollRef}
      className={cn(
        'flex gap-2',
        !scrollable && 'flex-wrap justify-center',
        scrollable && 'pb-1 justify-start md:justify-center'
      )}
      role={multiSelect ? 'group' : 'radiogroup'}
      aria-label={label}
    >
      {options.map((option) => {
        const selected = isSelected(option.value)

        return (
          <button
            key={option.value}
            type="button"
            role={multiSelect ? undefined : 'radio'}
            aria-pressed={multiSelect ? selected : undefined}
            aria-checked={!multiSelect ? selected : undefined}
            data-value={option.value}
            onClick={() => handleClick(option.value)}
            className={cn(
              'flex-shrink-0',
              'inline-flex items-center justify-center gap-1.5',
              'rounded-md',
              'font-medium',
              'whitespace-nowrap',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
              'active:scale-95',
              // Size variants - using py for auto-fit height
              size === 'sm' && 'py-1.5 px-3 text-xs',
              size === 'md' && 'py-2 px-4 text-sm',
              // Color states
              selected
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
            )}
          >
            {option.icon && (
              <span className="flex-shrink-0 [&>svg]:size-3.5">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )

  if (!scrollable) {
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <span className="mb-2 block text-xs font-medium text-[var(--text-muted)] text-center">
            {label}
          </span>
        )}
        {pillsContent}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <span className="mb-2 block text-xs font-medium text-[var(--text-muted)] text-center md:text-left">
          {label}
        </span>
      )}
      <ScrollArea className="w-full -mx-1 px-1">
        {pillsContent}
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  )
}
