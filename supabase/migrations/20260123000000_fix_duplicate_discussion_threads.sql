-- Migration: Fix duplicate discussion threads race condition
-- This migration:
-- 1. Cleans up existing duplicate auto-created movie discussion threads
-- 2. Adds a unique constraint to prevent future duplicates
-- 3. Ensures ON CONFLICT DO NOTHING actually works in triggers

-- ============================================
-- 1. CLEAN UP EXISTING DUPLICATE THREADS
-- ============================================

-- Delete duplicate auto-created movie threads, keeping the oldest one
-- This preserves the original thread with its comments/activity
DELETE FROM discussion_threads dt1
WHERE dt1.auto_created = TRUE
  AND dt1.tmdb_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM discussion_threads dt2
    WHERE dt2.club_id = dt1.club_id
      AND dt2.tmdb_id = dt1.tmdb_id
      AND dt2.auto_created = TRUE
      AND dt2.created_at < dt1.created_at
  );

-- ============================================
-- 2. ADD UNIQUE CONSTRAINT
-- ============================================

-- Create a partial unique index to prevent duplicate auto-created movie threads per club
-- This is a partial index (WHERE clause) so it only applies to auto-created movie threads
-- Manual threads can still have multiple discussions for the same movie
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_auto_movie_thread_per_club
ON discussion_threads (club_id, tmdb_id)
WHERE auto_created = TRUE AND tmdb_id IS NOT NULL;

-- ============================================
-- 3. ADD COMMENT FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_unique_auto_movie_thread_per_club IS
'Prevents race conditions from creating duplicate auto-created movie discussion threads. Only one auto-created thread per movie per club is allowed. Manual threads are not affected.';
