-- Add sidebar_nav_preferences column to users table
-- This allows users to customize the order of items in their desktop sidebar

ALTER TABLE users
ADD COLUMN IF NOT EXISTS sidebar_nav_preferences JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN users.sidebar_nav_preferences IS 'JSON object containing user preferences for desktop sidebar item ordering. Structure: { itemOrder: string[] }';

