-- Migration: Remove comment depth limit for Narwhal-style threading
-- Date: 2026-01-06
-- Purpose: Allow infinite comment nesting with visual depth handling in UI

BEGIN;

-- ============================================
-- 1. DROP THE DEPTH-CHECKING TRIGGER
-- ============================================

-- Drop the trigger that enforces depth limit on comment inserts
DROP TRIGGER IF EXISTS check_comment_depth_trigger ON discussion_comments;

-- ============================================
-- 2. DROP THE FUNCTION
-- ============================================

-- Drop the function that was checking depth >= 3
-- This was defined in:
-- - 20250126000000_create_discussion_system.sql (original)
-- - 20250603000000_fix_security_performance_advisors.sql (with search_path fix)
DROP FUNCTION IF EXISTS check_comment_depth();

-- ============================================
-- 3. ADD INDEX FOR DEEP THREAD QUERY PERFORMANCE
-- ============================================

-- Composite index helps with recursive queries for deep comment chains
CREATE INDEX IF NOT EXISTS idx_discussion_comments_thread_parent
ON discussion_comments(thread_id, parent_id);

COMMIT;
