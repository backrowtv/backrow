-- ============================================
-- FIX PERFORMANCE ADVISOR WARNINGS
-- ============================================
-- Purpose: Optimize RLS policies for better performance
-- Date: 2025-01-20
-- 
-- This migration fixes Performance Advisor warnings by:
-- 1. Wrapping auth.uid() in (select auth.uid()) to prevent re-evaluation per row
-- 2. Combining multiple permissive SELECT policies into single policies
-- ============================================

BEGIN;

-- ============================================
-- 1. FIX festival_standings - Auth RLS Initialization Plan
-- ============================================

DROP POLICY IF EXISTS "Festival standings viewable by festival members" ON public.festival_standings;

CREATE POLICY "Festival standings viewable by festival members"
ON public.festival_standings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.festivals f
        JOIN public.club_members cm ON f.club_id = cm.club_id
        WHERE f.id = festival_standings.festival_id
        AND cm.user_id = (select auth.uid())
    )
);

-- ============================================
-- 2. FIX club_stats - Auth RLS Initialization Plan
-- ============================================

DROP POLICY IF EXISTS "Club stats viewable by public or members" ON public.club_stats;

CREATE POLICY "Club stats viewable by public or members"
ON public.club_stats FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id = club_stats.club_id
        AND (
            c.privacy = 'public_open' 
            OR EXISTS (
                SELECT 1 FROM public.club_members cm
                WHERE cm.club_id = c.id AND cm.user_id = (select auth.uid())
            )
        )
    )
);

-- ============================================
-- 3. FIX direct_messages - Auth RLS Initialization Plan + Multiple Policies
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages to club members" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can mark own messages as read" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can delete own sent messages" ON public.direct_messages;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can read own messages" ON public.direct_messages
  FOR SELECT
  USING (
    (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = direct_messages.club_id
      AND user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can send messages to club members" ON public.direct_messages
  FOR INSERT
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = direct_messages.club_id
      AND user_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = direct_messages.club_id
      AND user_id = direct_messages.recipient_id
    )
  );

CREATE POLICY "Users can mark own messages as read" ON public.direct_messages
  FOR UPDATE
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

CREATE POLICY "Users can delete own sent messages" ON public.direct_messages
  FOR DELETE
  USING (sender_id = (select auth.uid()));

-- ============================================
-- 4. FIX favorite_clubs - Auth RLS Initialization Plan + Multiple Policies
-- ============================================
-- NOTE: Skipping favorite_clubs optimization due to policy conflict
-- This will be fixed in a separate migration (20250120000004_fix_favorite_clubs_performance.sql)
-- after manually dropping the existing "Users can read favorite clubs" policy

-- ============================================
-- 5. FIX backrow_matinee - Multiple Permissive Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active matinee" ON public.backrow_matinee;
DROP POLICY IF EXISTS "Authenticated users can view all matinees" ON public.backrow_matinee;

-- Combine into single SELECT policy
CREATE POLICY "Users can view matinees" ON public.backrow_matinee
  FOR SELECT
  USING (
    expires_at IS NULL 
    OR expires_at > NOW()
    OR (select auth.uid()) IS NOT NULL  -- Authenticated users can see all
  );

-- ============================================
-- 6. FIX festival_results - Auth RLS Initialization Plan + Multiple Policies
-- ============================================

-- Check if festival_results table exists and has policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'festival_results'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Festival results viewable by festival members" ON public.festival_results;
    DROP POLICY IF EXISTS "Users can read festival results" ON public.festival_results;
    
    -- Create optimized single policy
    CREATE POLICY "Festival results viewable by festival members"
      ON public.festival_results
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.festivals f
          JOIN public.club_members cm ON f.club_id = cm.club_id
          WHERE f.id = festival_results.festival_id
          AND cm.user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

COMMIT;

