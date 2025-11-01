'use client'

import NumberFlow, { type Format } from '@number-flow/react'
import { timingPresets } from '@/components/ui/number-flow'

interface AnimatedNumberProps {
  value: number
  format?: Format
  prefix?: string
  suffix?: string
  className?: string
  timing?: 'snappy' | 'default' | 'dramatic'
}

export function AnimatedNumber({
  value,
  format,
  prefix,
  suffix,
  className,
  timing = 'default',
}: AnimatedNumberProps) {
  return (
    <NumberFlow
      value={value}
      format={format}
      prefix={prefix}
      suffix={suffix}
      className={className}
      transformTiming={timingPresets[timing]}
    />
  )
}

interface AnimatedDecimalProps {
  value: number
  decimals?: number
  fallback?: string
  className?: string
  timing?: 'snappy' | 'default' | 'dramatic'
}

export function AnimatedDecimal({
  value,
  decimals = 1,
  fallback = '--',
  className,
  timing = 'default',
}: AnimatedDecimalProps) {
  if (value <= 0 && fallback) {
    return <span className={className}>{fallback}</span>
  }

  return (
    <NumberFlow
      value={value}
      format={{
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }}
      className={className}
      transformTiming={timingPresets[timing]}
    />
  )
}
