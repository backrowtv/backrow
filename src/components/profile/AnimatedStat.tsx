'use client'

import NumberFlow, { NumberFlowGroup } from '@/components/ui/number-flow'

interface AnimatedStatProps {
  value: number | string
  className?: string
}

export function AnimatedStat({ value, className }: AnimatedStatProps) {
  // Handle string format like "X/Y" (e.g., "3/5" for nominators guessed)
  if (typeof value === 'string') {
    const parts = value.split('/')
    if (parts.length === 2) {
      const [num, denom] = parts.map(p => parseInt(p, 10))
      if (!isNaN(num) && !isNaN(denom)) {
        return (
          <span className={className}>
            <NumberFlowGroup>
              <NumberFlow value={num} />
              <span>/</span>
              <NumberFlow value={denom} />
            </NumberFlowGroup>
          </span>
        )
      }
    }
    // If not a fraction format, just return the string as-is
    return <span className={className}>{value}</span>
  }

  // Handle numeric values
  return <NumberFlow value={value} className={className} />
}

interface AnimatedDecimalStatProps {
  value: number
  decimals?: number
  className?: string
}

export function AnimatedDecimalStat({ value, decimals = 2, className }: AnimatedDecimalStatProps) {
  return (
    <NumberFlow
      value={value}
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      className={className}
    />
  )
}
