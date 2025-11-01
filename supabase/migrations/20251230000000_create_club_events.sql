-- ============================================
-- Create Club Events System
-- Migration: 20251230000000_create_club_events.sql
-- Description: Adds club_events and club_event_rsvps tables
--              for full event management with RSVP support
-- ============================================

-- Create club_events table
CREATE TABLE IF NOT EXISTS club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  poll_id UUID REFERENCES club_polls(id) ON DELETE SET NULL,
  
  -- Event Details
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('watch_party', 'discussion', 'meetup', 'custom')),
  
  -- Timing
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  
  -- Optional movie association
  tmdb_id INTEGER REFERENCES movies(tmdb_id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  
  -- Metadata
  location TEXT,
  max_attendees INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create club_event_rsvps table
CREATE TABLE IF NOT EXISTS club_event_rsvps (
  event_id UUID NOT NULL REFERENCES club_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_club_events_club_id ON club_events(club_id);
CREATE INDEX IF NOT EXISTS idx_club_events_status ON club_events(status);
CREATE INDEX IF NOT EXISTS idx_club_events_event_date ON club_events(event_date);
CREATE INDEX IF NOT EXISTS idx_club_events_created_by ON club_events(created_by);
CREATE INDEX IF NOT EXISTS idx_club_events_poll_id ON club_events(poll_id);
CREATE INDEX IF NOT EXISTS idx_club_event_rsvps_user_id ON club_event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_club_event_rsvps_status ON club_event_rsvps(status);

-- Enable Row Level Security
ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_event_rsvps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for club_events
-- ============================================

-- Members can view events in their clubs
CREATE POLICY "Club members can view events"
  ON club_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_events.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Admins (producers/directors) can create events
CREATE POLICY "Club admins can create events"
  ON club_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_events.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('producer', 'director')
    )
  );

-- Admins can update events
CREATE POLICY "Club admins can update events"
  ON club_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_events.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('producer', 'director')
    )
  );

-- Admins can delete events
CREATE POLICY "Club admins can delete events"
  ON club_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_events.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('producer', 'director')
    )
  );

-- ============================================
-- RLS Policies for club_event_rsvps
-- ============================================

-- Members can view RSVPs for events in their clubs
CREATE POLICY "Club members can view RSVPs"
  ON club_event_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_events
      JOIN club_members ON club_members.club_id = club_events.club_id
      WHERE club_events.id = club_event_rsvps.event_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Members can RSVP to events in their clubs
CREATE POLICY "Club members can RSVP"
  ON club_event_rsvps FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM club_events
      JOIN club_members ON club_members.club_id = club_events.club_id
      WHERE club_events.id = club_event_rsvps.event_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Members can update their own RSVP
CREATE POLICY "Members can update own RSVP"
  ON club_event_rsvps FOR UPDATE
  USING (auth.uid() = user_id);

-- Members can delete their own RSVP
CREATE POLICY "Members can delete own RSVP"
  ON club_event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Add processed_at column to club_polls for tracking
-- ============================================

ALTER TABLE club_polls ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Index for finding unprocessed polls
CREATE INDEX IF NOT EXISTS idx_club_polls_unprocessed 
  ON club_polls(expires_at) 
  WHERE processed_at IS NULL AND action_type IS NOT NULL;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE club_events IS 'Club events for watch parties, discussions, meetups, and custom events';
COMMENT ON TABLE club_event_rsvps IS 'RSVP responses for club events';
COMMENT ON COLUMN club_events.poll_id IS 'Reference to the poll that created this event (if created via poll)';
COMMENT ON COLUMN club_events.event_type IS 'Type of event: watch_party, discussion, meetup, or custom';
COMMENT ON COLUMN club_events.status IS 'Event status: upcoming, ongoing, completed, or cancelled';
COMMENT ON COLUMN club_events.location IS 'Virtual meeting link or physical location';
COMMENT ON COLUMN club_polls.processed_at IS 'Timestamp when poll action was processed (for event creation from polls)';

