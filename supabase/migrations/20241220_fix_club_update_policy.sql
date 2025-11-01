-- ============================================================================
-- Fix Club UPDATE Policy for Privacy Changes
-- Date: 2024-12-20
-- Purpose: Ensure UPDATE policy has both USING and WITH CHECK clauses
--          to allow updating privacy field (including changing to private)
-- ============================================================================

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their clubs" ON public.clubs;

-- Recreate UPDATE policy with both USING and WITH CHECK
-- This ensures users can update clubs (including privacy changes) if they are the producer
CREATE POLICY "Users can update their clubs" ON public.clubs
  FOR UPDATE
  USING (producer_id = (select auth.uid()))
  WITH CHECK (producer_id = (select auth.uid()));

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This ensures:
-- 1. Users can update clubs if they are the producer (USING clause)
-- 2. Users can set any values (including privacy='private') if they are the producer (WITH CHECK clause)
-- 3. Both clauses are required for UPDATE policies in PostgreSQL RLS
-- ============================================================================

