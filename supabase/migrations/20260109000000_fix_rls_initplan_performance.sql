-- Fix RLS InitPlan Performance Issues
-- This migration fixes 10 RLS policies that use auth.uid() directly instead of (select auth.uid())
-- The subselect pattern ensures the auth function is evaluated once per query, not per row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================
-- future_nomination_links table (4 policies)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own future nomination links" ON future_nomination_links;
DROP POLICY IF EXISTS "Users can insert own future nomination links" ON future_nomination_links;
DROP POLICY IF EXISTS "Users can update own future nomination links" ON future_nomination_links;
DROP POLICY IF EXISTS "Users can delete own future nomination links" ON future_nomination_links;

-- Recreate with optimized (select auth.uid()) pattern
CREATE POLICY "Users can view own future nomination links"
  ON future_nomination_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own future nomination links"
  ON future_nomination_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own future nomination links"
  ON future_nomination_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own future nomination links"
  ON future_nomination_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = (select auth.uid())
    )
  );

-- ============================================
-- generic_ratings table (3 policies)
-- Note: SELECT policy already uses (select auth.uid())
-- ============================================

-- Drop existing policies that need fixing
DROP POLICY IF EXISTS "Users can insert own generic ratings" ON generic_ratings;
DROP POLICY IF EXISTS "Users can update own generic ratings" ON generic_ratings;
DROP POLICY IF EXISTS "Users can delete own generic ratings" ON generic_ratings;

-- Recreate with optimized (select auth.uid()) pattern
CREATE POLICY "Users can insert own generic ratings"
  ON generic_ratings
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own generic ratings"
  ON generic_ratings
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own generic ratings"
  ON generic_ratings
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- watch_history table (3 policies)
-- Note: SELECT policy already uses (select auth.uid())
-- ============================================

-- Drop existing policies that need fixing
DROP POLICY IF EXISTS "Users can insert own watch history" ON watch_history;
DROP POLICY IF EXISTS "Users can update own watch history" ON watch_history;
DROP POLICY IF EXISTS "Users can delete own watch history" ON watch_history;

-- Recreate with optimized (select auth.uid()) pattern
CREATE POLICY "Users can insert own watch history"
  ON watch_history
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own watch history"
  ON watch_history
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own watch history"
  ON watch_history
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Add comment documenting this fix
COMMENT ON TABLE future_nomination_links IS 'Links between future nominations and clubs/festivals. Tracks which clubs a movie is planned for nomination. RLS policies use (select auth.uid()) for performance.';

