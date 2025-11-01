-- ============================================
-- DATABASE PERFORMANCE & ANALYTICS MIGRATION
-- ============================================
-- Purpose: Add normalized analytics tables, comprehensive indexes, soft deletes, and proper cascade behaviors
-- Date: 2024-12-25
-- 
-- This migration:
-- 1. Adds missing unique constraints (with existence checks)
-- 2. Creates comprehensive indexes for performance
-- 3. Fixes cascade deletes (preserves SET NULL for user relationships)
-- 4. Adds soft delete columns (deleted_at)
-- 5. Creates normalized analytics tables (festival_standings, user_stats, club_stats)
-- 6. Creates trigger functions for auto-updating stats
-- 7. Adds RLS policies for new tables
-- ============================================

BEGIN;

-- ============================================
-- 1. PRE-MIGRATION: CHECK EXISTING CONSTRAINTS
-- ============================================

-- Check if unique constraint exists on nominations (documented but verify)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_festival_nomination'
    AND conrelid = 'nominations'::regclass
  ) THEN
    -- Check if constraint exists with different name
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE contype = 'u'
      AND conrelid = 'nominations'::regclass
      AND array_length(conkey, 1) = 2
      AND conkey @> ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'nominations'::regclass AND attname = 'festival_id')]
      AND conkey @> ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'nominations'::regclass AND attname = 'user_id')]
    ) THEN
      ALTER TABLE nominations 
      ADD CONSTRAINT unique_user_festival_nomination 
      UNIQUE(festival_id, user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. ADD MISSING UNIQUE CONSTRAINTS
-- ============================================

-- Prevent users from rating same nomination twice
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_nomination_rating'
    AND conrelid = 'ratings'::regclass
  ) THEN
    -- Check if constraint exists with different name
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE contype = 'u'
      AND conrelid = 'ratings'::regclass
      AND array_length(conkey, 1) = 2
      AND conkey @> ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'ratings'::regclass AND attname = 'nomination_id')]
      AND conkey @> ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'ratings'::regclass AND attname = 'user_id')]
    ) THEN
      ALTER TABLE ratings
      ADD CONSTRAINT unique_user_nomination_rating
      UNIQUE(nomination_id, user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. ADD COMPREHENSIVE INDEXES
-- ============================================

-- Festival indexes
CREATE INDEX IF NOT EXISTS idx_festivals_club_status ON festivals(club_id, status);
CREATE INDEX IF NOT EXISTS idx_festivals_dates ON festivals(rating_deadline, results_date);
CREATE INDEX IF NOT EXISTS idx_festivals_season ON festivals(season_id);
CREATE INDEX IF NOT EXISTS idx_festivals_phase ON festivals(phase);

-- Nominations indexes
CREATE INDEX IF NOT EXISTS idx_nominations_festival_user ON nominations(festival_id, user_id);
CREATE INDEX IF NOT EXISTS idx_nominations_festival ON nominations(festival_id);
CREATE INDEX IF NOT EXISTS idx_nominations_user ON nominations(user_id);
CREATE INDEX IF NOT EXISTS idx_nominations_tmdb ON nominations(tmdb_id);

-- Ratings indexes
CREATE INDEX IF NOT EXISTS idx_ratings_user_festival ON ratings(user_id, festival_id);
CREATE INDEX IF NOT EXISTS idx_ratings_nomination ON ratings(nomination_id);
CREATE INDEX IF NOT EXISTS idx_ratings_festival ON ratings(festival_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created ON ratings(created_at DESC);

-- Club members indexes
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club_role ON club_members(club_id, role);

-- Other table indexes
CREATE INDEX IF NOT EXISTS idx_theme_pool_club ON theme_pool(club_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_club ON activity_log(club_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);

-- ============================================
-- 4. FIX CASCADE DELETES (Preserve SET NULL for Users)
-- ============================================

-- Festival relationships: CASCADE (delete child records when festival deleted)
-- Note: We preserve SET NULL for user_id relationships to maintain historical data

-- Nominations: CASCADE on festival_id (but keep SET NULL on user_id)
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Drop existing constraint if it exists
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'nominations'::regclass
  AND confrelid = 'festivals'::regclass
  AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'nominations'::regclass AND attname = 'festival_id')];
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE nominations DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;
  
  -- Add CASCADE constraint
  ALTER TABLE nominations 
  ADD CONSTRAINT nominations_festival_id_fkey 
  FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE;
END $$;

-- Ratings: CASCADE on festival_id and nomination_id (but keep SET NULL on user_id)
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Drop festival_id constraint
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'ratings'::regclass
  AND confrelid = 'festivals'::regclass
  AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'ratings'::regclass AND attname = 'festival_id')];
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE ratings DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;
  
  ALTER TABLE ratings 
  ADD CONSTRAINT ratings_festival_id_fkey 
  FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE;
  
  -- Drop nomination_id constraint
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'ratings'::regclass
  AND confrelid = 'nominations'::regclass
  AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'ratings'::regclass AND attname = 'nomination_id')];
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE ratings DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;
  
  ALTER TABLE ratings
  ADD CONSTRAINT ratings_nomination_id_fkey
  FOREIGN KEY (nomination_id) REFERENCES nominations(id) ON DELETE CASCADE;
END $$;

-- Festival results: CASCADE on festival_id
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'festival_results'::regclass
  AND confrelid = 'festivals'::regclass
  AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'festival_results'::regclass AND attname = 'festival_id')];
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE festival_results DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;
  
  ALTER TABLE festival_results 
  ADD CONSTRAINT festival_results_festival_id_fkey 
  FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE;
