-- Migration: Create User Rubrics System
-- Description: Creates tables for personal rubric library and festival rubric locking

-- =============================================================================
-- 0. Create update_updated_at_column function if it doesn't exist
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. Create user_rubrics table - Personal rubric library
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- categories structure: [{id, name, weight, required, order}]
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE user_rubrics IS 'Personal rating rubric library for users';
COMMENT ON COLUMN user_rubrics.categories IS 'Array of category objects: {id, name, weight, required, order}';
COMMENT ON COLUMN user_rubrics.is_default IS 'Whether this is the user''s default rubric';

-- Create indexes
CREATE INDEX idx_user_rubrics_user_id ON user_rubrics(user_id);
CREATE INDEX idx_user_rubrics_is_default ON user_rubrics(user_id, is_default) WHERE is_default = true;

-- Ensure only one default per user (partial unique index)
CREATE UNIQUE INDEX idx_user_rubrics_single_default 
  ON user_rubrics(user_id) 
  WHERE is_default = true;

-- Add updated_at trigger
CREATE TRIGGER set_user_rubrics_updated_at
  BEFORE UPDATE ON user_rubrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. Create festival_rubric_locks table - Lock rubric choice per festival
-- =============================================================================

CREATE TABLE IF NOT EXISTS festival_rubric_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES user_rubrics(id) ON DELETE SET NULL,
  -- rubric_snapshot stores the rubric at lock time (in case rubric is edited/deleted later)
  rubric_snapshot JSONB,
  -- use_club_rubric: true if user chose to use club's rubric instead of personal
  use_club_rubric BOOLEAN NOT NULL DEFAULT false,
  -- opted_out: true if user chose simple single-score rating
  opted_out BOOLEAN NOT NULL DEFAULT false,
  -- dont_ask_again: true if user checked "don't show again"
  dont_ask_again BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one lock per user per festival
  UNIQUE(festival_id, user_id)
);

-- Add comments
COMMENT ON TABLE festival_rubric_locks IS 'Locks a user''s rubric choice for a specific festival';
COMMENT ON COLUMN festival_rubric_locks.rubric_snapshot IS 'Snapshot of rubric categories at lock time';
COMMENT ON COLUMN festival_rubric_locks.use_club_rubric IS 'True if user chose to use club''s rubric';
COMMENT ON COLUMN festival_rubric_locks.opted_out IS 'True if user chose simple rating (no rubric)';
COMMENT ON COLUMN festival_rubric_locks.dont_ask_again IS 'True if user checked "don''t show again" - will auto opt-out';

-- Create indexes
CREATE INDEX idx_festival_rubric_locks_festival ON festival_rubric_locks(festival_id);
CREATE INDEX idx_festival_rubric_locks_user ON festival_rubric_locks(user_id);
CREATE INDEX idx_festival_rubric_locks_rubric ON festival_rubric_locks(rubric_id) WHERE rubric_id IS NOT NULL;

-- =============================================================================
-- 3. RLS Policies for user_rubrics
-- =============================================================================

ALTER TABLE user_rubrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own rubrics
CREATE POLICY "Users can view own rubrics"
  ON user_rubrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own rubrics
CREATE POLICY "Users can insert own rubrics"
  ON user_rubrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own rubrics
CREATE POLICY "Users can update own rubrics"
  ON user_rubrics FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own rubrics
CREATE POLICY "Users can delete own rubrics"
  ON user_rubrics FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- 4. RLS Policies for festival_rubric_locks
-- =============================================================================

ALTER TABLE festival_rubric_locks ENABLE ROW LEVEL SECURITY;

-- Users can view their own locks
CREATE POLICY "Users can view own rubric locks"
  ON festival_rubric_locks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own locks
CREATE POLICY "Users can insert own rubric locks"
  ON festival_rubric_locks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own locks (only before they've rated)
CREATE POLICY "Users can update own rubric locks"
  ON festival_rubric_locks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 5. Function to ensure only one default rubric per user
-- =============================================================================

CREATE OR REPLACE FUNCTION ensure_single_default_rubric()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this rubric as default, unset all others for this user
  IF NEW.is_default = true THEN
    UPDATE user_rubrics
    SET is_default = false, updated_at = now()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_single_default_rubric_trigger
  AFTER INSERT OR UPDATE OF is_default ON user_rubrics
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_rubric();

-- =============================================================================
-- 6. Function to snapshot rubric when locking
-- =============================================================================

CREATE OR REPLACE FUNCTION snapshot_rubric_on_lock()
RETURNS TRIGGER AS $$
DECLARE
  rubric_data JSONB;
BEGIN
  -- If using a personal rubric, snapshot it
  IF NEW.rubric_id IS NOT NULL AND NEW.rubric_snapshot IS NULL THEN
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'categories', categories
    ) INTO rubric_data
    FROM user_rubrics
    WHERE id = NEW.rubric_id;
    
    NEW.rubric_snapshot = rubric_data;
  END IF;
  
  -- If using club rubric, snapshot the club's rubric
  IF NEW.use_club_rubric = true AND NEW.rubric_snapshot IS NULL THEN
    SELECT jsonb_build_object(
      'name', 'Club Rubric',
      'categories', COALESCE((c.settings->>'rating_rubrics')::jsonb, '[]'::jsonb)
    ) INTO rubric_data
    FROM festivals f
    JOIN clubs c ON c.id = f.club_id
    WHERE f.id = NEW.festival_id;
    
    NEW.rubric_snapshot = rubric_data;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER snapshot_rubric_on_lock_trigger
  BEFORE INSERT ON festival_rubric_locks
  FOR EACH ROW
  EXECUTE FUNCTION snapshot_rubric_on_lock();

