-- ============================================================================
-- Add DELETE policy for activity_log
-- Date: 2026-03-28
--
-- Problem: Users cannot delete their own activity records because no DELETE
-- RLS policy exists. This causes unmarkMovieWatched() to silently fail
-- when trying to remove "user_watched_movie" activity entries.
-- ============================================================================

CREATE POLICY "Users can delete own activity log" ON public.activity_log
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));
