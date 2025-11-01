-- Migration: ID Card Featured Badges and Settings
-- Adds ability for users to select which badges to feature on their ID card
-- and control which social links are visible on the card

-- 1. Add featured_badge_ids column to users table
-- Stores array of badge IDs (max 5) that user wants to display on their ID card
ALTER TABLE users
ADD COLUMN IF NOT EXISTS featured_badge_ids text[] DEFAULT '{}';

-- 2. Add constraint to limit to 5 badges maximum
ALTER TABLE users
ADD CONSTRAINT users_featured_badge_ids_max_5
CHECK (array_length(featured_badge_ids, 1) IS NULL OR array_length(featured_badge_ids, 1) <= 5);

-- 3. Add id_card_settings JSONB column for extensibility
-- Stores settings like: { "social_links_visibility": { "letterboxd": true, "imdb": false, ... } }
ALTER TABLE users
ADD COLUMN IF NOT EXISTS id_card_settings jsonb DEFAULT '{}'::jsonb;

-- 4. Create index for featured badges lookup (GIN for array contains queries)
CREATE INDEX IF NOT EXISTS idx_users_featured_badge_ids
ON users USING GIN (featured_badge_ids);

-- 5. Add comments for documentation
COMMENT ON COLUMN users.featured_badge_ids IS 'Array of badge IDs (max 5) to display on user ID card';
COMMENT ON COLUMN users.id_card_settings IS 'JSON settings for ID card display including social link visibility';
