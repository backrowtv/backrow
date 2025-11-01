-- Migration: Fix user_badges to support site-wide badges (NULL club_id)
-- Issue #17: user_badges.club_id is NOT NULL but code expects NULL for site-wide badges

-- Step 1: Drop existing primary key constraint
ALTER TABLE user_badges DROP CONSTRAINT user_badges_pkey;

-- Step 2: Drop the foreign key constraint on club_id so we can make it nullable
ALTER TABLE user_badges DROP CONSTRAINT user_badges_club_id_fkey;

-- Step 3: Add a new id column as primary key
ALTER TABLE user_badges ADD COLUMN id uuid DEFAULT gen_random_uuid();

-- Step 4: Set id values for any existing rows
UPDATE user_badges SET id = gen_random_uuid() WHERE id IS NULL;

-- Step 5: Make id NOT NULL and set as primary key
ALTER TABLE user_badges ALTER COLUMN id SET NOT NULL;
ALTER TABLE user_badges ADD PRIMARY KEY (id);

-- Step 6: Make club_id nullable
ALTER TABLE user_badges ALTER COLUMN club_id DROP NOT NULL;

-- Step 7: Re-add foreign key constraint on club_id (now allowing NULL)
ALTER TABLE user_badges ADD CONSTRAINT user_badges_club_id_fkey
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;

-- Step 8: Add unique constraint to prevent duplicate badges per user/club combination
-- Using NULLS NOT DISTINCT so (user_id, badge_id, NULL) is treated as unique
ALTER TABLE user_badges ADD CONSTRAINT user_badges_user_badge_club_unique
  UNIQUE NULLS NOT DISTINCT (user_id, badge_id, club_id);

-- Step 9: Add index for common queries
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_club_id ON user_badges(club_id) WHERE club_id IS NOT NULL;

-- Step 10: Update RLS policies to handle NULL club_id for site badges
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view badges in their clubs" ON user_badges;
CREATE POLICY "Users can view badges in their clubs" ON user_badges
  FOR SELECT USING (
    club_id IS NULL  -- Site-wide badges are visible to owner
    OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = user_badges.club_id
      AND cm.user_id = (SELECT auth.uid())
    )
  );

-- Allow system to insert badges (for badge awarding)
DROP POLICY IF EXISTS "System can insert badges" ON user_badges;
CREATE POLICY "System can insert badges" ON user_badges
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Allow users to update their own badge progress
DROP POLICY IF EXISTS "Users can update their own badges" ON user_badges;
CREATE POLICY "Users can update their own badges" ON user_badges
  FOR UPDATE USING (user_id = (SELECT auth.uid()));
