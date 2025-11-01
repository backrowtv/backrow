-- ============================================
-- ADD MOVIES TABLE RLS POLICIES
-- ============================================
-- Purpose: Fix missing RLS policies on movies table
-- Date: 2026-01-30
--
-- Issue: RLS was enabled on movies table but no policies existed,
-- preventing authenticated users from caching movie data.
-- This caused "Failed to add future nomination" errors because
-- the cacheMovie function couldn't insert/upsert movie records.
-- ============================================

BEGIN;

-- ============================================
-- 1. SELECT POLICY - Everyone can read movies (public cache)
-- ============================================
DROP POLICY IF EXISTS "Anyone can read movies" ON public.movies;
CREATE POLICY "Anyone can read movies"
  ON public.movies
  FOR SELECT
  USING (true);

-- ============================================
-- 2. INSERT POLICY - Authenticated users can cache movies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert movies" ON public.movies;
CREATE POLICY "Authenticated users can insert movies"
  ON public.movies
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================
-- 3. UPDATE POLICY - Authenticated users can update movie cache
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can update movies" ON public.movies;
CREATE POLICY "Authenticated users can update movies"
  ON public.movies
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

COMMIT;
