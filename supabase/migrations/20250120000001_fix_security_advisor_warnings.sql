-- ============================================
-- FIX SECURITY ADVISOR WARNINGS
-- ============================================
-- Purpose: Enable RLS on all tables that may be missing it
-- Date: 2025-01-20
-- 
-- This migration addresses Security Advisor warnings by:
-- 1. Enabling RLS on favorite_clubs table (if missing)
-- 2. Adding RLS policies for favorite_clubs
-- 3. Verifying all tables have RLS enabled
-- ============================================

BEGIN;

-- ============================================
-- 1. ENABLE RLS ON favorite_clubs
-- ============================================

ALTER TABLE IF EXISTS public.favorite_clubs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREATE RLS POLICIES FOR favorite_clubs
-- ============================================

-- Users can read their own favorite clubs
DROP POLICY IF EXISTS "Users can read own favorite clubs" ON public.favorite_clubs;
CREATE POLICY "Users can read own favorite clubs"
  ON public.favorite_clubs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read favorite clubs of public clubs (for discovery)
DROP POLICY IF EXISTS "Users can read favorite clubs of public clubs" ON public.favorite_clubs;
CREATE POLICY "Users can read favorite clubs of public clubs"
  ON public.favorite_clubs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = favorite_clubs.club_id
      AND clubs.privacy IN ('public_open', 'public_password', 'public_invite', 'public_request')
      AND clubs.archived = false
    )
  );

-- Users can add/remove their own favorite clubs
DROP POLICY IF EXISTS "Users can manage own favorite clubs" ON public.favorite_clubs;
CREATE POLICY "Users can manage own favorite clubs"
  ON public.favorite_clubs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. VERIFY ALL TABLES HAVE RLS ENABLED
-- ============================================
-- This section ensures RLS is enabled on all tables
-- Note: Some tables may already have RLS enabled from previous migrations

-- Core tables (should already be enabled, but ensure they are)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.club_members ENABLE ROW LEVEL SECURITY;

-- Content tables
ALTER TABLE IF EXISTS public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.club_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.private_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages_archive ENABLE ROW LEVEL SECURITY;

-- Festival tables
ALTER TABLE IF EXISTS public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generic_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stack_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.theme_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_log ENABLE ROW LEVEL SECURITY;

-- Analytics tables
ALTER TABLE IF EXISTS public.festival_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.club_stats ENABLE ROW LEVEL SECURITY;

-- Feature tables
ALTER TABLE IF EXISTS public.backrow_matinee ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Cache tables (public read access)
ALTER TABLE IF EXISTS public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tmdb_search_cache ENABLE ROW LEVEL SECURITY;

-- Junction tables
ALTER TABLE IF EXISTS public.favorite_clubs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CHECK FOR festival_results TABLE
-- ============================================
-- festival_results may exist but not have RLS enabled

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'festival_results'
  ) THEN
    ALTER TABLE public.festival_results ENABLE ROW LEVEL SECURITY;
    
    -- Add policy if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'festival_results'
      AND policyname = 'Festival results viewable by festival members'
    ) THEN
      CREATE POLICY "Festival results viewable by festival members"
        ON public.festival_results
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.festivals f
            JOIN public.club_members cm ON f.club_id = cm.club_id
            WHERE f.id = festival_results.festival_id
            AND cm.user_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this query in Supabase SQL Editor to verify RLS is enabled on all tables:
--
-- SELECT 
--   schemaname,
--   tablename,
--   rowsecurity as rls_enabled
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- All tables should show rls_enabled = true

