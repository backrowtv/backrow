-- Create favorite_clubs table for user favorite clubs
CREATE TABLE IF NOT EXISTS favorite_clubs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, club_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_favorite_clubs_user_id ON favorite_clubs(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_clubs_club_id ON favorite_clubs(club_id);

-- Add comment
COMMENT ON TABLE favorite_clubs IS 'Junction table for user favorite clubs';