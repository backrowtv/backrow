import React from 'react'

interface ActivityIconProps {
  className?: string
}

// Promoted icon - upward arrow with person
export function PromotedIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 20 C6 16 8.5 13 12 13 C15.5 13 18 16 18 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 2 L12 6 M9 5 L12 2 L15 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Demoted icon - downward arrow with person
export function DemotedIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 20 C6 16 8.5 13 12 13 C15.5 13 18 16 18 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18 L12 22 M9 19 L12 22 L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Removed member icon - person with X
export function RemovedMemberIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 20 C6 16 8.5 13 12 13 C15.5 13 18 16 18 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 8 L16 16 M16 8 L8 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Joined icon - person entering door
export function JoinedIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 4 L12 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M15 12 L19 8 L23 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Left icon - person exiting door
export function LeftIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 4 L12 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="7" cy="8" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9 12 L5 8 L1 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Festival created icon - clapperboard
export function FestivalCreatedIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 4 L20 4 L18 20 L4 20 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4 L18 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
      <circle cx="16" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

// Festival started icon - play button
export function FestivalStartedIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9 8 L17 12 L9 16 Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Festival completed icon - checkmark with trophy
export function FestivalCompletedIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 12 L11 15 L16 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4 L12 2 M10 4 L14 4 M12 4 L12 8 M10 8 L14 8 M8 8 L16 8 L15 20 L9 20 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Default activity icon - generic activity
export function DefaultActivityIcon({ className = 'w-5 h-5' }: ActivityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

// Get icon component based on action type
export function getActivityIcon(action: string) {
  switch (action) {
    case 'promoted':
      return PromotedIcon
    case 'demoted':
      return DemotedIcon
    case 'removed_member':
      return RemovedMemberIcon
    case 'joined':
      return JoinedIcon
    case 'left':
      return LeftIcon
    case 'festival_created':
      return FestivalCreatedIcon
    case 'festival_started':
      return FestivalStartedIcon
    case 'festival_completed':
      return FestivalCompletedIcon
    default:
      return DefaultActivityIcon
  }
}

