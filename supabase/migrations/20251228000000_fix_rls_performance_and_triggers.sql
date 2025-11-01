-- Migration: Fix RLS Performance Issues and Add Missing Triggers
-- This migration:
-- 1. Fixes 34 RLS policies that use auth.uid() directly (should use (SELECT auth.uid()) for performance)
-- 2. Adds missing updated_at triggers for tables that have the column but lack the trigger

-- ============================================================================
-- PART 1: FIX RLS POLICIES FOR PERFORMANCE
-- Replace auth.uid() with (SELECT auth.uid()) to prevent per-row re-evaluation
-- ============================================================================

-- -----------------------------------------------------------------------------
-- club_invite_codes (4 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can create invite codes" ON club_invite_codes;
CREATE POLICY "Admins can create invite codes" ON club_invite_codes
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_invite_codes.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Admins can delete invite codes" ON club_invite_codes;
CREATE POLICY "Admins can delete invite codes" ON club_invite_codes
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_invite_codes.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Admins can update invite codes" ON club_invite_codes;
CREATE POLICY "Admins can update invite codes" ON club_invite_codes
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_invite_codes.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Members can view all club invite codes" ON club_invite_codes;
CREATE POLICY "Members can view all club invite codes" ON club_invite_codes
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_invite_codes.club_id
      AND club_members.user_id = (SELECT auth.uid())
  ));

-- -----------------------------------------------------------------------------
-- club_join_requests (4 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can update join requests" ON club_join_requests;
CREATE POLICY "Admins can update join requests" ON club_join_requests
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_join_requests.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Admins can view club join requests" ON club_join_requests;
CREATE POLICY "Admins can view club join requests" ON club_join_requests
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_join_requests.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Users can create join requests" ON club_join_requests;
CREATE POLICY "Users can create join requests" ON club_join_requests
  FOR INSERT TO public
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_join_requests.club_id
        AND club_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own join requests" ON club_join_requests;
CREATE POLICY "Users can view own join requests" ON club_join_requests
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- club_resources (4 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can create club resources" ON club_resources;
CREATE POLICY "Admins can create club resources" ON club_resources
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_resources.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Admins can delete club resources" ON club_resources;
CREATE POLICY "Admins can delete club resources" ON club_resources
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_resources.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Admins can update club resources" ON club_resources;
CREATE POLICY "Admins can update club resources" ON club_resources
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_resources.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
  ));

DROP POLICY IF EXISTS "Members can view club resources" ON club_resources;
CREATE POLICY "Members can view club resources" ON club_resources
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = club_resources.club_id
      AND club_members.user_id = (SELECT auth.uid())
  ));

-- -----------------------------------------------------------------------------
-- discussion_thread_tags (3 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Thread author or admin can remove tags" ON discussion_thread_tags;
CREATE POLICY "Thread author or admin can remove tags" ON discussion_thread_tags
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM discussion_threads dt
    WHERE dt.id = discussion_thread_tags.thread_id
      AND (
        dt.author_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = dt.club_id
            AND cm.user_id = (SELECT auth.uid())
            AND cm.role = 'admin'::text
        )
      )
  ));

DROP POLICY IF EXISTS "Users can add tags to threads in their clubs" ON discussion_thread_tags;
CREATE POLICY "Users can add tags to threads in their clubs" ON discussion_thread_tags
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_thread_tags.thread_id
      AND cm.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view tags for threads in their clubs" ON discussion_thread_tags;
CREATE POLICY "Users can view tags for threads in their clubs" ON discussion_thread_tags
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_thread_tags.thread_id
      AND cm.user_id = (SELECT auth.uid())
  ));

-- -----------------------------------------------------------------------------
-- festival_rubric_locks (3 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert own rubric locks" ON festival_rubric_locks;
CREATE POLICY "Users can insert own rubric locks" ON festival_rubric_locks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own rubric locks" ON festival_rubric_locks;
CREATE POLICY "Users can update own rubric locks" ON festival_rubric_locks
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own rubric locks" ON festival_rubric_locks;
CREATE POLICY "Users can view own rubric locks" ON festival_rubric_locks
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- user_rubrics (4 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete own rubrics" ON user_rubrics;
CREATE POLICY "Users can delete own rubrics" ON user_rubrics
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rubrics" ON user_rubrics;
CREATE POLICY "Users can insert own rubrics" ON user_rubrics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own rubrics" ON user_rubrics;
CREATE POLICY "Users can update own rubrics" ON user_rubrics
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own rubrics" ON user_rubrics;
CREATE POLICY "Users can view own rubrics" ON user_rubrics
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- user_blocks (3 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "user_blocks_delete_own" ON user_blocks;
CREATE POLICY "user_blocks_delete_own" ON user_blocks
  FOR DELETE TO public
  USING (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_blocks_insert_own" ON user_blocks;
CREATE POLICY "user_blocks_insert_own" ON user_blocks
  FOR INSERT TO public
  WITH CHECK (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_blocks_select_own" ON user_blocks;
CREATE POLICY "user_blocks_select_own" ON user_blocks
  FOR SELECT TO public
  USING (blocker_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- user_reports (2 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "user_reports_insert_own" ON user_reports;
CREATE POLICY "user_reports_insert_own" ON user_reports
  FOR INSERT TO public
  WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_reports_select_own" ON user_reports;
CREATE POLICY "user_reports_select_own" ON user_reports
  FOR SELECT TO public
  USING (reporter_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- private_notes (3 policies need fixing - INSERT, DELETE, UPDATE)
-- Note: SELECT already uses (SELECT auth.uid())
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete own private notes" ON private_notes;
CREATE POLICY "Users can delete own private notes" ON private_notes
  FOR DELETE TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own private notes" ON private_notes;
CREATE POLICY "Users can insert own private notes" ON private_notes
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own private notes" ON private_notes;
CREATE POLICY "Users can update own private notes" ON private_notes
  FOR UPDATE TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- movie_pool_votes (1 policy needs fixing - DELETE)
-- Note: SELECT and INSERT already use (SELECT auth.uid())
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete their own votes" ON movie_pool_votes;
CREATE POLICY "Users can delete their own votes" ON movie_pool_votes
  FOR DELETE TO public
  USING ((SELECT auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- site_admins (3 policies need fixing)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Only site admins can view site_admins" ON site_admins;
CREATE POLICY "Only site admins can view site_admins" ON site_admins
  FOR SELECT TO public
  USING (is_site_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Only super admins can delete site_admins" ON site_admins;
CREATE POLICY "Only super admins can delete site_admins" ON site_admins
  FOR DELETE TO public
  USING (is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Only super admins can insert site_admins" ON site_admins;
CREATE POLICY "Only super admins can insert site_admins" ON site_admins
  FOR INSERT TO public
  WITH CHECK (is_super_admin((SELECT auth.uid())));


-- ============================================================================
-- PART 2: ADD MISSING updated_at TRIGGERS
-- For tables that have updated_at column but missing the trigger
-- ============================================================================

-- club_join_requests - has updated_at column, has trigger (update_join_requests_updated_at)
-- Already has trigger, skip

-- club_resources - has updated_at column, missing trigger
CREATE OR REPLACE TRIGGER set_club_resources_updated_at
  BEFORE UPDATE ON club_resources
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- curated_collections - has updated_at column, missing trigger
CREATE OR REPLACE TRIGGER set_curated_collections_updated_at
  BEFORE UPDATE ON curated_collections
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- feedback_items - has updated_at column, has trigger (set_feedback_items_updated_at)
-- Already has trigger, skip


-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON SCHEMA public IS 'RLS policies optimized for performance - using (SELECT auth.uid()) pattern';
