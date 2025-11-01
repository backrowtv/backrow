-- Migration: Add season pause support
-- Allows pausing a season to run endless festivals without concluding the season.

-- Add is_paused column to seasons table
ALTER TABLE seasons ADD COLUMN is_paused BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN seasons.is_paused IS 'When true, the season is paused (e.g., during an endless festival). Paused seasons are skipped by cron rollover.';

-- Update the check_festival_type_change trigger function
-- Now allows festival type changes when the season is paused.
-- Updated error message to remove "wrap the season" language.
CREATE OR REPLACE FUNCTION public.check_festival_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_season_id UUID;
  current_season_paused BOOLEAN;
  active_festival_count INT;
  old_festival_type TEXT;
  new_festival_type TEXT;
BEGIN
  -- Extract festival_type from old and new settings
  old_festival_type := COALESCE(OLD.settings->>'festival_type', 'standard');
  new_festival_type := COALESCE(NEW.settings->>'festival_type', 'standard');

  -- Only check if festival_type is actually changing
  IF old_festival_type = new_festival_type THEN
    RETURN NEW;
  END IF;

  -- Find current season for this club (active season = started but not ended)
  SELECT id, is_paused INTO current_season_id, current_season_paused
  FROM seasons
  WHERE club_id = NEW.id
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
  ORDER BY start_date DESC
  LIMIT 1;

  -- If no current season, allow the change
  IF current_season_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- If the season is paused, allow the change
  IF current_season_paused = TRUE THEN
    RETURN NEW;
  END IF;

  -- Count active festivals (not draft, completed, or cancelled)
  SELECT COUNT(*) INTO active_festival_count
  FROM festivals
  WHERE season_id = current_season_id
    AND status NOT IN ('draft', 'completed', 'cancelled');

  -- Block if there are active festivals
  IF active_festival_count > 0 THEN
    RAISE EXCEPTION 'Cannot change festival type while a festival is actively running. Complete or cancel the current festival first.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_festival_type_change() IS
  'Prevents changing festival_type in club settings while a season has active festivals. Paused seasons allow the change.';
