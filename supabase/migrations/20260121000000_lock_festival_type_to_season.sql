-- Migration: Lock festival_type to season lifecycle
-- Once a festival starts in a season, the festival_type setting cannot be changed
-- until all festivals are completed/cancelled and the season is wrapped.

-- Function to check if festival_type can be changed
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

  -- If no current season, allow the change
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
    RAISE EXCEPTION 'Cannot change festival_type while season has active festivals. Complete or cancel all festivals first, then wrap the season.';
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.check_festival_type_change() IS
  'Prevents changing festival_type in club settings while a season has active festivals. This ensures festival type consistency within a season.';

-- Create trigger on clubs table
DROP TRIGGER IF EXISTS enforce_festival_type_lock ON clubs;
CREATE TRIGGER enforce_festival_type_lock
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  WHEN (OLD.settings IS DISTINCT FROM NEW.settings)
  EXECUTE FUNCTION public.check_festival_type_change();

-- Add comment to trigger
COMMENT ON TRIGGER enforce_festival_type_lock ON clubs IS
  'Enforces that festival_type cannot be changed once a season has started festivals.';
