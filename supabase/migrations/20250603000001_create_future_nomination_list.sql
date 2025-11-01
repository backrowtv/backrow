-- Create future_nomination_list table for storing movies users want to nominate in future festivals
CREATE TABLE IF NOT EXISTS future_nomination_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL REFERENCES movies(tmdb_id) ON DELETE CASCADE,
  note TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each user can only have a movie once in their list
  UNIQUE(user_id, tmdb_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_future_nomination_list_user_id ON future_nomination_list(user_id);
CREATE INDEX IF NOT EXISTS idx_future_nomination_list_tmdb_id ON future_nomination_list(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_future_nomination_list_created_at ON future_nomination_list(created_at DESC);

-- Enable RLS
ALTER TABLE future_nomination_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own future nomination list
CREATE POLICY "Users can view own future nomination list"
  ON future_nomination_list
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert into their own future nomination list
CREATE POLICY "Users can insert into own future nomination list"
  ON future_nomination_list
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own future nomination list items
CREATE POLICY "Users can update own future nomination list"
  ON future_nomination_list
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete from their own future nomination list
CREATE POLICY "Users can delete from own future nomination list"
  ON future_nomination_list
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_future_nomination_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER future_nomination_list_updated_at
  BEFORE UPDATE ON future_nomination_list
  FOR EACH ROW
  EXECUTE FUNCTION update_future_nomination_list_updated_at();

