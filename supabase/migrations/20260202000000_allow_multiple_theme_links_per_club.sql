-- Allow linking a movie to multiple themes within the same club
-- Previously: UNIQUE(future_nomination_id, club_id) - only 1 theme per club allowed
-- Now: UNIQUE(future_nomination_id, festival_id) - multiple themes per club allowed

-- Drop the old constraint that limited to one theme per club
ALTER TABLE future_nomination_links
  DROP CONSTRAINT IF EXISTS future_nomination_links_future_nomination_id_club_id_key;

-- Add new constraint that allows multiple themes per club but prevents duplicate theme links
ALTER TABLE future_nomination_links
  ADD CONSTRAINT future_nomination_links_future_nomination_id_festival_id_key
  UNIQUE(future_nomination_id, festival_id);

-- Add index for efficient cleanup queries (removing other theme links in same club after nomination)
CREATE INDEX IF NOT EXISTS idx_future_nomination_links_future_nom_club
  ON future_nomination_links(future_nomination_id, club_id);

-- Add comment explaining the change
COMMENT ON CONSTRAINT future_nomination_links_future_nomination_id_festival_id_key
  ON future_nomination_links IS 'Allows linking to multiple themes per club, but prevents duplicate links to the same theme';
