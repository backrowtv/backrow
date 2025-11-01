-- ============================================
-- Architecture Improvements Migration
-- Based on ARCHITECTURE.md design review
-- ============================================

-- ============================================
-- 1. MISSING DATABASE INDEXES
-- ============================================

-- Activity log: created_at DESC for feed queries
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at
ON activity_log(created_at DESC);

-- Activity log: composite for club-specific activity feeds
CREATE INDEX IF NOT EXISTS idx_activity_log_club_created
ON activity_log(club_id, created_at DESC)
WHERE club_id IS NOT NULL;

-- Activity log: composite for user-specific activity feeds
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created
ON activity_log(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Discussion threads: composite for club listing with sorting
CREATE INDEX IF NOT EXISTS idx_discussion_threads_club_created
ON discussion_threads(club_id, created_at DESC);

-- Nominations: festival lookup excluding deleted
CREATE INDEX IF NOT EXISTS idx_nominations_festival_active
ON nominations(festival_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Ratings: user lookup for profile pages
CREATE INDEX IF NOT EXISTS idx_ratings_user
ON ratings(user_id);

-- Watch history: user + tmdb for quick lookups
CREATE INDEX IF NOT EXISTS idx_watch_history_user_tmdb
ON watch_history(user_id, tmdb_id);

-- Generic ratings: user lookup
CREATE INDEX IF NOT EXISTS idx_generic_ratings_user
ON generic_ratings(user_id);

-- Club announcements: composite index (NOW() not allowed in partial index predicates)
CREATE INDEX IF NOT EXISTS idx_club_announcements_club_created
ON club_announcements(club_id, created_at DESC);

-- Club polls: composite index (NOW() not allowed in partial index predicates)
CREATE INDEX IF NOT EXISTS idx_club_polls_club_created
ON club_polls(club_id, created_at DESC);

-- Index comments
COMMENT ON INDEX idx_activity_log_created_at IS 'Optimizes activity feed queries sorted by time';
COMMENT ON INDEX idx_activity_log_club_created IS 'Optimizes club-specific activity feed queries';
COMMENT ON INDEX idx_activity_log_user_created IS 'Optimizes user-specific activity feed queries';
COMMENT ON INDEX idx_discussion_threads_club_created IS 'Optimizes discussion listing by club';
COMMENT ON INDEX idx_nominations_festival_active IS 'Optimizes festival nomination queries excluding deleted';
COMMENT ON INDEX idx_ratings_user IS 'Optimizes user rating history queries';
COMMENT ON INDEX idx_watch_history_user_tmdb IS 'Optimizes watch status lookups';
COMMENT ON INDEX idx_generic_ratings_user IS 'Optimizes user generic rating queries';

-- ============================================
-- 2. GENERATED COLUMNS FOR CLUB SETTINGS
-- Frequently queried JSON fields extracted for performance
-- ============================================

-- Add generated columns for commonly accessed settings
-- These are STORED columns that auto-update when settings changes
ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS themes_enabled BOOLEAN
GENERATED ALWAYS AS (COALESCE((settings->>'themes_enabled')::boolean, true)) STORED;

ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS nomination_guessing_enabled BOOLEAN
GENERATED ALWAYS AS (COALESCE((settings->>'nomination_guessing_enabled')::boolean, false)) STORED;

ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS theme_governance TEXT
GENERATED ALWAYS AS (COALESCE(settings->>'theme_governance', 'democracy')) STORED;

ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS max_nominations_per_user INTEGER
GENERATED ALWAYS AS (COALESCE((settings->>'max_nominations_per_user')::integer, 1)) STORED;

-- Index the generated columns for faster filtering
CREATE INDEX IF NOT EXISTS idx_clubs_themes_enabled
ON clubs(themes_enabled);

CREATE INDEX IF NOT EXISTS idx_clubs_guessing_enabled
ON clubs(nomination_guessing_enabled);

-- Column comments
COMMENT ON COLUMN clubs.themes_enabled IS 'Generated: extracted from settings.themes_enabled for query performance';
COMMENT ON COLUMN clubs.nomination_guessing_enabled IS 'Generated: extracted from settings.nomination_guessing_enabled for query performance';
COMMENT ON COLUMN clubs.theme_governance IS 'Generated: extracted from settings.theme_governance for query performance';
COMMENT ON COLUMN clubs.max_nominations_per_user IS 'Generated: extracted from settings.max_nominations_per_user for query performance';

-- ============================================
-- 3. SOFT DELETE STANDARDIZATION
-- Add deleted_at to tables that use hard delete for audit trail
-- ============================================

-- Add deleted_at to ratings (currently uses hard delete)
ALTER TABLE ratings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to discussion_comments (currently uses hard delete via CASCADE)
ALTER TABLE discussion_comments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_ratings_active
ON ratings(festival_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discussion_comments_active
ON discussion_comments(thread_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Column comments
COMMENT ON COLUMN ratings.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN discussion_comments.deleted_at IS 'Soft delete timestamp - NULL means active';

-- ============================================
-- 4. UPDATE RLS POLICIES FOR SOFT DELETE
-- Ensure deleted records are not returned
-- ============================================

-- Drop and recreate ratings SELECT policy to exclude deleted
DROP POLICY IF EXISTS "Users can read ratings" ON ratings;
CREATE POLICY "Users can read ratings" ON ratings
FOR SELECT USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM festivals f
    JOIN club_members cm ON cm.club_id = f.club_id
    WHERE f.id = ratings.festival_id
    AND cm.user_id = (SELECT auth.uid())
  )
);

-- Drop and recreate discussion_comments SELECT policy to exclude deleted
DROP POLICY IF EXISTS "Members can view comments" ON discussion_comments;
CREATE POLICY "Members can view comments" ON discussion_comments
FOR SELECT USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_comments.thread_id
    AND cm.user_id = (SELECT auth.uid())
  )
);

-- Add soft delete policy for ratings (user can soft delete own ratings)
DROP POLICY IF EXISTS "Users can delete own ratings" ON ratings;
CREATE POLICY "Users can soft delete own ratings" ON ratings
FOR UPDATE USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- Add soft delete policy for comments (author can soft delete own comments)
DROP POLICY IF EXISTS "Authors can delete own comments" ON discussion_comments;
CREATE POLICY "Authors can soft delete own comments" ON discussion_comments
FOR UPDATE USING (
  author_id = (SELECT auth.uid())
)
WITH CHECK (
  author_id = (SELECT auth.uid())
);

