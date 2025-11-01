-- Migration: Add rating_preferences JSONB column to users table
-- This allows users to customize their personal rating scale for single-line ratings

-- Add rating_preferences column with sensible defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_preferences JSONB DEFAULT '{
  "rating_min": 0,
  "rating_max": 10,
  "rating_increment": 0.5,
  "rating_unit": "numbers",
  "rating_visual_icon": "stars",
  "allow_half_icons": false
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.rating_preferences IS 'User preferences for personal rating scale: min/max values, increment, display type (numbers/visual), icon type, and half-icon support';

-- Create index for potential filtering (if needed in future)
CREATE INDEX IF NOT EXISTS idx_users_rating_preferences ON users USING gin (rating_preferences);

