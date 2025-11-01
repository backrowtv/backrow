-- Migration: Rename festival_mode 'ranked' to 'spotlight'
-- Date: 2025-01-XX
-- Purpose: Update all clubs with festival_mode 'ranked' to 'spotlight' mode
--          This migration is idempotent and safe to run multiple times
--          Note: festival_mode is stored in settings JSONB field

-- Update settings JSONB: change 'ranked' to 'spotlight' in festival_mode field
UPDATE clubs
SET settings = jsonb_set(
  settings,
  '{festival_mode}',
  '"spotlight"'
)
WHERE settings->>'festival_mode' = 'ranked';

-- Also handle cases where settings might be null or festival_mode doesn't exist yet
-- This ensures clubs with default 'ranked' mode get updated
UPDATE clubs
SET settings = COALESCE(settings, '{}'::jsonb) || '{"festival_mode": "spotlight"}'::jsonb
WHERE settings IS NULL 
   OR settings->>'festival_mode' IS NULL
   OR settings->>'festival_mode' = 'ranked';

