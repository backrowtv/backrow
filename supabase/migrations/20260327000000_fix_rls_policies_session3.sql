-- =============================================================================
-- Fix RLS policies (Session 3 — 2026-03-27)
--
-- 1. festivals SELECT: allow reading festivals in public clubs (was members-only)
-- 2. nominations SELECT: allow reading nominations in public clubs (was members-only)
-- 3. theme_votes INSERT: add membership check (was allowing any authenticated user)
-- =============================================================================

-- 1. Fix festivals SELECT — allow public club access
DROP POLICY IF EXISTS "Users can read festivals" ON festivals;
CREATE POLICY "Users can read festivals" ON festivals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = festivals.club_id
      AND (
        c.privacy LIKE 'public_%'
        OR c.producer_id = (SELECT auth.uid())
        OR is_club_member(c.id, (SELECT auth.uid()))
      )
    )
  );

-- 2. Fix nominations SELECT — allow public club access
DROP POLICY IF EXISTS "Users can read nominations" ON nominations;
CREATE POLICY "Users can read nominations" ON nominations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM festivals f
      JOIN clubs c ON c.id = f.club_id
      WHERE f.id = nominations.festival_id
      AND (
        c.privacy LIKE 'public_%'
        OR c.producer_id = (SELECT auth.uid())
        OR is_club_member(c.id, (SELECT auth.uid()))
      )
    )
  );

-- 3. Fix theme_votes INSERT — add membership check
DROP POLICY IF EXISTS "Users can insert own theme votes" ON theme_votes;
CREATE POLICY "Users can insert own theme votes" ON theme_votes
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM festivals f
      JOIN club_members cm ON cm.club_id = f.club_id
      WHERE f.id = festival_id
      AND cm.user_id = (SELECT auth.uid())
    )
  );
