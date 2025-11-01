-- Migration: Club Challenges System
-- Created: 2026-01-08
-- Purpose: Add club-level badges/challenges that clubs can earn and display

-- 1. Modify badges constraint to allow 'club_challenge' badge type with NULL club_id
-- Drop old constraint
ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_type_club_check;

-- Update check constraint to include new badge types
ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_badge_type_check;
ALTER TABLE badges ADD CONSTRAINT badges_badge_type_check
  CHECK (badge_type IN ('site', 'club', 'club_challenge'));

-- Add new constraint for club_id logic
ALTER TABLE badges ADD CONSTRAINT badges_type_club_check CHECK (
  (badge_type = 'site' AND club_id IS NULL) OR
  (badge_type = 'club' AND club_id IS NOT NULL) OR
  (badge_type = 'club_challenge' AND club_id IS NULL)
);

-- 2. Create club_badges table to track which clubs have earned which badges
CREATE TABLE IF NOT EXISTS club_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(club_id, badge_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_club_badges_club_id ON club_badges(club_id);
CREATE INDEX IF NOT EXISTS idx_club_badges_badge_id ON club_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_club_badges_earned ON club_badges(earned_at) WHERE earned_at IS NOT NULL;

-- RLS Policies
ALTER TABLE club_badges ENABLE ROW LEVEL SECURITY;

-- Club badges are viewable by everyone (public display)
CREATE POLICY "Club badges are viewable by everyone"
  ON club_badges FOR SELECT
  USING (true);

-- Club badges can be inserted/updated by authenticated users (via server actions)
CREATE POLICY "Club badges can be managed by authenticated users"
  ON club_badges FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Club badges can be updated by authenticated users"
  ON club_badges FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 3. Add featured_badge_ids column to clubs table (mirrors users pattern)
ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS featured_badge_ids text[] DEFAULT '{}';

-- Add constraint to limit to 5 badges maximum
ALTER TABLE clubs
ADD CONSTRAINT clubs_featured_badge_ids_max_5
CHECK (array_length(featured_badge_ids, 1) IS NULL OR array_length(featured_badge_ids, 1) <= 5);

-- Create index for featured badges lookup
CREATE INDEX IF NOT EXISTS idx_clubs_featured_badge_ids
ON clubs USING GIN (featured_badge_ids);

-- Add comment for documentation
COMMENT ON COLUMN clubs.featured_badge_ids IS 'Array of badge IDs (max 5) to display on club ID card';

-- 4. Insert club challenge badge definitions (4 categories × 6 tiers = 24 badges)
-- Using Cinema/Studio themed tier labels: Indie, Studio, Blockbuster, Franchise, Empire, Legacy

-- Festivals Completed category
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Indie Premiere', 'Complete your first festival', NULL, 'club_challenge',
   '{"type": "club_festivals_completed", "threshold": 1, "category": "festivals_completed"}'::jsonb),
  ('Studio Screening', 'Complete 5 festivals', NULL, 'club_challenge',
   '{"type": "club_festivals_completed", "threshold": 5, "category": "festivals_completed"}'::jsonb),
  ('Blockbuster Run', 'Complete 10 festivals', NULL, 'club_challenge',
   '{"type": "club_festivals_completed", "threshold": 10, "category": "festivals_completed"}'::jsonb),
  ('Franchise Circuit', 'Complete 25 festivals', NULL, 'club_challenge',
   '{"type": "club_festivals_completed", "threshold": 25, "category": "festivals_completed"}'::jsonb),
  ('Empire Theater', 'Complete 50 festivals', NULL, 'club_challenge',
   '{"type": "club_festivals_completed", "threshold": 50, "category": "festivals_completed"}'::jsonb),
  ('Legacy Cinema', 'Complete 100 festivals', NULL, 'club_challenge',
   '{"type": "club_festivals_completed", "threshold": 100, "category": "festivals_completed"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Movies Watched category
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Indie Collection', 'Watch 10 movies together', NULL, 'club_challenge',
   '{"type": "club_movies_watched", "threshold": 10, "category": "movies_watched"}'::jsonb),
  ('Studio Library', 'Watch 50 movies together', NULL, 'club_challenge',
   '{"type": "club_movies_watched", "threshold": 50, "category": "movies_watched"}'::jsonb),
  ('Blockbuster Archive', 'Watch 100 movies together', NULL, 'club_challenge',
   '{"type": "club_movies_watched", "threshold": 100, "category": "movies_watched"}'::jsonb),
  ('Franchise Vault', 'Watch 250 movies together', NULL, 'club_challenge',
   '{"type": "club_movies_watched", "threshold": 250, "category": "movies_watched"}'::jsonb),
  ('Empire Repository', 'Watch 500 movies together', NULL, 'club_challenge',
   '{"type": "club_movies_watched", "threshold": 500, "category": "movies_watched"}'::jsonb),
  ('Legacy Archives', 'Watch 1000 movies together', NULL, 'club_challenge',
   '{"type": "club_movies_watched", "threshold": 1000, "category": "movies_watched"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Members category
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Indie Crew', 'Reach 3 members', NULL, 'club_challenge',
   '{"type": "club_members", "threshold": 3, "category": "members"}'::jsonb),
  ('Studio Team', 'Reach 5 members', NULL, 'club_challenge',
   '{"type": "club_members", "threshold": 5, "category": "members"}'::jsonb),
  ('Blockbuster Squad', 'Reach 10 members', NULL, 'club_challenge',
   '{"type": "club_members", "threshold": 10, "category": "members"}'::jsonb),
  ('Franchise Family', 'Reach 25 members', NULL, 'club_challenge',
   '{"type": "club_members", "threshold": 25, "category": "members"}'::jsonb),
  ('Empire Guild', 'Reach 50 members', NULL, 'club_challenge',
   '{"type": "club_members", "threshold": 50, "category": "members"}'::jsonb),
  ('Legacy Society', 'Reach 100 members', NULL, 'club_challenge',
   '{"type": "club_members", "threshold": 100, "category": "members"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Seasons Completed category
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Indie Season', 'Complete your first season', NULL, 'club_challenge',
   '{"type": "club_seasons_completed", "threshold": 1, "category": "seasons_completed"}'::jsonb),
  ('Studio Season', 'Complete 3 seasons', NULL, 'club_challenge',
   '{"type": "club_seasons_completed", "threshold": 3, "category": "seasons_completed"}'::jsonb),
  ('Blockbuster Season', 'Complete 5 seasons', NULL, 'club_challenge',
   '{"type": "club_seasons_completed", "threshold": 5, "category": "seasons_completed"}'::jsonb),
  ('Franchise Season', 'Complete 10 seasons', NULL, 'club_challenge',
   '{"type": "club_seasons_completed", "threshold": 10, "category": "seasons_completed"}'::jsonb),
  ('Empire Season', 'Complete 20 seasons', NULL, 'club_challenge',
   '{"type": "club_seasons_completed", "threshold": 20, "category": "seasons_completed"}'::jsonb),
  ('Legacy Season', 'Complete 50 seasons', NULL, 'club_challenge',
   '{"type": "club_seasons_completed", "threshold": 50, "category": "seasons_completed"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE club_badges IS 'Tracks which club challenge badges each club has earned';
COMMENT ON COLUMN club_badges.progress IS 'Current progress toward the badge threshold';
COMMENT ON COLUMN club_badges.earned_at IS 'When the badge was earned (NULL if not yet earned)';
