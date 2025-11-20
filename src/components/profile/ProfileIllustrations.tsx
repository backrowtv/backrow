import * as React from 'react'

// Custom cinema-themed SVG illustrations
export function FilmStripIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10" y="20" width="80" height="60" rx="4" fill="currentColor" opacity="0.1" />
      <rect x="10" y="20" width="80" height="60" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="35" r="3" fill="currentColor" />
      <circle cx="20" cy="50" r="3" fill="currentColor" />
      <circle cx="20" cy="65" r="3" fill="currentColor" />
      <circle cx="80" cy="35" r="3" fill="currentColor" />
      <circle cx="80" cy="50" r="3" fill="currentColor" />
      <circle cx="80" cy="65" r="3" fill="currentColor" />
      <rect x="30" y="30" width="15" height="20" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="55" y="30" width="15" height="20" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M30 20 L30 40 L25 40 L25 50 Q25 60 35 60 L65 60 Q75 60 75 50 L75 40 L70 40 L70 20 Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M30 20 L30 40 L25 40 L25 50 Q25 60 35 60 L65 60 Q75 60 75 50 L75 40 L70 40 L70 20 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.3" />
      <rect x="40" y="60" width="20" height="15" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="40" y="60" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="35" y="75" width="30" height="5" rx="2" fill="currentColor" />
    </svg>
  )
}

export function ClapperboardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 30 L80 30 L75 70 L15 70 Z"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M20 30 L80 30 L75 70 L15 70 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20 30 L50 30 L45 70 L15 70 Z"
        fill="currentColor"
        opacity="0.3"
      />
      <line x1="20" y1="30" x2="50" y2="30" stroke="currentColor" strokeWidth="2" />
      <line x1="20" y1="30" x2="15" y2="70" stroke="currentColor" strokeWidth="2" />
      <circle cx="35" cy="50" r="2" fill="currentColor" />
      <circle cx="60" cy="45" r="2" fill="currentColor" />
      <circle cx="65" cy="55" r="2" fill="currentColor" />
    </svg>
  )
}

export function TicketIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Film reel base */}
      <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.08" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      
      {/* Inner ring */}
      <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.15" />
      <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      
      {/* Sprocket holes - positioned around the reel */}
      <circle cx="50" cy="22" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="74" cy="35" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="74" cy="65" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="50" cy="78" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="26" cy="65" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="26" cy="35" r="4" fill="currentColor" opacity="0.3" />
      
      {/* Decorative plus sign in center - "add to watchlist" hint */}
      <line x1="50" y1="44" x2="50" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="44" y1="50" x2="56" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function StarRatingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 10 L60 40 L90 40 L68 58 L78 88 L50 70 L22 88 L32 58 L10 40 L40 40 Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M50 10 L60 40 L90 40 L68 58 L78 88 L50 70 L22 88 L32 58 L10 40 L40 40 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CinemaCurtains({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left curtain */}
      <path
        d="M0 0 Q50 20 50 50 Q50 80 0 100 L0 0 Z"
        fill="url(#curtainGradient)"
        opacity="0.3"
      />
      <path
        d="M0 0 Q50 20 50 50 Q50 80 0 100"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      {/* Right curtain */}
      <path
        d="M200 0 Q150 20 150 50 Q150 80 200 100 L200 0 Z"
        fill="url(#curtainGradient)"
        opacity="0.3"
      />
      <path
        d="M200 0 Q150 20 150 50 Q150 80 200 100"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      <defs>
        <linearGradient id="curtainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function GradientOrb({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-2)] via-transparent to-transparent rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--surface-3)] via-transparent to-[var(--surface-2)] rounded-full blur-2xl" />
    </div>
  )
}

