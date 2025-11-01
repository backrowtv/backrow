-- Migration: Create search analytics table
-- Created: 2025-01-26
-- Purpose: Track search queries for analytics

BEGIN;

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  filters JSONB, -- Stores the filter types used
  result_counts JSONB, -- Stores counts per result type
  total_results INTEGER NOT NULL,
  has_results BOOLEAN GENERATED ALWAYS AS (total_results > 0) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_has_results ON search_analytics(has_results, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query); -- Simple index for query searches

-- Enable pg_trgm extension for fuzzy search on queries (if available)
-- Note: This may require superuser privileges. If not available, the simple index above will suffice.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  -- Create GIN index if extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_search_analytics_query_gin ON search_analytics USING GIN(query gin_trgm_ops);
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Extension creation failed, continue without it
    NULL;
END $$;

-- RLS Policies
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Everyone can insert analytics (anonymous tracking allowed)
CREATE POLICY "Anyone can insert search analytics"
ON search_analytics
FOR INSERT
WITH CHECK (true);

-- Users can view their own analytics, or all analytics if they're a producer/admin of any club
-- For now, allow users to view their own analytics only (privacy)
CREATE POLICY "Users can view own search analytics"
ON search_analytics
FOR SELECT
USING (
  user_id = auth.uid()
  OR user_id IS NULL -- Allow viewing anonymous analytics
);

COMMIT;

