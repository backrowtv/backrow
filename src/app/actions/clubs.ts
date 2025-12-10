/**
 * Club Actions - Re-export Module
 * 
 * This file re-exports all club-related server actions from the modular structure.
 * Import directly from this file OR from individual modules:
 * 
 * NOTE: 'use server' is NOT used here because export * is not allowed in server action files.
 * Each sub-module has its own 'use server' directive.
 * 
 * - @/app/actions/clubs/announcements - Club announcement CRUD
 * - @/app/actions/clubs/polls - Poll creation and voting
 * - @/app/actions/clubs/membership - Join club operations
 * - @/app/actions/clubs/settings - Club settings updates
 * - @/app/actions/clubs/moderation - Blocking, word blacklist
 * - @/app/actions/clubs/ownership - Transfer, delete
 * - @/app/actions/clubs/queries - Cached queries
 * - @/app/actions/clubs/crud - Create, update, archive clubs
 */

// Re-export all modular actions for backwards compatibility
export * from './clubs/announcements'
export * from './clubs/polls'
export * from './clubs/membership'
export * from './clubs/join-requests'
export * from './clubs/settings'
export * from './clubs/moderation'
export * from './clubs/ownership'
export * from './clubs/queries'
export * from './clubs/crud'
