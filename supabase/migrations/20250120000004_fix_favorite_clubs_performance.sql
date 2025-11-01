-- ============================================
-- FIX favorite_clubs PERFORMANCE WARNINGS
-- ============================================
-- Purpose: Fix Auth RLS Initialization Plan and Multiple Permissive Policies warnings
-- Date: 2025-01-20
-- 
-- This migration fixes Performance Advisor warnings for favorite_clubs by:
-- 1. Dropping all existing policies (including conflicting ones)
-- 2. Creating a single optimized SELECT policy that combines both conditions
-- 3. Optimizing INSERT/UPDATE/DELETE policies with (select auth.uid())
-- ============================================

BEGIN;

-- ============================================
-- 1. DROP ALL EXISTING POLICIES
-- ============================================
-- Drop all policies that might exist from previous migrations

DROP POLICY IF EXISTS "Users can read own favorite clubs" ON public.favorite_clubs;
DROP POLICY IF EXISTS "Users can read favorite clubs of public clubs" ON public.favorite_clubs;
DROP POLICY IF EXISTS "Users can read favorite clubs" ON public.favorite_clubs;
DROP POLICY IF EXISTS "Users can manage own favorite clubs" ON public.favorite_clubs;
DROP POLICY IF EXISTS "Users can insert own favorite clubs" ON public.favorite_clubs;
DROP POLICY IF EXISTS "Users can update own favorite clubs" ON public.favorite_clubs;
DROP POLICY IF EXISTS "Users can delete own favorite clubs" ON public.favorite_clubs;

-- ============================================
-- 2. CREATE OPTIMIZED SINGLE SELECT POLICY
-- ============================================
-- Combine both conditions into one policy:
-- - Users can read their own favorite clubs
-- - Users can read favorite clubs of public clubs (for discovery)

CREATE POLICY "Users can read favorite clubs"
ON public.favorite_clubs
FOR SELECT
USING (
  -- Own favorite clubs
  (select auth.uid()) = user_id
  OR
  -- Favorite clubs of public clubs (for discovery)
  EXISTS (
    SELECT 1 FROM public.clubs
    WHERE clubs.id = favorite_clubs.club_id
    AND clubs.privacy IN ('public_open', 'public_password', 'public_invite', 'public_request')
    AND clubs.archived = false
  )
);

-- ============================================
-- 3. CREATE OPTIMIZED INSERT POLICY
-- ============================================

CREATE POLICY "Users can insert own favorite clubs"
ON public.favorite_clubs
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- 4. CREATE OPTIMIZED UPDATE POLICY
-- ============================================

CREATE POLICY "Users can update own favorite clubs"
ON public.favorite_clubs
FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- 5. CREATE OPTIMIZED DELETE POLICY
-- ============================================

CREATE POLICY "Users can delete own favorite clubs"
ON public.favorite_clubs
FOR DELETE
USING ((select auth.uid()) = user_id);

COMMIT;

