-- ============================================
-- ADD FESTIVAL CUSTOMIZATION FIELDS
-- ============================================
-- Purpose: Add background customization and keywords/tags support to festivals
-- Date: 2025-12-20
-- ============================================

BEGIN;

-- ============================================
-- 1. ADD BACKGROUND CUSTOMIZATION FIELDS
-- ============================================

-- Add background_type column (gradient, preset_image, custom_image)
ALTER TABLE festivals 
ADD COLUMN IF NOT EXISTS background_type TEXT;

-- Add background_value column (stores gradient name, preset image ID, or custom image URL)
ALTER TABLE festivals 
ADD COLUMN IF NOT EXISTS background_value TEXT;

-- Add comment for background_type
COMMENT ON COLUMN festivals.background_type IS 'Type of background: gradient, preset_image, or custom_image';

-- Add comment for background_value
COMMENT ON COLUMN festivals.background_value IS 'Background value: gradient name, preset image ID, or custom image URL';

-- ============================================
-- 2. ADD KEYWORDS/TAGS FIELD
-- ============================================

-- Add keywords column as TEXT array
ALTER TABLE festivals 
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add comment for keywords
COMMENT ON COLUMN festivals.keywords IS 'Array of festival keywords/tags for discovery (max 25 chars each, max 2 words per tag)';

-- Create index for keyword searches (using GIN index for array searches)
CREATE INDEX IF NOT EXISTS idx_festivals_keywords ON festivals USING GIN(keywords);

-- ============================================
-- 3. ADD PICTURE_URL FIELD
-- ============================================

-- Add picture_url column if it doesn't exist
ALTER TABLE festivals 
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Add comment for picture_url
COMMENT ON COLUMN festivals.picture_url IS 'URL to festival picture in Supabase Storage';

COMMIT;






















