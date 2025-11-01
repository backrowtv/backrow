-- Add subtitle column to seasons table
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS subtitle TEXT;

-- Add comment
COMMENT ON COLUMN seasons.subtitle IS 'Optional subtitle for additional context (e.g., "The Year of Action Movies")';