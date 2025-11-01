-- Drop service-role-only RLS policies on curated_collections.
-- Service role bypasses RLS entirely, so these policies had no effect.
DROP POLICY IF EXISTS "Service role can insert curated collections" ON curated_collections;
DROP POLICY IF EXISTS "Service role can update curated collections" ON curated_collections;
DROP POLICY IF EXISTS "Service role can delete curated collections" ON curated_collections;
