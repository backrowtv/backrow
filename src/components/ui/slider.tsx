'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'defaultValue' | 'value' | 'onChange'> {
  defaultValue?: number[]
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, defaultValue = [0], value, onValueChange, min = 0, max = 10, step = 1, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<number[]>(defaultValue)
    const currentValue = value ?? internalValue
    const sliderValue = currentValue[0] ?? 0

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [parseFloat(e.target.value)]
      if (value === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    }

    return (
      <div className={cn('relative flex w-full items-center', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleChange}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-full touch-action-none',
            // Track styling for webkit (Chrome, Safari, Edge)
            '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[var(--border)]',
            // Track styling for Firefox
            '[&::-moz-range-track]:h-2 [&::-moz-range-track]:w-full [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[var(--border)]',
            // Thumb styling for webkit
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--background)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-1.5',
            // Thumb styling for Firefox
            '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--primary)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--background)] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
