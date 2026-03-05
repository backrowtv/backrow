/**
 * Cinema Illustrations Placeholders
 * 
 * PLACEHOLDER: Replace with professional cinema-themed illustrations
 * 
 * These components are used in the discover/clubs pages.
 * Should be clean, modern, and match BackRow brand colors.
 * No animations or distracting elements.
 */

import { cn } from '@/lib/utils'

interface CinemaIllustrationProps {
  className?: string
}

/**
 * PLACEHOLDER: Cinema seats illustration
 * Description: Three cinema seats in a row, subtle and professional
 */
export function CinemaSeatsIllustration({ className }: CinemaIllustrationProps) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">🪑</div>
        <p className="text-xs font-mono">[Seats Illustration]</p>
      </div>
    </div>
  )
}

/**
 * PLACEHOLDER: Film strip illustration
 * Description: Horizontal film strip with perforations and frames
 */
export function FilmStripIllustration({ className }: CinemaIllustrationProps) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">🎞️</div>
        <p className="text-xs font-mono">[Film Strip Illustration]</p>
      </div>
    </div>
  )
}

/**
 * PLACEHOLDER: Search cinema illustration
 * Description: Magnifying glass with cinema theme
 */
export function SearchCinemaIllustration({ className }: CinemaIllustrationProps) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-xs font-mono">[Search Illustration]</p>
      </div>
    </div>
  )
}

/**
 * PLACEHOLDER: Empty discover illustration
 * Description: Cinema curtain with spotlight for empty states
 */
export function EmptyDiscoverIllustration({ className }: CinemaIllustrationProps) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">🎭</div>
        <p className="text-xs font-mono">[Empty State Illustration]</p>
      </div>
    </div>
  )
}
