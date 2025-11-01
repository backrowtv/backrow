/**
 * Event Actions - Re-export Module
 *
 * This file re-exports all event-related server actions from the events/ subdirectory.
 * For new imports, prefer importing directly from '@/app/actions/events'.
 *
 * NOTE: 'use server' is NOT used here because re-exports are not allowed in server action files.
 * Each sub-module has its own 'use server' directive.
 *
 * @see src/app/actions/events/types.ts - Type definitions
 * @see src/app/actions/events/crud.ts - Create, update, delete operations
 * @see src/app/actions/events/rsvp.ts - RSVP management
 * @see src/app/actions/events/queries.ts - Data fetching
 */

// Re-export all event functions and types for backward compatibility
export type {
  EventType,
  EventStatus,
  RSVPStatus,
  ClubEvent,
  EventRSVP,
  EventAttendee,
} from './events/index'

export {
  // CRUD operations
  createEvent,
  updateEvent,
  deleteEvent,
  cancelEvent,
  createEventFromPoll,
  // RSVP operations
  rsvpToEvent,
  removeRsvp,
  getUserRsvp,
  // Query operations
  getClubEvents,
  getEvent,
  getEventAttendees,
  getPastEvents,
} from './events/index'
