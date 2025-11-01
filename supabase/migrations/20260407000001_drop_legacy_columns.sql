-- Migration: Drop legacy festival_mode, default_festival_mode, and is_paused columns
-- Prerequisites:
--   1. Migration 20260407000000 (backfill) has been applied
--   2. Code changes removing all reads/writes to these columns have been deployed
--
-- Columns removed:
--   - clubs.festival_mode (replaced by clubs.festival_type)
--   - users.default_festival_mode (no longer used)
--   - seasons.is_paused (pause mechanism removed)

-- Safety check: Verify festival_type is fully populated before dropping festival_mode
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM clubs WHERE festival_type IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop festival_mode: % clubs still have NULL festival_type. Run backfill migration first.', null_count;
  END IF;
END $$;

-- Resume any paused seasons before dropping the column
UPDATE seasons SET is_paused = false WHERE is_paused = true;

-- Drop legacy columns
ALTER TABLE clubs DROP COLUMN IF EXISTS festival_mode;
ALTER TABLE users DROP COLUMN IF EXISTS default_festival_mode;
ALTER TABLE seasons DROP COLUMN IF EXISTS is_paused;
