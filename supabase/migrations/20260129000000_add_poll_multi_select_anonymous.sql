-- Migration: Add multi-select and anonymous voting options to club polls
-- This adds is_anonymous and allow_multiple columns to club_polls
-- and changes the unique constraint on club_poll_votes to support multi-select

BEGIN;

-- ============================================
-- 1. ADD NEW COLUMNS TO CLUB_POLLS
-- ============================================

ALTER TABLE club_polls
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN NOT NULL DEFAULT FALSE;

-- Comments for documentation
COMMENT ON COLUMN club_polls.is_anonymous IS 'When true, voter identities are hidden but vote counts are visible';
COMMENT ON COLUMN club_polls.allow_multiple IS 'When true, users can vote for multiple options';

-- ============================================
-- 2. MODIFY CLUB_POLL_VOTES UNIQUE CONSTRAINT
-- ============================================

-- Drop the existing unique constraint (one vote per user per poll)
-- This constraint enforces single-select behavior
ALTER TABLE club_poll_votes
DROP CONSTRAINT IF EXISTS club_poll_votes_poll_id_user_id_key;

-- Add new unique constraint (one vote per user per option)
-- This allows multiple votes per user (one for each option) for multi-select polls
-- while still preventing duplicate votes for the same option
ALTER TABLE club_poll_votes
ADD CONSTRAINT club_poll_votes_poll_user_option_unique
UNIQUE (poll_id, user_id, option_index);

-- ============================================
-- 3. ADD INDEX FOR PERFORMANCE
-- ============================================

-- Index to help with anonymous poll voter lookups
CREATE INDEX IF NOT EXISTS idx_club_polls_is_anonymous
ON club_polls (is_anonymous)
WHERE is_anonymous = TRUE;

COMMIT;
