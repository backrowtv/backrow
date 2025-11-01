-- Migration: Remove Invite Codes + Fix Duplicate Policies and Indexes
--
-- This migration:
-- 1. Drops the club_invite_codes table (replaced by slug-based join links)
-- 2. Drops the generate_invite_code() function
-- 3. Consolidates duplicate permissive RLS policies for performance
-- 4. Drops duplicate indexes

-- ============================================================================
-- PART 1: REMOVE INVITE CODES SYSTEM
-- ============================================================================

-- Drop the invite codes table (CASCADE will drop dependent policies)
DROP TABLE IF EXISTS club_invite_codes CASCADE;

-- Drop the code generation function
DROP FUNCTION IF EXISTS generate_invite_code();

-- ============================================================================
-- PART 2: CONSOLIDATE DUPLICATE PERMISSIVE POLICIES
-- Multiple permissive policies for same table/role/action are inefficient
-- because PostgreSQL must evaluate ALL of them (OR'd together)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- club_join_requests: Consolidate 2 SELECT policies into 1
-- "Admins can view club join requests" + "Users can view own join requests"
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can view club join requests" ON club_join_requests;
DROP POLICY IF EXISTS "Users can view own join requests" ON club_join_requests;

CREATE POLICY "Users can view join requests" ON club_join_requests
  FOR SELECT TO public
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_join_requests.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role IN ('producer', 'director')
    )
  );

-- -----------------------------------------------------------------------------
-- clubs: Consolidate 2 UPDATE policies into 1
-- "Site admins can update club featured status" + "Users can update their clubs"
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Site admins can update club featured status" ON clubs;
DROP POLICY IF EXISTS "Users can update their clubs" ON clubs;

CREATE POLICY "Users can update clubs" ON clubs
  FOR UPDATE TO public
  USING (
    is_site_admin((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = clubs.id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role IN ('producer', 'director')
    )
  );

-- -----------------------------------------------------------------------------
-- discussion_comments: Consolidate 2 SELECT policies into 1
-- "Members can view comments" + "Users can view comments in clubs they're members of"
-- These appear to be duplicates - keep the more descriptive one
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can view comments" ON discussion_comments;
DROP POLICY IF EXISTS "Users can view comments in clubs they're members of" ON discussion_comments;

CREATE POLICY "Members can view comments" ON discussion_comments
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN club_members cm ON cm.club_id = dt.club_id
      WHERE dt.id = discussion_comments.thread_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- discussion_comments: Consolidate 2 UPDATE policies into 1
-- "Authors can soft delete own comments" + "Users can update own comments"
-- Both check author_id = auth.uid(), so they're effectively duplicates
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authors can soft delete own comments" ON discussion_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON discussion_comments;

CREATE POLICY "Authors can update own comments" ON discussion_comments
  FOR UPDATE TO public
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- feedback_items: Consolidate 2 UPDATE policies into 1
-- "Site admins can update any feedback" + "Users can update own feedback"
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Site admins can update any feedback" ON feedback_items;
DROP POLICY IF EXISTS "Users can update own feedback" ON feedback_items;

CREATE POLICY "Users can update feedback" ON feedback_items
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_site_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR is_site_admin((SELECT auth.uid()))
  );

-- ============================================================================
-- PART 3: DROP DUPLICATE INDEXES
-- These are identical indexes that waste storage and slow down writes
-- ============================================================================

-- club_announcements: idx_club_announcements_club_created = idx_club_announcements_club_id
DROP INDEX IF EXISTS idx_club_announcements_club_created;

-- club_polls: idx_club_polls_club_created = idx_club_polls_club_id
DROP INDEX IF EXISTS idx_club_polls_club_created;

-- generic_ratings: idx_generic_ratings_user = idx_generic_ratings_user_id
DROP INDEX IF EXISTS idx_generic_ratings_user;

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Invite codes removed, duplicate policies consolidated, duplicate indexes dropped';
