-- Create future_nomination_links table to track which clubs a future nomination is linked to
-- This allows users to link a movie to multiple clubs' themes and only removes the future
-- nomination when all linked clubs have received nominations

CREATE TABLE IF NOT EXISTS future_nomination_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  future_nomination_id UUID NOT NULL REFERENCES future_nomination_list(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  festival_id UUID REFERENCES festivals(id) ON DELETE SET NULL,
  nominated BOOLEAN DEFAULT FALSE,
  nominated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each future nomination can only be linked once per club
  UNIQUE(future_nomination_id, club_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_future_nomination_links_future_nomination_id 
  ON future_nomination_links(future_nomination_id);
CREATE INDEX IF NOT EXISTS idx_future_nomination_links_club_id 
  ON future_nomination_links(club_id);
CREATE INDEX IF NOT EXISTS idx_future_nomination_links_festival_id 
  ON future_nomination_links(festival_id);
CREATE INDEX IF NOT EXISTS idx_future_nomination_links_nominated 
  ON future_nomination_links(nominated) WHERE nominated = false;

-- Enable RLS
ALTER TABLE future_nomination_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own future nomination links (via the future_nomination_list ownership)
CREATE POLICY "Users can view own future nomination links"
  ON future_nomination_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = auth.uid()
    )
  );

-- Users can insert links for their own future nominations
CREATE POLICY "Users can insert own future nomination links"
  ON future_nomination_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = auth.uid()
    )
  );

-- Users can update their own future nomination links
CREATE POLICY "Users can update own future nomination links"
  ON future_nomination_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = auth.uid()
    )
  );

-- Users can delete their own future nomination links
CREATE POLICY "Users can delete own future nomination links"
  ON future_nomination_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM future_nomination_list fnl
      WHERE fnl.id = future_nomination_links.future_nomination_id
      AND fnl.user_id = auth.uid()
    )
  );

-- Add comment to table
COMMENT ON TABLE future_nomination_links IS 'Links between future nominations and clubs/festivals. Tracks which clubs a movie is planned for nomination. Movie only leaves future_nomination_list when all links are nominated.';
COMMENT ON COLUMN future_nomination_links.nominated IS 'Whether this link has been used to create an actual nomination';
COMMENT ON COLUMN future_nomination_links.nominated_at IS 'Timestamp when the nomination was created from this link';

