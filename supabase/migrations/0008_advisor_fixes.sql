-- Migration: Address Supabase security advisor findings (2026-04-21 audit).
--
-- Fixes:
--   1a. Pin search_path on update_thread_comment_count (mutable search_path warning).
--   1b. Drop broad SELECT policies on 6 public buckets so anonymous clients can no
--       longer enumerate every file in the bucket. Individual public object URLs
--       keep working — Supabase serves `/storage/v1/object/public/...` without a
--       policy when the bucket itself is marked public.
--   1c. Make job_dedup's "service-role only" posture explicit with a deny-all
--       policy so the rls_enabled_no_policy advisor stops flagging it.
--   1d. Tighten WITH CHECK on filter_analytics and search_analytics INSERTs to
--       prevent a client from writing a row tagged with another user's user_id.
--
-- Intentionally NOT changed:
--   • Buckets club-backgrounds and club-pictures keep their broad SELECT policy.
--     src/app/actions/clubs/ownership.ts uses .list(clubId) on both during club
--     ownership transfer / cleanup. Dropping the policy would break that path.
--   • contact_submissions keeps its anon INSERT with WITH CHECK (true). The table
--     has no user_id column — there is nothing to impersonate — and the server
--     action validates name/email/subject/message length before insert.

BEGIN;

-- 1a. Pin search_path on trigger function.
ALTER FUNCTION public.update_thread_comment_count()
  SET search_path = public, pg_temp;

-- 1b. Drop broad SELECT listing policies on public buckets where the app never
-- calls .list(). getPublicUrl() paths are unaffected.
DROP POLICY IF EXISTS "Announcement images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read background images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for badge icons" ON storage.objects;
DROP POLICY IF EXISTS "Festival backgrounds are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Festival pictures are publicly accessible" ON storage.objects;

-- 1c. Explicit deny-all on job_dedup for non-service-role clients.
DROP POLICY IF EXISTS "service_role_only" ON public.job_dedup;
CREATE POLICY "service_role_only" ON public.job_dedup
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "service_role_only" ON public.job_dedup IS
  'job_dedup is service-role only (Vercel Queues dedup). This explicit deny documents intent and silences the rls_enabled_no_policy advisor.';

-- 1d. Prevent user_id impersonation on analytics inserts. Anonymous writes
-- (user_id IS NULL) stay allowed; authenticated writes must match auth.uid().
DROP POLICY IF EXISTS "Anyone can insert filter analytics" ON public.filter_analytics;
CREATE POLICY "Anyone can insert filter analytics" ON public.filter_analytics
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Anyone can insert search analytics" ON public.search_analytics;
CREATE POLICY "Anyone can insert search analytics" ON public.search_analytics
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

COMMIT;
