-- Migration: 0013_fix_storage_rls_perf
-- Date: 2026-04-27
--
-- Replaces five storage.objects DELETE policies that compare bare `auth.uid()`
-- against the foldername prefix. Per CLAUDE.md and the Supabase performance
-- advisor, RLS predicates must wrap `auth.uid()` in a subselect so PostgREST
-- evaluates it once per query instead of once per row.
--
-- Affected policies (all on storage.objects, FOR DELETE):
--   - "Users can delete their announcement images"  (announcement-images bucket)
--   - "Users can delete their club backgrounds"     (club-backgrounds bucket)
--   - "Users can delete their club pictures"        (club-pictures bucket)
--   - "Users can delete their festival backgrounds" (festival-backgrounds bucket)
--   - "Users can delete their festival pictures"    (festival-pictures bucket)
--
-- The avatar bucket policies (avatars_owner_delete, avatars_owner_update) and
-- the badge-icons admin policies already use the correct subselect form.
--
-- Semantics are unchanged — same predicate, same buckets, same foldername
-- prefix check. Only the evaluation strategy changes.

DROP POLICY IF EXISTS "Users can delete their announcement images" ON storage.objects;
CREATE POLICY "Users can delete their announcement images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'announcement-images'::text
    AND ((SELECT auth.uid())::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Users can delete their club backgrounds" ON storage.objects;
CREATE POLICY "Users can delete their club backgrounds"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'club-backgrounds'::text
    AND ((SELECT auth.uid())::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Users can delete their club pictures" ON storage.objects;
CREATE POLICY "Users can delete their club pictures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'club-pictures'::text
    AND ((SELECT auth.uid())::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Users can delete their festival backgrounds" ON storage.objects;
CREATE POLICY "Users can delete their festival backgrounds"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'festival-backgrounds'::text
    AND ((SELECT auth.uid())::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Users can delete their festival pictures" ON storage.objects;
CREATE POLICY "Users can delete their festival pictures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'festival-pictures'::text
    AND ((SELECT auth.uid())::text = (storage.foldername(name))[1])
  );
