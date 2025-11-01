-- Add unique constraint for festival slugs within a club
-- Prevents race condition where two festivals get the same slug
-- Partial index: only applies when slug IS NOT NULL (endless festivals may have NULL slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_festivals_club_slug_unique
ON festivals (club_id, slug)
WHERE slug IS NOT NULL;
