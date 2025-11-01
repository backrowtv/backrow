-- Migration: Fix RLS policies for movie_pool_votes to support club_movie_pool
-- The movie_pool_votes table now has a club_pool_item_id column (added in 20260201000000),
-- but the RLS policies still only check nomination_id. This migration updates the policies
-- to allow voting on movies in club_movie_pool.

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view movie pool votes in their clubs" ON movie_pool_votes;
DROP POLICY IF EXISTS "Users can vote for movies in their clubs" ON movie_pool_votes;

-- SELECT: Allow viewing votes for either nominations OR club_movie_pool items
CREATE POLICY "Users can view movie pool votes in their clubs"
  ON movie_pool_votes FOR SELECT
  USING (
    -- Check nomination_id path (legacy)
    (nomination_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM nominations n
      JOIN festivals f ON n.festival_id = f.id
      JOIN club_members cm ON f.club_id = cm.club_id
      WHERE n.id = movie_pool_votes.nomination_id
      AND cm.user_id = (SELECT auth.uid())
    ))
    OR
    -- Check club_pool_item_id path (new)
    (club_pool_item_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM club_movie_pool cmp
      JOIN club_members cm ON cmp.club_id = cm.club_id
      WHERE cmp.id = movie_pool_votes.club_pool_item_id
      AND cm.user_id = (SELECT auth.uid())
    ))
  );

-- INSERT: Allow voting on either nominations OR club_movie_pool items
CREATE POLICY "Users can vote for movies in their clubs"
  ON movie_pool_votes FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      -- Check nomination_id path (legacy)
      (nomination_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM nominations n
        JOIN festivals f ON n.festival_id = f.id
        JOIN club_members cm ON f.club_id = cm.club_id
        WHERE n.id = movie_pool_votes.nomination_id
        AND cm.user_id = (SELECT auth.uid())
      ))
      OR
      -- Check club_pool_item_id path (new)
      (club_pool_item_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM club_movie_pool cmp
        JOIN club_members cm ON cmp.club_id = cm.club_id
        WHERE cmp.id = movie_pool_votes.club_pool_item_id
        AND cm.user_id = (SELECT auth.uid())
      ))
    )
  );

-- DELETE policy remains unchanged - users can delete their own votes
-- The existing policy "Users can delete their own votes" only checks auth.uid() = user_id
-- which is sufficient for both nomination and pool item votes

-- Add index for the new query pattern if not exists
CREATE INDEX IF NOT EXISTS idx_movie_pool_votes_club_pool_item_user
  ON movie_pool_votes(club_pool_item_id, user_id);

COMMENT ON POLICY "Users can view movie pool votes in their clubs" ON movie_pool_votes IS
  'Allows club members to view votes for movies in their clubs, whether via nominations or club_movie_pool';

COMMENT ON POLICY "Users can vote for movies in their clubs" ON movie_pool_votes IS
  'Allows club members to vote for movies in their clubs, whether via nominations or club_movie_pool';
