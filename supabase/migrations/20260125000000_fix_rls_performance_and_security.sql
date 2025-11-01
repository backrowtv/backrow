-- Migration: Fix RLS Performance and Security Issues
-- Date: 2025-12-15
-- Description: Addresses Supabase advisor findings:
--   1. Fix 43 RLS policies using auth.uid() to use (SELECT auth.uid()) for performance
--   2. Add 4 missing foreign key indexes
--   3. Fix 5 functions with mutable search_path
--
-- Note: Unused indexes (100+) are intentionally left for a future cleanup migration

-- ============================================================================
-- PART 1: FIX RLS POLICIES - Change auth.uid() to (SELECT auth.uid())
-- This prevents re-evaluation of auth.uid() per row, improving performance
-- ============================================================================

-- club_invite_codes (4 policies)
DROP POLICY IF EXISTS "Admins can create invite codes" ON public.club_invite_codes;
CREATE POLICY "Admins can create invite codes" ON public.club_invite_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_invite_codes.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Admins can delete invite codes" ON public.club_invite_codes;
CREATE POLICY "Admins can delete invite codes" ON public.club_invite_codes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_invite_codes.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Admins can update invite codes" ON public.club_invite_codes;
CREATE POLICY "Admins can update invite codes" ON public.club_invite_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_invite_codes.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Members can view all club invite codes" ON public.club_invite_codes;
CREATE POLICY "Members can view all club invite codes" ON public.club_invite_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_invite_codes.club_id
        AND club_members.user_id = (SELECT auth.uid())
    )
  );

-- club_join_requests (4 policies)
DROP POLICY IF EXISTS "Admins can update join requests" ON public.club_join_requests;
CREATE POLICY "Admins can update join requests" ON public.club_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_join_requests.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Admins can view club join requests" ON public.club_join_requests;
CREATE POLICY "Admins can view club join requests" ON public.club_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_join_requests.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Users can create join requests" ON public.club_join_requests;
CREATE POLICY "Users can create join requests" ON public.club_join_requests
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_join_requests.club_id
        AND club_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own join requests" ON public.club_join_requests;
CREATE POLICY "Users can view own join requests" ON public.club_join_requests
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- club_resources (4 policies)
DROP POLICY IF EXISTS "Admins can create club resources" ON public.club_resources;
CREATE POLICY "Admins can create club resources" ON public.club_resources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_resources.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Admins can delete club resources" ON public.club_resources;
CREATE POLICY "Admins can delete club resources" ON public.club_resources
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_resources.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Admins can update club resources" ON public.club_resources;
CREATE POLICY "Admins can update club resources" ON public.club_resources
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_resources.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role = ANY (ARRAY['producer'::text, 'director'::text])
    )
  );

DROP POLICY IF EXISTS "Members can view club resources" ON public.club_resources;
CREATE POLICY "Members can view club resources" ON public.club_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_resources.club_id
        AND club_members.user_id = (SELECT auth.uid())
    )
  );

-- discussion_thread_tags (3 policies)
DROP POLICY IF EXISTS "Thread author or admin can remove tags" ON public.discussion_thread_tags;
CREATE POLICY "Thread author or admin can remove tags" ON public.discussion_thread_tags
  FOR DELETE USING (
    EXISTS (
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
    )
  );

DROP POLICY IF EXISTS "Users can add tags to threads in their clubs" ON public.discussion_thread_tags;
CREATE POLICY "Users can add tags to threads in their clubs" ON public.discussion_thread_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN club_members cm ON cm.club_id = dt.club_id
      WHERE dt.id = discussion_thread_tags.thread_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view tags for threads in their clubs" ON public.discussion_thread_tags;
CREATE POLICY "Users can view tags for threads in their clubs" ON public.discussion_thread_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN club_members cm ON cm.club_id = dt.club_id
      WHERE dt.id = discussion_thread_tags.thread_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- festival_rubric_locks (3 policies)
DROP POLICY IF EXISTS "Users can insert own rubric locks" ON public.festival_rubric_locks;
CREATE POLICY "Users can insert own rubric locks" ON public.festival_rubric_locks
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own rubric locks" ON public.festival_rubric_locks;
CREATE POLICY "Users can update own rubric locks" ON public.festival_rubric_locks
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own rubric locks" ON public.festival_rubric_locks;
CREATE POLICY "Users can view own rubric locks" ON public.festival_rubric_locks
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- movie_pool_votes (3 policies)
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.movie_pool_votes;
CREATE POLICY "Users can delete their own votes" ON public.movie_pool_votes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view movie pool votes in their clubs" ON public.movie_pool_votes;
CREATE POLICY "Users can view movie pool votes in their clubs" ON public.movie_pool_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nominations n
      JOIN festivals f ON n.festival_id = f.id
      JOIN club_members cm ON f.club_id = cm.club_id
      WHERE n.id = movie_pool_votes.nomination_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can vote for movies in their clubs" ON public.movie_pool_votes;
CREATE POLICY "Users can vote for movies in their clubs" ON public.movie_pool_votes
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM nominations n
      JOIN festivals f ON n.festival_id = f.id
      JOIN club_members cm ON f.club_id = cm.club_id
      WHERE n.id = movie_pool_votes.nomination_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- private_notes (3 policies - note: SELECT policy already uses (SELECT auth.uid()))
