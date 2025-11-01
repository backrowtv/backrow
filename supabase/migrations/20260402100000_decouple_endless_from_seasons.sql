-- Migration: Decouple endless festivals from seasons
-- Endless festivals no longer require a season. season_id becomes nullable
-- so endless festivals can exist independently of the season system.

-- 1. Make season_id nullable on festivals table
ALTER TABLE festivals ALTER COLUMN season_id DROP NOT NULL;

-- 2. Null out season_id on existing endless festivals
UPDATE festivals SET season_id = NULL WHERE theme = 'Endless Festival';

-- 3. Update check_festival_type_change() trigger to remove is_paused dependency.
--    Endless clubs won't have seasons, so current_season_id IS NULL -> allow change.
--    The is_paused column is left in the DB (harmless default false) to avoid schema churn.
CREATE OR REPLACE FUNCTION public.check_festival_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_season_id UUID;
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
  SELECT id INTO current_season_id
  FROM seasons
  WHERE club_id = NEW.id
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
  ORDER BY start_date DESC
  LIMIT 1;

  -- If no current season, allow the change (endless clubs won't have seasons)
  IF current_season_id IS NULL THEN
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
  'Prevents changing festival_type in club settings while a season has active festivals. Clubs without seasons (endless mode) can always change.';
