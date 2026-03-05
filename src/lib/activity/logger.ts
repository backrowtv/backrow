import { createClient } from '@/lib/supabase/server'
import { 
  ClubActivityType, 
  MemberActivityType, 
  isClubActivityType, 
  isMemberActivityType 
} from './activity-types'

// ============================================
// LEGACY FUNCTION (for backward compatibility)
// ============================================

/**
 * @deprecated Use logClubActivity or logMemberActivity instead
 * Kept for backward compatibility during migration
 */
export async function logActivity(
  clubId: string,
  userId: string | null,
  action: string,
  details?: Record<string, unknown> | null
) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('activity_log').insert({
    club_id: clubId,
    user_id: userId,
    action,
    details: details || null,
  })
  
  if (error) {
    console.error('Failed to log activity:', error)
  }
}

// ============================================
// CLUB ACTIVITY LOGGING
// ============================================

/**
 * Log a club-level activity.
 * These activities are shown to all club members and are attributed to the club itself.
 * The user_id is set to null to indicate this is a club action, not a user action.
 * 
 * @param clubId - The club ID where the activity occurred
 * @param action - The type of club activity
 * @param details - Additional details about the activity (movie title, festival theme, etc.)
 */
export async function logClubActivity(
  clubId: string,
  action: ClubActivityType,
  details?: Record<string, unknown>
) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('activity_log').insert({
    club_id: clubId,
    user_id: null, // Club activities have no user attribution
    action,
    details: details || null,
  })
  
  if (error) {
    console.error('Failed to log club activity:', error, { clubId, action })
  }
}

// ============================================
// MEMBER ACTIVITY LOGGING
// ============================================

/**
 * Log a member-level activity.
 * These activities are private to the user who performed them.
 * They will only be shown to the logged-in user in their personal activity feed.
 * 
 * @param userId - The user ID who performed the action
 * @param action - The type of member activity
 * @param details - Additional details about the activity
 * @param clubId - Optional club context (for activities that occurred within a club)
 */
export async function logMemberActivity(
  userId: string,
  action: MemberActivityType,
  details?: Record<string, unknown>,
  clubId?: string
) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('activity_log').insert({
    club_id: clubId || null, // Optional club context
    user_id: userId,
    action,
    details: details || null,
  })
  
  if (error) {
    console.error('Failed to log member activity:', error, { userId, action })
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Log both club and member activity for actions that should appear in both feeds.
 * For example, when a user joins a club:
 * - Club sees: "New member joined"
 * - User sees: "Joined [ClubName]"
 * 
 * @param clubId - The club ID
 * @param userId - The user ID
 * @param clubAction - The club-level action type
 * @param memberAction - The member-level action type
 * @param details - Shared details for both activities
 */
export async function logDualActivity(
  clubId: string,
  userId: string,
  clubAction: ClubActivityType,
  memberAction: MemberActivityType,
  details?: Record<string, unknown>
) {
  // Log both in parallel
  await Promise.all([
    logClubActivity(clubId, clubAction, details),
    logMemberActivity(userId, memberAction, details, clubId),
  ])
}

/**
 * Helper to determine if an existing activity is a club activity
 */
export function isClubActivity(action: string): boolean {
  return isClubActivityType(action)
}

/**
 * Helper to determine if an existing activity is a member activity
 */
export function isMemberActivity(action: string): boolean {
  return isMemberActivityType(action)
}
