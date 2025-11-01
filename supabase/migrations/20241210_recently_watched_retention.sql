-- ============================================================================
-- Recently Watched Retention Feature
-- Date: 2024-12-10
-- 
-- Purpose: Add support for configurable retention period for "Recently Watched"
-- section and manual hiding of completed movies from that section.
-- 
-- Movies are NOT deleted - they remain in watch history, activity feeds,
-- and club history. This only affects the "Recently Watched" UI display.
-- ============================================================================

-- Add completed_at timestamp to track when a movie was marked as completed
-- This is used to calculate whether movie is within retention period
ALTER TABLE public.nominations 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add hidden_from_history flag for manual removal from Recently Watched
-- When true, movie won't appear in Recently Watched regardless of time
ALTER TABLE public.nominations 
ADD COLUMN IF NOT EXISTS hidden_from_history BOOLEAN DEFAULT false;

-- Create index for efficient filtering of recently watched movies
CREATE INDEX IF NOT EXISTS idx_nominations_recently_watched 
ON public.nominations (festival_id, endless_status, completed_at, hidden_from_history)
WHERE endless_status = 'completed' AND deleted_at IS NULL;

-- ============================================================================
-- Backfill completed_at for existing completed movies
-- Use created_at as a reasonable approximation for when they were completed
-- ============================================================================
UPDATE public.nominations
SET completed_at = created_at
WHERE endless_status = 'completed' 
  AND completed_at IS NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Club settings for retention period will use the existing JSONB settings field:
-- settings.recently_watched_retention = { value: 7, unit: 'days' }
-- Default is 7 days if not set
-- ============================================================================