DROP POLICY IF EXISTS "Users can delete own private notes" ON public.private_notes;
CREATE POLICY "Users can delete own private notes" ON public.private_notes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own private notes" ON public.private_notes;
CREATE POLICY "Users can insert own private notes" ON public.private_notes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own private notes" ON public.private_notes;
CREATE POLICY "Users can update own private notes" ON public.private_notes
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- site_admins (3 policies) - uses helper functions, but still needs fix for auth.uid() calls
DROP POLICY IF EXISTS "Only site admins can view site_admins" ON public.site_admins;
CREATE POLICY "Only site admins can view site_admins" ON public.site_admins
  FOR SELECT USING (is_site_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Only super admins can delete site_admins" ON public.site_admins;
CREATE POLICY "Only super admins can delete site_admins" ON public.site_admins
  FOR DELETE USING (is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Only super admins can insert site_admins" ON public.site_admins;
CREATE POLICY "Only super admins can insert site_admins" ON public.site_admins
  FOR INSERT WITH CHECK (is_super_admin((SELECT auth.uid())));

-- user_blocks (3 policies)
DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own" ON public.user_blocks
  FOR DELETE USING (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own" ON public.user_blocks
  FOR INSERT WITH CHECK (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_blocks_select_own" ON public.user_blocks;
CREATE POLICY "user_blocks_select_own" ON public.user_blocks
  FOR SELECT USING (blocker_id = (SELECT auth.uid()));

-- user_reports (2 policies)
DROP POLICY IF EXISTS "user_reports_insert_own" ON public.user_reports;
CREATE POLICY "user_reports_insert_own" ON public.user_reports
  FOR INSERT WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_reports_select_own" ON public.user_reports;
CREATE POLICY "user_reports_select_own" ON public.user_reports
  FOR SELECT USING (reporter_id = (SELECT auth.uid()));

-- user_rubrics (4 policies)
DROP POLICY IF EXISTS "Users can delete own rubrics" ON public.user_rubrics;
CREATE POLICY "Users can delete own rubrics" ON public.user_rubrics
  FOR DELETE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rubrics" ON public.user_rubrics;
CREATE POLICY "Users can insert own rubrics" ON public.user_rubrics
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own rubrics" ON public.user_rubrics;
CREATE POLICY "Users can update own rubrics" ON public.user_rubrics
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own rubrics" ON public.user_rubrics;
CREATE POLICY "Users can view own rubrics" ON public.user_rubrics
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 2: ADD MISSING FOREIGN KEY INDEXES
-- These improve JOIN performance when querying by these foreign keys
-- ============================================================================

-- club_invite_codes.created_by
CREATE INDEX IF NOT EXISTS idx_club_invite_codes_created_by
  ON public.club_invite_codes(created_by);

-- club_join_requests.reviewed_by
CREATE INDEX IF NOT EXISTS idx_club_join_requests_reviewed_by
  ON public.club_join_requests(reviewed_by);

-- club_resources.created_by
CREATE INDEX IF NOT EXISTS idx_club_resources_created_by
  ON public.club_resources(created_by);

-- user_reports.reviewed_by
CREATE INDEX IF NOT EXISTS idx_user_reports_reviewed_by
  ON public.user_reports(reviewed_by);

-- ============================================================================
-- PART 3: FIX FUNCTIONS WITH MUTABLE SEARCH_PATH
-- Adding SET search_path = public to prevent search_path injection attacks
-- ============================================================================

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix ensure_single_default_rubric
CREATE OR REPLACE FUNCTION public.ensure_single_default_rubric()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE user_rubrics
    SET is_default = false, updated_at = now()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix snapshot_rubric_on_lock
CREATE OR REPLACE FUNCTION public.snapshot_rubric_on_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  rubric_data JSONB;
BEGIN
  IF NEW.rubric_id IS NOT NULL AND NEW.rubric_snapshot IS NULL THEN
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'categories', categories
    ) INTO rubric_data
    FROM user_rubrics
    WHERE id = NEW.rubric_id;

    NEW.rubric_snapshot = rubric_data;
  END IF;

  IF NEW.use_club_rubric = true AND NEW.rubric_snapshot IS NULL THEN
    SELECT jsonb_build_object(
      'name', 'Club Rubric',
      'categories', COALESCE((c.settings->>'rating_rubrics')::jsonb, '[]'::jsonb)
    ) INTO rubric_data
    FROM festivals f
    JOIN clubs c ON c.id = f.club_id
    WHERE f.id = NEW.festival_id;

    NEW.rubric_snapshot = rubric_data;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix generate_invite_code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I/1/O/0 for clarity
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
  i INTEGER;
BEGIN
  LOOP
    -- Generate code: BACKROW-XXXXXX format (6 random chars)
    v_code := 'BACKROW-';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;

    -- Check if code exists
    SELECT EXISTS(
      SELECT 1 FROM public.club_invite_codes WHERE code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;

    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique invite code after 10 attempts';
    END IF;
  END LOOP;

  RETURN v_code;
END;
$function$;

-- Fix update_join_request_updated_at
CREATE OR REPLACE FUNCTION public.update_join_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_club_invite_codes_created_by IS 'Index for FK club_invite_codes_created_by_fkey - improves JOIN performance';
COMMENT ON INDEX idx_club_join_requests_reviewed_by IS 'Index for FK club_join_requests_reviewed_by_fkey - improves JOIN performance';
COMMENT ON INDEX idx_club_resources_created_by IS 'Index for FK club_resources_created_by_fkey - improves JOIN performance';
COMMENT ON INDEX idx_user_reports_reviewed_by IS 'Index for FK user_reports_reviewed_by_fkey - improves JOIN performance';
