-- Migration: Add indexes for stats queries and badge tracking
-- Created: 2025-01-25
-- Purpose: Improve performance of stats chart queries and badge progress tracking

-- Index for festival participation chart (grouped by month)
-- Used by: getFestivalParticipationData
CREATE INDEX IF NOT EXISTS idx_festivals_club_created 
ON festivals(club_id, created_at) 
WHERE deleted_at IS NULL;

-- Index for rating trends chart (grouped by month)
-- Used by: getRatingTrendsData
CREATE INDEX IF NOT EXISTS idx_ratings_festival_created 
ON ratings(festival_id, created_at);

-- Index for badge tracking (movie watch milestones)
-- Used by: Badge system to track movie watching progress
CREATE INDEX IF NOT EXISTS idx_watch_history_user_created 
ON watch_history(user_id, first_watched_at);

-- Comment explaining the indexes
COMMENT ON INDEX idx_festivals_club_created IS 'Optimizes festival participation chart queries by club and creation date';
COMMENT ON INDEX idx_ratings_festival_created IS 'Optimizes rating trends chart queries by festival and creation date';
COMMENT ON INDEX idx_watch_history_user_created IS 'Optimizes badge progress tracking for movie watching milestones';

