-- ============================================
-- SET BACKROW CLUB TO ENDLESS FESTIVAL MODE
-- ============================================
-- Purpose: Configure the BackRow club to use endless festival mode
-- This provides the new continuous "Now Showing" experience without phases
-- Date: 2025-01-30
-- ============================================

-- Update BackRow club settings to use endless festival type
UPDATE clubs 
SET 
  settings = COALESCE(settings, '{}'::jsonb) || '{"festival_type": "endless"}'::jsonb,
  festival_mode = 'matinee',
  updated_at = NOW()
WHERE slug = 'backrow';

-- Also ensure the settings include auto_create_festival_threads = true
-- so discussion threads are created for each movie
UPDATE clubs
SET settings = settings || '{"auto_create_festival_threads": true}'::jsonb
WHERE slug = 'backrow';

-- Add comment for documentation
COMMENT ON TABLE clubs IS 'User clubs - BackRow site club (slug="backrow") uses endless festival mode for continuous "Now Showing" experience';

