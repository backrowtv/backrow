-- Migration: Create user_blocks and user_reports tables
-- Description: User-level blocking and reporting system for privacy features

-- ============================================
-- USER BLOCKS TABLE
-- ============================================
-- User-level blocking (separate from club-level blocked_users)

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate blocks
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id),
  -- Prevent self-blocking
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_id != blocked_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- RLS for user_blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks (users they've blocked)
CREATE POLICY "user_blocks_select_own" ON user_blocks
  FOR SELECT USING (blocker_id = auth.uid());

-- Users can create their own blocks
CREATE POLICY "user_blocks_insert_own" ON user_blocks
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

-- Users can delete their own blocks (unblock)
CREATE POLICY "user_blocks_delete_own" ON user_blocks
  FOR DELETE USING (blocker_id = auth.uid());

-- ============================================
-- USER REPORTS TABLE
-- ============================================
-- For reporting users to admins

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-reporting
  CONSTRAINT user_reports_no_self_report CHECK (reporter_id != reported_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);

-- RLS for user_reports
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports (reports they've made)
CREATE POLICY "user_reports_select_own" ON user_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Users can create reports
CREATE POLICY "user_reports_insert_own" ON user_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Note: Admins would need a separate policy or service role to view all reports
-- This could be added later with an admin role check

-- ============================================
-- HELPER FUNCTION: Check if user is blocked
-- ============================================

CREATE OR REPLACE FUNCTION is_user_blocked(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user has blocked the target user
  -- OR if the target user has blocked the current user
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = target_user_id)
       OR (blocker_id = target_user_id AND blocked_id = auth.uid())
  );
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_blocks IS 'User-level blocking - allows users to block other users across the platform';
COMMENT ON TABLE user_reports IS 'User reports for moderation - users can report other users for review';
COMMENT ON FUNCTION is_user_blocked IS 'Check if there is a block relationship between current user and target user (either direction)';

