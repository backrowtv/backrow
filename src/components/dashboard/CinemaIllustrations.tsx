/**
 * Cinema Illustrations Placeholders
 * 
 * PLACEHOLDER: Replace with professional cinema-themed illustrations
 * 
 * These components are used in the dashboard.
 * Should be clean, modern, and match BackRow brand colors.
 * No animations or distracting elements.
 */

import { cn } from '@/lib/utils'

/**
 * PLACEHOLDER: Cinema curtains illustration
 * Description: Theater curtains opening, for club-related displays
 */
export function CinemaCurtainsIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">🎭</div>
        <p className="text-xs font-mono">[Curtains Illustration]</p>
      </div>
    </div>
  )
}

/**
 * PLACEHOLDER: Film reel illustration
 * Description: Film reel icon for festivals
 */
export function FilmReelIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">🎞️</div>
        <p className="text-xs font-mono">[Film Reel Illustration]</p>
      </div>
    </div>
  )
}

/**
 * PLACEHOLDER: Movie camera illustration
 * Description: Movie camera icon for movies watched
 */
export function MovieCameraIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">📹</div>
        <p className="text-xs font-mono">[Camera Illustration]</p>
      </div>
    </div>
  )
}

/**
 * PLACEHOLDER: Cinema seats illustration
 * Description: Multiple rows of cinema seats for empty states
 */
export function CinemaSeatsIllustration({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center p-4', className)} style={style}>
      <div className="text-center opacity-30">
        <div className="text-4xl mb-2">🪑</div>
        <p className="text-xs font-mono">[Seats Illustration]</p>
      </div>
    </div>
  )
}
