-- Create theme_pool_votes table for upvotes/downvotes on themes in the pool
-- This is separate from theme_votes which is for festival theme selection phase
CREATE TABLE IF NOT EXISTS theme_pool_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES theme_pool(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(theme_id, user_id) -- One vote per user per theme
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_theme_pool_votes_theme_id ON theme_pool_votes(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_pool_votes_user_id ON theme_pool_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_theme_pool_votes_vote_type ON theme_pool_votes(vote_type);

-- Add comment
COMMENT ON TABLE theme_pool_votes IS 'Stores upvotes/downvotes on themes in the theme pool (not tied to festivals)';

-- Enable RLS
ALTER TABLE theme_pool_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read votes for themes in clubs they're members of
CREATE POLICY "Users can read theme pool votes"
  ON theme_pool_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = auth.uid()
        AND theme_pool.id = theme_pool_votes.theme_id
    )
  );

-- Policy: Users can insert/update their own votes
CREATE POLICY "Users can vote on themes"
  ON theme_pool_votes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = auth.uid()
        AND theme_pool.id = theme_pool_votes.theme_id
        AND (theme_pool_votes.user_id = auth.uid() OR theme_pool_votes.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = auth.uid()
        AND theme_pool.id = theme_pool_votes.theme_id
        AND theme_pool_votes.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_theme_pool_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_theme_pool_votes_updated_at
  BEFORE UPDATE ON theme_pool_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_theme_pool_votes_updated_at();

