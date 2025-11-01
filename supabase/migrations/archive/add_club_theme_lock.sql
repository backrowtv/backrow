-- Add theme_submissions_locked column to clubs table
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS theme_submissions_locked BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN clubs.theme_submissions_locked IS 'When true, members cannot submit new themes to the theme pool';