-- Performance cleanup: missing FK index, duplicate index, function search_path

-- 1. Add missing FK index on hidden_activities.activity_id
CREATE INDEX IF NOT EXISTS idx_hidden_activities_activity_id
  ON hidden_activities(activity_id);

-- 2. Drop duplicate festival index (keep idx_festivals_club_slug_unique)
DROP INDEX IF EXISTS idx_festivals_slug_club_unique;

-- 3. Fix function search_path (security advisor)
ALTER FUNCTION public.validate_festival_dates SET search_path = public;
ALTER FUNCTION public._run_pgtap_test SET search_path = public;
