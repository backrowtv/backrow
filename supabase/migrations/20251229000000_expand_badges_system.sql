-- Migration: Expand badges system with tiered categories
-- Created: 2025-12-29
-- Purpose: Add comprehensive tiered milestone badges organized by category

-- First, update existing badges to include category field
UPDATE badges SET requirements_jsonb = requirements_jsonb || '{"category": "movies_watched"}'::jsonb
WHERE requirements_jsonb->>'type' = 'movie_milestone';

UPDATE badges SET requirements_jsonb = requirements_jsonb || '{"category": "festivals_participated"}'::jsonb
WHERE requirements_jsonb->>'type' = 'festival_milestone';

-- Delete existing badges that will be replaced with new tier structure
-- (Keep existing progress by not deleting user_badges - they'll be orphaned but harmless)
DELETE FROM badges WHERE requirements_jsonb->>'type' = 'movie_milestone';
DELETE FROM badges WHERE requirements_jsonb->>'type' = 'festival_milestone';

-- ============================================================
-- FESTIVALS WON - 6 tiers (1, 5, 10, 25, 50, 100)
-- ============================================================
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('First Victory', 'Won your first festival', NULL, 'site',
   '{"type": "festival_win_milestone", "threshold": 1, "category": "festivals_won"}'::jsonb),
  ('Rising Champion', 'Won 5 festivals', NULL, 'site',
   '{"type": "festival_win_milestone", "threshold": 5, "category": "festivals_won"}'::jsonb),
  ('Festival Champion', 'Won 10 festivals', NULL, 'site',
   '{"type": "festival_win_milestone", "threshold": 10, "category": "festivals_won"}'::jsonb),
  ('Festival Legend', 'Won 25 festivals', NULL, 'site',
   '{"type": "festival_win_milestone", "threshold": 25, "category": "festivals_won"}'::jsonb),
  ('Festival Titan', 'Won 50 festivals', NULL, 'site',
   '{"type": "festival_win_milestone", "threshold": 50, "category": "festivals_won"}'::jsonb),
  ('Festival God', 'Won 100 festivals', NULL, 'site',
   '{"type": "festival_win_milestone", "threshold": 100, "category": "festivals_won"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================
-- MOVIES WATCHED - 8 tiers (1, 10, 25, 50, 100, 250, 500, 1000)
-- ============================================================
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('First Film', 'Watched your first movie', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 1, "category": "movies_watched"}'::jsonb),
  ('Movie Watcher', 'Watched 10 movies', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 10, "category": "movies_watched"}'::jsonb),
  ('Film Fan', 'Watched 25 movies', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 25, "category": "movies_watched"}'::jsonb),
  ('Film Enthusiast', 'Watched 50 movies', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 50, "category": "movies_watched"}'::jsonb),
  ('Cinephile', 'Watched 100 movies', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 100, "category": "movies_watched"}'::jsonb),
  ('Film Devotee', 'Watched 250 movies', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 250, "category": "movies_watched"}'::jsonb),
  ('Film Connoisseur', 'Watched 500 movies', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 500, "category": "movies_watched"}'::jsonb),
  ('Cinema Scholar', 'Watched 1000 movies', NULL, 'site',
   '{"type": "movie_milestone", "threshold": 1000, "category": "movies_watched"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FESTIVALS PARTICIPATED - 8 tiers (1, 10, 25, 50, 100, 250, 500, 1000)
-- ============================================================
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Festival Rookie', 'Participated in your first festival', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 1, "category": "festivals_participated"}'::jsonb),
  ('Festival Goer', 'Participated in 10 festivals', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 10, "category": "festivals_participated"}'::jsonb),
  ('Festival Regular', 'Participated in 25 festivals', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 25, "category": "festivals_participated"}'::jsonb),
  ('Festival Veteran', 'Participated in 50 festivals', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 50, "category": "festivals_participated"}'::jsonb),
  ('Festival Expert', 'Participated in 100 festivals', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 100, "category": "festivals_participated"}'::jsonb),
  ('Festival Devotee', 'Participated in 250 festivals', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 250, "category": "festivals_participated"}'::jsonb),
  ('Festival Fanatic', 'Participated in 500 festivals', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 500, "category": "festivals_participated"}'::jsonb),
  ('Festival Immortal', 'Participated in 1000 festivals', NULL, 'site',
   '{"type": "festival_milestone", "threshold": 1000, "category": "festivals_participated"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOMINATORS GUESSED CORRECTLY - 8 tiers (1, 10, 25, 50, 100, 250, 500, 1000)
-- ============================================================
INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Lucky Guess', 'Guessed a nominator correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 1, "category": "guesses_correct"}'::jsonb),
  ('Keen Observer', 'Guessed 10 nominators correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 10, "category": "guesses_correct"}'::jsonb),
  ('Sleuth', 'Guessed 25 nominators correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 25, "category": "guesses_correct"}'::jsonb),
  ('Detective', 'Guessed 50 nominators correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 50, "category": "guesses_correct"}'::jsonb),
  ('Mind Reader', 'Guessed 100 nominators correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 100, "category": "guesses_correct"}'::jsonb),
  ('Psychic', 'Guessed 250 nominators correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 250, "category": "guesses_correct"}'::jsonb),
  ('Oracle', 'Guessed 500 nominators correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 500, "category": "guesses_correct"}'::jsonb),
  ('Omniscient', 'Guessed 1000 nominators correctly', NULL, 'site',
   '{"type": "guess_milestone", "threshold": 1000, "category": "guesses_correct"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges ((requirements_jsonb->>'category'));

-- Comments
COMMENT ON COLUMN badges.requirements_jsonb IS 'JSON structure: {"type": "..._milestone", "threshold": number, "category": "festivals_won|movies_watched|festivals_participated|guesses_correct"}';
