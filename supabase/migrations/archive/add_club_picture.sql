-- Add picture_url column to clubs table
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Add comment
COMMENT ON COLUMN clubs.picture_url IS 'URL to club picture in Supabase Storage';