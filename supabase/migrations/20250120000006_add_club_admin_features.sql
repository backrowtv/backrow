-- ============================================
-- CLUB ADMIN FEATURES MIGRATION
-- ============================================
-- Purpose: Add tables for club announcements, polls, and word blacklist
-- Date: 2025-01-20
-- Agent: Agent 3 - Club Admin & Settings Features
-- 
-- This migration:
-- 1. Creates club_announcements table for club-wide announcements
-- 2. Creates club_polls and club_poll_votes tables for polling system
-- 3. Creates club_word_blacklist table for content moderation
-- 4. Adds indexes for performance
-- 5. Adds RLS policies
-- ============================================

BEGIN;

-- ============================================
-- 1. CREATE CLUB ANNOUNCEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS club_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for club_announcements
CREATE INDEX IF NOT EXISTS idx_club_announcements_club_id 
  ON club_announcements(club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_club_announcements_active 
  ON club_announcements(club_id, expires_at) 
  WHERE expires_at IS NULL OR expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_club_announcements_user_id 
  ON club_announcements(user_id);

-- ============================================
-- 2. CREATE CLUB POLLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS club_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of option strings: ["Option 1", "Option 2", ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for club_polls
CREATE INDEX IF NOT EXISTS idx_club_polls_club_id 
  ON club_polls(club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_club_polls_active 
  ON club_polls(club_id, expires_at) 
  WHERE expires_at IS NULL OR expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_club_polls_user_id 
  ON club_polls(user_id);

-- ============================================
-- 3. CREATE CLUB POLL VOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS club_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES club_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL, -- Index into the options array (0-based)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- Indexes for club_poll_votes
CREATE INDEX IF NOT EXISTS idx_club_poll_votes_poll_id 
  ON club_poll_votes(poll_id);

CREATE INDEX IF NOT EXISTS idx_club_poll_votes_user_id 
  ON club_poll_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_club_poll_votes_poll_option 
  ON club_poll_votes(poll_id, option_index);

-- ============================================
-- 4. CREATE CLUB WORD BLACKLIST TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS club_word_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, LOWER(word)) -- Case-insensitive unique constraint
);

-- Indexes for club_word_blacklist
CREATE INDEX IF NOT EXISTS idx_club_word_blacklist_club_id 
  ON club_word_blacklist(club_id);

CREATE INDEX IF NOT EXISTS idx_club_word_blacklist_added_by 
  ON club_word_blacklist(added_by);

-- ============================================
-- 5. CREATE UPDATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_club_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_club_announcements_updated_at
  BEFORE UPDATE ON club_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_club_admin_updated_at();

CREATE TRIGGER update_club_polls_updated_at
  BEFORE UPDATE ON club_polls
  FOR EACH ROW
  EXECUTE FUNCTION update_club_admin_updated_at();

-- ============================================
-- 6. RLS POLICIES - CLUB ANNOUNCEMENTS
-- ============================================

ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;

-- Members can view active announcements for their clubs
CREATE POLICY "Members can view active announcements"
  ON club_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_announcements.club_id
      AND cm.user_id = auth.uid()
    )
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Producers and directors can create announcements
CREATE POLICY "Admins can create announcements"
  ON club_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_announcements.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
    AND user_id = auth.uid()
  );

-- Producers and directors can update their own announcements
CREATE POLICY "Admins can update announcements"
  ON club_announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_announcements.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
    AND user_id = auth.uid()
  );

-- Producers and directors can delete announcements
CREATE POLICY "Admins can delete announcements"
  ON club_announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_announcements.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
  );

-- ============================================
-- 7. RLS POLICIES - CLUB POLLS
-- ============================================

ALTER TABLE club_polls ENABLE ROW LEVEL SECURITY;

-- Members can view active polls for their clubs
CREATE POLICY "Members can view active polls"
  ON club_polls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_polls.club_id
      AND cm.user_id = auth.uid()
    )
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Producers and directors can create polls
CREATE POLICY "Admins can create polls"
  ON club_polls
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_polls.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
    AND user_id = auth.uid()
  );

-- Producers and directors can update their own polls
CREATE POLICY "Admins can update polls"
  ON club_polls
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_polls.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
    AND user_id = auth.uid()
  );

-- Producers and directors can delete polls
CREATE POLICY "Admins can delete polls"
  ON club_polls
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_polls.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
  );

-- ============================================
-- 8. RLS POLICIES - CLUB POLL VOTES
-- ============================================

ALTER TABLE club_poll_votes ENABLE ROW LEVEL SECURITY;

-- Members can view votes for polls in their clubs
CREATE POLICY "Members can view votes"
  ON club_poll_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_polls cp
      JOIN club_members cm ON cp.club_id = cm.club_id
      WHERE cp.id = club_poll_votes.poll_id
      AND cm.user_id = auth.uid()
    )
  );

-- Members can vote on polls in their clubs (one vote per user per poll)
CREATE POLICY "Members can vote on polls"
  ON club_poll_votes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_polls cp
      JOIN club_members cm ON cp.club_id = cm.club_id
      WHERE cp.id = club_poll_votes.poll_id
      AND cm.user_id = auth.uid()
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
    )
    AND user_id = auth.uid()
  );

-- Users can update their own votes
CREATE POLICY "Users can update their votes"
  ON club_poll_votes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete their votes"
  ON club_poll_votes
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 9. RLS POLICIES - CLUB WORD BLACKLIST
-- ============================================

ALTER TABLE club_word_blacklist ENABLE ROW LEVEL SECURITY;

-- Members can view blacklist for their clubs
CREATE POLICY "Members can view blacklist"
  ON club_word_blacklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_word_blacklist.club_id
      AND cm.user_id = auth.uid()
    )
  );

-- Producers and directors can add words to blacklist
CREATE POLICY "Admins can add words to blacklist"
  ON club_word_blacklist
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_word_blacklist.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
    AND added_by = auth.uid()
  );

-- Producers and directors can delete words from blacklist
CREATE POLICY "Admins can delete words from blacklist"
  ON club_word_blacklist
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_word_blacklist.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director')
    )
  );

COMMIT;

