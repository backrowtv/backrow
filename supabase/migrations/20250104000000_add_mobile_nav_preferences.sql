-- Migration: Add mobile navigation preferences to users table
-- This allows users to customize which items appear in their mobile bottom nav

-- Add mobile_nav_preferences column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mobile_nav_preferences JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.users.mobile_nav_preferences IS 'User customization for mobile bottom navigation bar. Structure: { "items": ["clubs", "search", "home", "discover", "activity"], "itemCount": 5, "favoriteClubId": "uuid-or-null" }. Items can include: home, clubs, search, discover, profile, activity, favorite_club, deadlines.';

-- Create index for faster queries on users with preferences set
CREATE INDEX IF NOT EXISTS idx_users_mobile_nav_preferences 
ON public.users (id) 
WHERE mobile_nav_preferences IS NOT NULL;

