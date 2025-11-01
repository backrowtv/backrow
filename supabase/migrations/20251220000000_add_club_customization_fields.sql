-- ============================================
-- ADD CLUB CUSTOMIZATION FIELDS
-- ============================================
-- Purpose: Add background customization and keywords/tags support to clubs
-- Date: 2025-12-20
-- ============================================

BEGIN;

-- ============================================
-- 1. ADD BACKGROUND CUSTOMIZATION FIELDS
-- ============================================

-- Add background_type column (gradient, preset_image, custom_image)
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS background_type TEXT;

-- Add background_value column (stores gradient name, preset image ID, or custom image URL)
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS background_value TEXT;

-- Add comment for background_type
COMMENT ON COLUMN clubs.background_type IS 'Type of background: gradient, preset_image, or custom_image';

-- Add comment for background_value
COMMENT ON COLUMN clubs.background_value IS 'Background value: gradient name, preset image ID, or custom image URL';

-- ============================================
-- 2. ADD KEYWORDS/TAGS FIELD
-- ============================================

-- Add keywords column as TEXT array
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add comment for keywords
COMMENT ON COLUMN clubs.keywords IS 'Array of club keywords/tags for discovery (max 25 chars each, max 2 words per tag)';

-- Create index for keyword searches (using GIN index for array searches)
CREATE INDEX IF NOT EXISTS idx_clubs_keywords ON clubs USING GIN(keywords);

-- ============================================
-- 3. ENSURE PICTURE_URL EXISTS (if not already present)
-- ============================================

-- Add picture_url column if it doesn't exist (for creation support)
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Add comment if column was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_description 
    WHERE objoid = 'clubs'::regclass::oid 
    AND objsubid = (SELECT attnum FROM pg_attribute WHERE attrelid = 'clubs'::regclass AND attname = 'picture_url')
  ) THEN
    COMMENT ON COLUMN clubs.picture_url IS 'URL to club picture in Supabase Storage';
  END IF;
END $$;

COMMIT;






















