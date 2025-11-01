-- Add extend_past_content column to background_images table
-- This enables backgrounds to extend beyond the max-w-7xl content constraint
-- on wide desktop screens, showing more of the landscape image

ALTER TABLE background_images 
ADD COLUMN IF NOT EXISTS extend_past_content BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN background_images.extend_past_content IS 
  'When true, background image extends beyond max-w-7xl (1280px) on wide screens. Shows more of landscape images on desktop.';

