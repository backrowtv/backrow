-- ============================================================================
-- Fix Activity Log INSERT Policy
-- Date: 2024-12-20



-- Purpose: Add INSERT policy for activity_log table to allow activity logging
-- ============================================================================

-- Add INSERT policy for activity_log
-- Users can insert activity logs if they are members of the club
-- This allows logging activities like club creation, member joins, etc.
DROP POLICY IF EXISTS "Users can insert activity log" ON public.activity_log;
CREATE POLICY "Users can insert activity log" ON public.activity_log
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is a member of the club
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = activity_log.club_id
      AND club_members.user_id = (select auth.uid())
    )
    OR
    -- Allow if user is the club producer (for club creation events)
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = activity_log.club_id
      AND clubs.producer_id = (select auth.uid())
    )
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This ensures:
-- 1. Users can insert activity logs for clubs they're members of
-- 2. Club producers can insert activity logs (for club creation events)
-- 3. Activity logging will work correctly after club creation
-- ============================================================================

