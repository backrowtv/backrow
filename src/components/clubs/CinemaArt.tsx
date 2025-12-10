import * as React from 'react'

interface CinemaArtProps {
  className?: string
  variant?: 'curtains' | 'film-strip' | 'spotlight' | 'ticket' | 'clapperboard'
  style?: React.CSSProperties
}

export function CinemaArt({ className = '', variant = 'curtains', style }: CinemaArtProps) {
  switch (variant) {
    case 'curtains':
      return (
        <svg
          viewBox="0 0 200 120"
          className={className}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Left curtain */}
          <path
            d="M0 0 L0 120 Q50 60 50 0 Z"
            fill="url(#curtainGradient)"
            opacity="0.8"
          />
          {/* Right curtain */}
          <path
            d="M200 0 L200 120 Q150 60 150 0 Z"
            fill="url(#curtainGradient)"
            opacity="0.8"
          />
          {/* Center stage */}
          <rect x="50" y="0" width="100" height="120" fill="url(#stageGradient)" />
          {/* Curtain folds */}
          <path
            d="M0 0 Q25 30 50 0"
            stroke="rgba(251, 113, 133, 0.3)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M200 0 Q175 30 150 0"
            stroke="rgba(251, 113, 133, 0.3)"
            strokeWidth="2"
            fill="none"
          />
          <defs>
            <linearGradient id="curtainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#BE123C" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="stageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      )
    
    case 'film-strip':
      return (
        <svg
          viewBox="0 0 200 80"
          className={className}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Film strip base */}
          <rect x="0" y="20" width="200" height="40" fill="#1E293B" rx="4" />
          {/* Perforations */}
          {[10, 30, 50, 70, 90, 110, 130, 150, 170, 190].map((x) => (
            <circle key={x} cx={x} cy="20" r="3" fill="#0A0A0A" />
          ))}
          {[10, 30, 50, 70, 90, 110, 130, 150, 170, 190].map((x) => (
            <circle key={x} cx={x} cy="60" r="3" fill="#0A0A0A" />
          ))}
          {/* Frames */}
          <rect x="20" y="25" width="30" height="30" fill="#F43F5E" opacity="0.3" rx="2" />
          <rect x="60" y="25" width="30" height="30" fill="#F43F5E" opacity="0.3" rx="2" />
          <rect x="100" y="25" width="30" height="30" fill="#F43F5E" opacity="0.3" rx="2" />
          <rect x="140" y="25" width="30" height="30" fill="#F43F5E" opacity="0.3" rx="2" />
        </svg>
      )
    
    case 'spotlight':
      return (
        <svg
          viewBox="0 0 200 200"
          className={className}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Spotlight beam */}
          <ellipse
            cx="100"
            cy="100"
            rx="80"
            ry="100"
            fill="url(#spotlightGradient)"
            opacity="0.4"
          />
          {/* Light source */}
          <circle cx="100" cy="20" r="8" fill="#FEF3C7" />
          {/* Light rays */}
          <path
            d="M100 20 L60 80"
            stroke="#FEF3C7"
            strokeWidth="2"
            opacity="0.3"
          />
          <path
            d="M100 20 L140 80"
            stroke="#FEF3C7"
            strokeWidth="2"
            opacity="0.3"
          />
          <defs>
            <radialGradient id="spotlightGradient" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#F43F5E" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      )
    
    case 'ticket':
      return (
        <svg
          viewBox="0 0 200 100"
          className={className}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Ticket shape */}
          <path
            d="M10 10 L190 10 Q200 10 200 20 L200 40 Q200 50 190 50 L10 50 Q0 50 0 40 L0 20 Q0 10 10 10 Z"
            fill="url(#ticketGradient)"
            stroke="#F43F5E"
            strokeWidth="2"
          />
          {/* Perforations */}
          <circle cx="10" cy="30" r="3" fill="#0A0A0A" />
          <circle cx="190" cy="30" r="3" fill="#0A0A0A" />
          {/* Decorative lines */}
          <line x1="30" y1="30" x2="170" y2="30" stroke="#F43F5E" strokeWidth="1" opacity="0.3" />
          <defs>
            <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      )
    
    case 'clapperboard':
      return (
        <svg
          viewBox="0 0 200 150"
          className={className}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Clapperboard base */}
          <path
            d="M20 30 L180 30 L160 120 L0 120 Z"
            fill="url(#clapperGradient)"
            stroke="#F43F5E"
            strokeWidth="2"
          />
          {/* Stripe */}
          <path
            d="M20 30 L180 30 L170 50 L10 50 Z"
            fill="#FEF3C7"
            opacity="0.4"
          />
          {/* Handle */}
          <rect x="10" y="100" width="20" height="30" fill="#BE123C" rx="2" />
          <defs>
            <linearGradient id="clapperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      )
    
    default:
      return null
  }
}

