-- Migration: Rename 'deadlines' to 'upcoming' in mobile_nav_preferences
-- This migration updates existing user preferences that have 'deadlines' in their nav items

-- Update all users who have 'deadlines' in their mobile_nav_preferences items array
UPDATE public.users
SET mobile_nav_preferences = jsonb_set(
  mobile_nav_preferences,
  '{items}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN item::text = '"deadlines"' THEN '"upcoming"'::jsonb
        ELSE item
      END
    )
    FROM jsonb_array_elements(mobile_nav_preferences->'items') AS item
  )
)
WHERE mobile_nav_preferences IS NOT NULL
  AND mobile_nav_preferences->'items' @> '["deadlines"]';

-- Update the comment to reflect the new valid item name
COMMENT ON COLUMN public.users.mobile_nav_preferences IS 'User customization for mobile bottom navigation bar. Structure: { "items": ["clubs", "search", "home", "discover", "activity"], "itemCount": 5, "favoriteClubId": "uuid-or-null" }. Items can include: home, clubs, search, discover, profile, activity, favorite_club, upcoming.';

