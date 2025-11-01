-- Migration: Normalize all ratings to 0-10 scale
-- Description: BackRow now stores all ratings internally on a 0-10 scale with 0.1 precision.
-- This migration converts existing ratings from their original scales to the normalized 0-10 scale.
--
-- Affected tables:
-- 1. ratings - Festival ratings (have club context for scale info)
-- 2. generic_ratings - Non-festival ratings (may need heuristic normalization)
-- 3. activity_log - Rating values stored in details JSON
-- 4. festival_standings - average_rating column
-- 5. user_stats - average_rating_given column
-- 6. club_stats - average_festival_rating column

-- =============================================================================
-- 1. NORMALIZE RATINGS TABLE (has club context)
-- =============================================================================
-- For each rating, look up the club's rating_min and rating_max from settings
-- and normalize: normalized = ((rating - min) / (max - min)) * 10

UPDATE ratings r
SET rating = ROUND(
  (
    (r.rating - COALESCE((c.settings->>'rating_min')::numeric, 0)) / 
    NULLIF(COALESCE((c.settings->>'rating_max')::numeric, 10) - COALESCE((c.settings->>'rating_min')::numeric, 0), 0)
  ) * 10,
  1  -- Round to 1 decimal place
)
FROM festivals f
JOIN clubs c ON f.club_id = c.id
WHERE r.festival_id = f.id
  -- Only normalize if the scale is NOT already 0-10
  AND (
    COALESCE((c.settings->>'rating_min')::numeric, 0) != 0 
    OR COALESCE((c.settings->>'rating_max')::numeric, 10) != 10
  );

-- =============================================================================
-- 2. NORMALIZE GENERIC_RATINGS TABLE (heuristic approach)
-- =============================================================================
-- Generic ratings don't have club context. Use heuristics:
-- - If rating <= 5 and user's current rating_preferences show max of 5, normalize from 0-5 to 0-10
-- - Otherwise assume already 0-10

-- First, normalize ratings for users who have a 1-5 star preference
UPDATE generic_ratings gr
SET rating = ROUND(
  (
    (gr.rating - COALESCE((u.rating_preferences->>'rating_min')::numeric, 0)) / 
    NULLIF(COALESCE((u.rating_preferences->>'rating_max')::numeric, 10) - COALESCE((u.rating_preferences->>'rating_min')::numeric, 0), 0)
  ) * 10,
  1
)
FROM users u
WHERE gr.user_id = u.id
  -- Only normalize if user's preference max is NOT 10
  AND COALESCE((u.rating_preferences->>'rating_max')::numeric, 10) != 10
  -- And the rating is within their preference range (sanity check)
  AND gr.rating <= COALESCE((u.rating_preferences->>'rating_max')::numeric, 10);

-- =============================================================================
-- 3. NORMALIZE ACTIVITY_LOG RATINGS (for rating-related actions)
-- =============================================================================
-- Update the rating value in details JSON for rating activities
-- Use club context if available, otherwise use heuristics

-- For activity with club context
UPDATE activity_log al
SET details = jsonb_set(
  al.details,
  '{rating}',
  to_jsonb(
    ROUND(
      (
        ((al.details->>'rating')::numeric - COALESCE((c.settings->>'rating_min')::numeric, 0)) / 
        NULLIF(COALESCE((c.settings->>'rating_max')::numeric, 10) - COALESCE((c.settings->>'rating_min')::numeric, 0), 0)
      ) * 10,
      1
    )
  )
)
FROM clubs c
WHERE al.details->>'club_id' IS NOT NULL
  AND (al.details->>'club_id')::uuid = c.id
  AND al.action IN ('user_rated_movie', 'user_rating_changed', 'rated_movie')
  AND al.details->>'rating' IS NOT NULL
  -- Only normalize if the club scale is NOT already 0-10
  AND (
    COALESCE((c.settings->>'rating_min')::numeric, 0) != 0 
    OR COALESCE((c.settings->>'rating_max')::numeric, 10) != 10
  );

-- For activity without club context, use user's rating preferences
UPDATE activity_log al
SET details = jsonb_set(
  al.details,
  '{rating}',
  to_jsonb(
    ROUND(
      (
        ((al.details->>'rating')::numeric - COALESCE((u.rating_preferences->>'rating_min')::numeric, 0)) / 
        NULLIF(COALESCE((u.rating_preferences->>'rating_max')::numeric, 10) - COALESCE((u.rating_preferences->>'rating_min')::numeric, 0), 0)
      ) * 10,
      1
    )
  )
)
FROM users u
WHERE (al.details->>'club_id' IS NULL OR al.club_id IS NULL)
  AND al.user_id = u.id
  AND al.action IN ('user_rated_movie', 'user_rating_changed', 'rated_movie')
  AND al.details->>'rating' IS NOT NULL
  -- Only normalize if user's preference max is NOT 10
  AND COALESCE((u.rating_preferences->>'rating_max')::numeric, 10) != 10
  -- And the rating is within their preference range
  AND (al.details->>'rating')::numeric <= COALESCE((u.rating_preferences->>'rating_max')::numeric, 10);

-- =============================================================================
-- 4. RECALCULATE AGGREGATE STATISTICS (if needed)
-- =============================================================================
-- Note: These tables contain pre-calculated averages that should be updated
-- if the underlying ratings changed. For now, we'll leave them as-is since
-- they may need more complex recalculation logic. The application should
-- recalculate these when it next updates standings/stats.

-- festival_standings.average_rating - Will be recalculated when standings update
-- user_stats.average_rating_given - Will be recalculated when stats update  
-- club_stats.average_festival_rating - Will be recalculated when stats update

-- Add a comment to track this migration
COMMENT ON TABLE ratings IS 'User ratings for movies within festival context. All ratings are stored on a normalized 0-10 scale as of migration 20260117000000.';
COMMENT ON TABLE generic_ratings IS 'User ratings for movies outside of festival context. All ratings are stored on a normalized 0-10 scale as of migration 20260117000000.';

-- =============================================================================
-- 5. ADD CONSTRAINT TO ENSURE RATINGS ARE IN VALID RANGE
-- =============================================================================
-- Add check constraints to prevent invalid ratings in the future

DO $$
BEGIN
  -- Add constraint to ratings table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ratings_normalized_range_check'
  ) THEN
    ALTER TABLE ratings 
    ADD CONSTRAINT ratings_normalized_range_check 
    CHECK (rating >= 0 AND rating <= 10);
  END IF;
  
  -- Add constraint to generic_ratings table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generic_ratings_normalized_range_check'
  ) THEN
    ALTER TABLE generic_ratings 
    ADD CONSTRAINT generic_ratings_normalized_range_check 
    CHECK (rating >= 0 AND rating <= 10);
  END IF;
END $$;

