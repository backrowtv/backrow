-- Migration: Add movie_pool_votes table for endless festival movie pool voting
-- Created: December 2024

-- Create movie_pool_votes table
CREATE TABLE IF NOT EXISTS movie_pool_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id UUID NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL DEFAULT 'upvote' CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only vote once per movie in the pool
  UNIQUE(nomination_id, user_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_movie_pool_votes_nomination_id ON movie_pool_votes(nomination_id);
CREATE INDEX IF NOT EXISTS idx_movie_pool_votes_user_id ON movie_pool_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_pool_votes_vote_type ON movie_pool_votes(nomination_id, vote_type);

-- Enable RLS
ALTER TABLE movie_pool_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view votes for movies in clubs they belong to
CREATE POLICY "Users can view movie pool votes in their clubs"
  ON movie_pool_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nominations n
      JOIN festivals f ON n.festival_id = f.id
      JOIN club_members cm ON f.club_id = cm.club_id
      WHERE n.id = movie_pool_votes.nomination_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can insert their own votes for movies in clubs they belong to
CREATE POLICY "Users can vote for movies in their clubs"
  ON movie_pool_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM nominations n
      JOIN festivals f ON n.festival_id = f.id
      JOIN club_members cm ON f.club_id = cm.club_id
      WHERE n.id = movie_pool_votes.nomination_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
  ON movie_pool_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE movie_pool_votes IS 'Tracks user votes for movies in the endless festival movie pool';
COMMENT ON COLUMN movie_pool_votes.vote_type IS 'Type of vote: upvote or downvote';

