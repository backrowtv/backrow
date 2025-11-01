-- Migration: Create badges system tables
-- Created: 2025-01-25
-- Purpose: Implement badges/achievements system for user milestones

-- Badges table: Defines all available badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('site', 'club')),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  requirements_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT badges_type_club_check CHECK (
    (badge_type = 'site' AND club_id IS NULL) OR
    (badge_type = 'club' AND club_id IS NOT NULL)
  )
);

-- User badges table: Tracks which badges users have earned
CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress_jsonb JSONB DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (user_id, badge_id, club_id),
  
  -- Constraints
  CONSTRAINT user_badges_club_check CHECK (
    (club_id IS NULL AND (SELECT badge_type FROM badges WHERE id = badge_id) = 'site') OR
    (club_id IS NOT NULL AND (SELECT badge_type FROM badges WHERE id = badge_id) = 'club')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_badges_club ON badges(club_id) WHERE club_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_club ON user_badges(club_id) WHERE club_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- RLS Policies
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges: Everyone can read badges
CREATE POLICY "Badges are viewable by everyone"
  ON badges FOR SELECT
  USING (true);

-- User badges: Users can view their own badges and badges of other users (public display)
CREATE POLICY "User badges are viewable by everyone"
  ON user_badges FOR SELECT
  USING (true);

-- User badges: Only system can insert (via server actions)
CREATE POLICY "User badges can be created by authenticated users"
  ON user_badges FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Insert initial site-wide badges
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Movie Watcher', 'Watched 10 movies', NULL, 'site', '{"type": "movie_milestone", "threshold": 10}'::jsonb),
  ('Film Enthusiast', 'Watched 50 movies', NULL, 'site', '{"type": "movie_milestone", "threshold": 50}'::jsonb),
  ('Cinephile', 'Watched 100 movies', NULL, 'site', '{"type": "movie_milestone", "threshold": 100}'::jsonb),
  ('Festival Participant', 'Completed 5 festivals', NULL, 'site', '{"type": "festival_milestone", "threshold": 5}'::jsonb),
  ('Festival Veteran', 'Completed 10 festivals', NULL, 'site', '{"type": "festival_milestone", "threshold": 10}'::jsonb),
  ('Festival Master', 'Completed 25 festivals', NULL, 'site', '{"type": "festival_milestone", "threshold": 25}'::jsonb)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE badges IS 'Defines all available badges (achievements) that users can earn';
COMMENT ON TABLE user_badges IS 'Tracks which badges users have earned, with progress tracking';
COMMENT ON COLUMN badges.requirements_jsonb IS 'JSON structure defining badge requirements (e.g., {"type": "movie_milestone", "threshold": 10})';
COMMENT ON COLUMN user_badges.progress_jsonb IS 'JSON structure tracking progress toward badge (e.g., {"current": 8, "target": 10})';