END $$;

-- Theme votes: Already has CASCADE (verify)
-- nomination_guesses: CASCADE on festival_id
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'nomination_guesses'::regclass
  AND confrelid = 'festivals'::regclass
  AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'nomination_guesses'::regclass AND attname = 'festival_id')];
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE nomination_guesses DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;
  
  ALTER TABLE nomination_guesses 
  ADD CONSTRAINT nomination_guesses_festival_id_fkey 
  FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE;
END $$;

-- Stack rankings: CASCADE on festival_id
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'stack_rankings'::regclass
  AND confrelid = 'festivals'::regclass
  AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'stack_rankings'::regclass AND attname = 'festival_id')];
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE stack_rankings DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;
  
  ALTER TABLE stack_rankings 
  ADD CONSTRAINT stack_rankings_festival_id_fkey 
  FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE;
END $$;

-- ============================================
-- 5. ADD SOFT DELETE COLUMNS
-- ============================================

ALTER TABLE festivals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE nominations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- Note: clubs already has 'archived' boolean, we'll keep both patterns

-- Create partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_festivals_active ON festivals(club_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nominations_active ON nominations(festival_id) WHERE deleted_at IS NULL;
-- Note: clubs uses 'archived' boolean, not deleted_at
CREATE INDEX IF NOT EXISTS idx_clubs_active ON clubs(privacy) WHERE archived = false;

-- ============================================
-- 6. CREATE NORMALIZED ANALYTICS TABLES
-- ============================================

-- Festival standings for fast leaderboard queries
CREATE TABLE IF NOT EXISTS festival_standings (
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    points DECIMAL(5,1) NOT NULL,
    nominations_count INTEGER DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,1),
    guessing_accuracy DECIMAL(3,1),
    guessing_points DECIMAL(5,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (festival_id, user_id)
);

-- Indexes for festival standings
CREATE INDEX IF NOT EXISTS idx_standings_user_points ON festival_standings(user_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_standings_festival_rank ON festival_standings(festival_id, rank);
CREATE INDEX IF NOT EXISTS idx_standings_points ON festival_standings(points DESC);

-- Global user statistics for profile pages and leaderboards
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_points DECIMAL(10,1) DEFAULT 0,
    festivals_played INTEGER DEFAULT 0,
    festivals_won INTEGER DEFAULT 0,
    nominations_total INTEGER DEFAULT 0,
    ratings_total INTEGER DEFAULT 0,
    average_rating_given DECIMAL(3,1),
    highest_rated_movie_id INTEGER,
    lowest_rated_movie_id INTEGER,
    last_active TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user stats
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON user_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_active ON user_stats(last_active DESC) WHERE last_active IS NOT NULL;

-- Club statistics for club pages
CREATE TABLE IF NOT EXISTS club_stats (
    club_id UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
    members_count INTEGER DEFAULT 0,
    festivals_count INTEGER DEFAULT 0,
    completed_festivals INTEGER DEFAULT 0,
    total_movies_watched INTEGER DEFAULT 0,
    average_festival_rating DECIMAL(3,1),
    most_nominated_movie_id INTEGER,
    highest_rated_movie_id INTEGER,
    last_activity TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_stats_activity ON club_stats(last_activity DESC);

-- ============================================
-- 7. CREATE TRIGGER FUNCTION FOR STATS UPDATES
-- ============================================

-- Function to update user stats after festival completion
-- FIX: Accumulate points instead of replacing
CREATE OR REPLACE FUNCTION update_user_stats_from_standings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user stats
    INSERT INTO user_stats (
        user_id,
        total_points,
        festivals_played,
        festivals_won,
        last_active
    )
    VALUES (
        NEW.user_id,
        NEW.points,
        1,
        CASE WHEN NEW.rank = 1 THEN 1 ELSE 0 END,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = user_stats.total_points + NEW.points,  -- FIX: Accumulate, don't replace
        festivals_played = user_stats.festivals_played + 1,
        festivals_won = user_stats.festivals_won + CASE WHEN NEW.rank = 1 THEN 1 ELSE 0 END,
        last_active = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating stats
DROP TRIGGER IF EXISTS update_user_stats_trigger ON festival_standings;
CREATE TRIGGER update_user_stats_trigger
AFTER INSERT ON festival_standings
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_from_standings();

-- ============================================
-- 8. CREATE RLS POLICIES FOR NEW TABLES
-- ============================================

ALTER TABLE festival_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_stats ENABLE ROW LEVEL SECURITY;

-- Festival standings: viewable if you can view the festival
CREATE POLICY "Festival standings viewable by festival members"
ON festival_standings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM festivals f
        JOIN club_members cm ON f.club_id = cm.club_id
        WHERE f.id = festival_standings.festival_id
        AND cm.user_id = auth.uid()
    )
);

-- User stats: public for leaderboards
CREATE POLICY "User stats are public"
ON user_stats FOR SELECT
USING (true);

-- Club stats: viewable if club is public or user is member
CREATE POLICY "Club stats viewable by public or members"
ON club_stats FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM clubs c
        WHERE c.id = club_stats.club_id
        AND (
            c.privacy = 'public_open' 
            OR EXISTS (
                SELECT 1 FROM club_members cm
                WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
            )
        )
    )
);

COMMIT;

