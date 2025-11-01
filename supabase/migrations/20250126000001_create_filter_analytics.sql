-- Migration: Create filter analytics table
-- Created: 2025-01-26
-- Purpose: Track discover filter usage for analytics

BEGIN;

-- Filter analytics table
CREATE TABLE IF NOT EXISTS filter_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  filter_combination JSONB NOT NULL, -- Stores the filter state
  result_count INTEGER NOT NULL,
  has_results BOOLEAN GENERATED ALWAYS AS (result_count > 0) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_filter_analytics_user ON filter_analytics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_filter_analytics_created ON filter_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filter_analytics_has_results ON filter_analytics(has_results, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filter_analytics_combination ON filter_analytics USING GIN(filter_combination);

-- RLS Policies
ALTER TABLE filter_analytics ENABLE ROW LEVEL SECURITY;

-- Everyone can insert analytics (anonymous tracking allowed)
CREATE POLICY "Anyone can insert filter analytics"
ON filter_analytics
FOR INSERT
WITH CHECK (true);

-- Users can view their own analytics, or all analytics if they're a producer/admin of any club
-- For now, allow users to view their own analytics only (privacy)
CREATE POLICY "Users can view own filter analytics"
ON filter_analytics
FOR SELECT
USING (
  user_id = auth.uid()
  OR user_id IS NULL -- Allow viewing anonymous analytics
);

COMMIT;

