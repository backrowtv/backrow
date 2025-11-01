'use client'

import * as React from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
  helperText?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      error,
      label,
      helperText,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId() // Stable ID that matches server and client
    const selectId = id || `select-${generatedId}`
    const errorId = error ? `${selectId}-error` : undefined
    const helperTextId = helperText && !error ? `${selectId}-helper` : undefined
    const describedBy = errorId || helperTextId

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            {label}
            {props.required && <span className="ml-1 text-[var(--error)]">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              // Use 16px (text-base) on mobile to prevent iOS Safari zoom on focus
              'flex h-11 w-full rounded-lg border px-4 py-2 text-base md:text-sm',
              'appearance-none cursor-pointer',
              'transition-all duration-200',
              'min-h-[44px]', // WCAG minimum touch target
              'bg-[var(--surface-1)] text-[var(--text-primary)]',
              error ? 'border-[var(--error)]' : 'border-[var(--border)]',
              'hover:border-[var(--border-hover)]',
              'focus-visible:border-[var(--primary)]',
              'focus-visible:ring-2',
              'focus-visible:ring-[var(--ring)]',
              'focus:bg-[var(--surface-2)]',
              'focus:shadow-sm',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            aria-required={props.required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            aria-disabled={props.disabled}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="w-5 h-5 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {(error || helperText) && (
          <div className="mt-2">
            {error && (
              <p
                id={errorId}
                role="alert"
                aria-live="polite"
                className="text-sm flex items-center gap-1 font-medium text-[var(--error)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
            {!error && helperText && (
              <p
                id={helperTextId}
                className="text-sm text-[var(--text-muted)]"
              >
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }

