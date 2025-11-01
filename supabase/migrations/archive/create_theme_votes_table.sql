-- Create theme_votes table for storing member votes on themes during theme_selection phase
CREATE TABLE IF NOT EXISTS theme_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  theme_id UUID NOT NULL REFERENCES theme_pool(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(festival_id, user_id) -- One vote per member per festival
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_theme_votes_festival_id ON theme_votes(festival_id);
CREATE INDEX IF NOT EXISTS idx_theme_votes_theme_id ON theme_votes(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_votes_user_id ON theme_votes(user_id);

-- Add comment
COMMENT ON TABLE theme_votes IS 'Stores member votes for themes during festival theme_selection phase';