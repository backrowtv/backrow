-- Migration: Enhance club announcements with rich content support
-- Description: Adds content_html, image_url, and announcement_type columns for rich announcements

-- Add new columns to club_announcements
ALTER TABLE club_announcements
ADD COLUMN IF NOT EXISTS content_html TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS announcement_type TEXT DEFAULT 'simple';

-- Add check constraint for announcement_type
ALTER TABLE club_announcements
ADD CONSTRAINT club_announcements_type_check 
CHECK (announcement_type IN ('simple', 'rich'));

-- Create index for filtering by announcement type
CREATE INDEX IF NOT EXISTS idx_club_announcements_type 
ON club_announcements(club_id, announcement_type);

-- Add comment for documentation
COMMENT ON COLUMN club_announcements.content_html IS 'HTML content from TipTap editor for rich announcements';
COMMENT ON COLUMN club_announcements.image_url IS 'Header/featured image URL for the announcement';
COMMENT ON COLUMN club_announcements.announcement_type IS 'Type of announcement: simple (plain text) or rich (HTML with formatting)';

