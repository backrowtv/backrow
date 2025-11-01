-- ============================================================================
-- Fix Activity Log Nullable Columns
-- Date: 2024-12-10
-- 
-- Problem: The activity_log table has NOT NULL constraints on club_id and user_id,
-- but the application's logging architecture requires:
-- - club_id to be nullable for member-only activities (e.g., generic ratings)
-- - user_id to be nullable for club-level activities (e.g., festival started)
-- 
-- This was causing all activity logging to silently fail.
-- ============================================================================

-- Make user_id nullable (for club-level activities where action is club-attributed)
ALTER TABLE public.activity_log ALTER COLUMN user_id DROP NOT NULL;

-- Make club_id nullable (for member activities without club context)
ALTER TABLE public.activity_log ALTER COLUMN club_id DROP NOT NULL;

-- ============================================================================
-- Update RLS Policies to handle nullable values
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Users can read activity log" ON public.activity_log;

-- Create new INSERT policy that handles both club and member activities
CREATE POLICY "Users can insert activity log" ON public.activity_log
  FOR INSERT 
  WITH CHECK (
    -- Allow club activities if user is a member of the club
    (
      club_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.club_members
        WHERE club_members.club_id = activity_log.club_id
        AND club_members.user_id = (SELECT auth.uid())
      )
    )
    OR
    -- Allow club activities if user is the club producer
    (
      club_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.clubs
        WHERE clubs.id = activity_log.club_id
        AND clubs.producer_id = (SELECT auth.uid())
      )
    )
    OR
    -- Allow member activities without club context (e.g., generic ratings)
    -- Only if the user is logging their own activity
    (
      club_id IS NULL 
      AND user_id = (SELECT auth.uid())
    )
  );

-- Create new SELECT policy that handles both club and member activities
CREATE POLICY "Users can read activity log" ON public.activity_log
  FOR SELECT
  USING (
    -- Can read club activities if member of the club
    (
      club_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.club_members
        WHERE club_members.club_id = activity_log.club_id
        AND club_members.user_id = (SELECT auth.uid())
      )
    )
    OR
    -- Can read own member activities (regardless of club context)
    (
      user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This ensures:
-- 1. Club activities (user_id = null) can be logged for club-level events
-- 2. Member activities without club context (club_id = null) can be logged
-- 3. RLS policies correctly handle both scenarios
-- 4. Activity feeds will now update properly
-- ============================================================================

