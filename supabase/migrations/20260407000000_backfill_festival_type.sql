-- Migration: Backfill festival_type from legacy festival_mode
-- Ensures every club has a festival_type value so the festival_mode column
-- becomes fully redundant and can be safely dropped.
-- Safety: Non-destructive. Only fills in NULL festival_type values.

-- Step 1: Backfill clubs.festival_type from festival_mode where festival_type is NULL
UPDATE clubs
SET festival_type = CASE
  WHEN festival_mode IN ('matinee', 'endless') THEN 'endless'
  WHEN festival_mode IN ('spotlight', 'cinephile', 'custom', 'standard') THEN 'standard'
  ELSE 'standard'
END
WHERE festival_type IS NULL
  AND festival_mode IS NOT NULL;

-- Step 2: Catch any remaining NULLs (clubs that never had either field set)
UPDATE clubs
SET festival_type = 'standard'
WHERE festival_type IS NULL;

-- Step 3: Sync settings JSONB where festival_type is missing
UPDATE clubs
SET settings = COALESCE(settings, '{}'::jsonb) ||
  jsonb_build_object('festival_type', festival_type)
WHERE settings IS NULL
   OR settings->>'festival_type' IS NULL;
