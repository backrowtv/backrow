-- Migration: Add is_all_clubs_default column to user_rubrics table
-- This allows users to set a rubric that will auto-apply when joining any club

-- Add is_all_clubs_default column
ALTER TABLE user_rubrics ADD COLUMN IF NOT EXISTS is_all_clubs_default BOOLEAN DEFAULT false;

-- Only one rubric can be the all-clubs default per user
-- Use a partial unique index to enforce this constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_rubrics_all_clubs_default 
  ON user_rubrics (user_id) WHERE is_all_clubs_default = true;

-- Add comment for documentation
COMMENT ON COLUMN user_rubrics.is_all_clubs_default IS 'When true, this rubric will automatically be set as the default when the user joins any new club';

