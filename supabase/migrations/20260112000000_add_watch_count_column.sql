-- Add watch_count column to watch_history table
-- Allows users to track how many times they've watched a movie

ALTER TABLE watch_history
ADD COLUMN IF NOT EXISTS watch_count INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure watch_count is at least 1
ALTER TABLE watch_history
ADD CONSTRAINT watch_count_positive CHECK (watch_count >= 1);

-- Add comment for clarity
COMMENT ON COLUMN watch_history.watch_count IS 'Number of times the user has watched this movie (minimum 1)';

