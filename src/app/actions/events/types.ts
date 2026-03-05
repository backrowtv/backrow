/**
 * Event Types
 *
 * Type definitions for club events.
 */

export type EventType = 'watch_party' | 'discussion' | 'meetup' | 'custom'
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
export type RSVPStatus = 'going' | 'maybe' | 'not_going'

export interface ClubEvent {
  id: string
  club_id: string
  created_by: string
  poll_id: string | null
  title: string
  description: string | null
  event_type: EventType
  event_date: string
  end_date: string | null
  tmdb_id: number | null
  status: EventStatus
  location: string | null
  max_attendees: number | null
  created_at: string
  updated_at: string
  // Joined data
  creator?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  movie?: {
    tmdb_id: number
    title: string
    poster_url: string | null
  }
  rsvps?: EventRSVP[]
  rsvp_counts?: {
    going: number
    maybe: number
    not_going: number
  }
}

export interface EventRSVP {
  event_id: string
  user_id: string
  status: RSVPStatus
  created_at: string
  user?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface EventAttendee {
  user_id: string
  status: RSVPStatus
  created_at: string
  user: {
    id: string
    display_name: string | null
    avatar_url: string | null
    username: string | null
  }
}
