-- Migration: Add action support to club_polls
-- This allows polls to trigger actions like creating events when they end

-- Add action_type and action_data columns to club_polls
ALTER TABLE club_polls
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS action_data JSONB;

-- Add comment for documentation
COMMENT ON COLUMN club_polls.action_type IS 'Type of action to perform when poll ends (e.g., create_event)';
COMMENT ON COLUMN club_polls.action_data IS 'JSON data for the action (e.g., event details)';

-- Create index for querying actionable polls
CREATE INDEX IF NOT EXISTS idx_club_polls_action_type ON club_polls(action_type) WHERE action_type IS NOT NULL;
