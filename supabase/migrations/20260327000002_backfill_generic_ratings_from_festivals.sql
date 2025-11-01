-- Backfill generic_ratings from existing festival ratings
-- For endless festivals (status = 'watching') and non-themed standard festivals (theme IS NULL),
-- the festival rating should match the global generic rating.
-- This migration syncs existing festival ratings to generic_ratings.
-- Uses DO NOTHING to preserve any existing global ratings the user explicitly set.

INSERT INTO generic_ratings (user_id, tmdb_id, rating, updated_at)
SELECT DISTINCT ON (r.user_id, n.tmdb_id)
  r.user_id,
  n.tmdb_id,
  r.rating,
  NOW()
FROM ratings r
JOIN nominations n ON n.id = r.nomination_id
JOIN festivals f ON f.id = r.festival_id
WHERE r.deleted_at IS NULL
  AND (f.status = 'watching' OR f.theme IS NULL)
  AND r.rating IS NOT NULL
  AND n.tmdb_id IS NOT NULL
ORDER BY r.user_id, n.tmdb_id, r.created_at DESC
ON CONFLICT (user_id, tmdb_id) DO NOTHING;
