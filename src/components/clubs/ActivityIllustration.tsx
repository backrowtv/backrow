import * as React from 'react'

interface ActivityIllustrationProps {
  action: string
  className?: string
}

export function ActivityIllustration({ action, className = '' }: ActivityIllustrationProps) {
  // Custom SVG illustrations for different activity types
  const getIllustration = () => {
    switch (action) {
      case 'joined':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="#B86A8D" opacity="0.2" />
            <path d="M30 50 L45 65 L70 35" stroke="#B86A8D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="50" r="35" stroke="#B86A8D" strokeWidth="2" opacity="0.3" />
          </svg>
        )
      case 'festival_created':
      case 'festival_started':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="30" width="60" height="50" rx="4" fill="#B86A8D" opacity="0.2" />
            <path d="M25 35 L50 50 L75 35" stroke="#B86A8D" strokeWidth="3" strokeLinecap="round" />
            <circle cx="35" cy="55" r="3" fill="#FEF3C7" />
            <circle cx="50" cy="60" r="3" fill="#FEF3C7" />
            <circle cx="65" cy="55" r="3" fill="#FEF3C7" />
          </svg>
        )
      case 'promoted':
      case 'demoted':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 20 L70 50 L50 45 L30 50 Z" fill="#B86A8D" opacity="0.3" />
            <circle cx="50" cy="60" r="15" fill="#B86A8D" opacity="0.2" />
            <path d="M50 20 L50 45" stroke="#B86A8D" strokeWidth="3" strokeLinecap="round" />
            <path d="M50 60 L50 80" stroke="#B86A8D" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="30" fill="#B86A8D" opacity="0.2" />
            <circle cx="50" cy="50" r="20" stroke="#B86A8D" strokeWidth="2" opacity="0.5" />
            <circle cx="50" cy="50" r="3" fill="#B86A8D" />
          </svg>
        )
    }
  }

  return <div className="w-12 h-12 flex-shrink-0">{getIllustration()}</div>
}

