'use client'

import NumberFlow, { NumberFlowGroup } from '@number-flow/react'

// Re-export for convenience
export { NumberFlow, NumberFlowGroup }
export default NumberFlow

// Timing presets for different contexts
export const timingPresets = {
  // Notification badges, live updating values
  snappy: { duration: 300, easing: 'ease-out' } as const,
  // Standard stats, counts, general numbers
  default: { duration: 500, easing: 'ease-out' } as const,
  // Reveals, podium results, year-in-review stats
  dramatic: { duration: 750, easing: 'ease-out' } as const,
}
