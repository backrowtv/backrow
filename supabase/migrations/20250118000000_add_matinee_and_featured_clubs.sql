-- ============================================
-- BACKROW MATINEE & FEATURED CLUBS MIGRATION
-- ============================================
-- Purpose: Add tables for BackRow Matinee (Movie of the Week) and Featured Clubs
-- Date: 2025-01-18
-- 
-- This migration:
-- 1. Creates backrow_matinee table for storing current Movie of the Week
-- 2. Adds featured column to clubs table for featured club selection
-- 3. Creates indexes for performance
-- 4. Adds RLS policies
-- ============================================

BEGIN;

-- ============================================
-- 1. CREATE BACKROW MATINEE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS backrow_matinee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL REFERENCES movies(tmdb_id) ON DELETE CASCADE,
  curator_note TEXT,
  featured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active matinee lookup (filtering by expires_at done in queries)
CREATE INDEX IF NOT EXISTS idx_backrow_matinee_active 
  ON backrow_matinee(featured_at DESC);

-- Note: Only one active matinee should be set at a time
-- This is enforced at the application level, not database level
-- The application should expire old matinees before setting new ones

-- Index for tmdb_id lookups
CREATE INDEX IF NOT EXISTS idx_backrow_matinee_tmdb_id 
  ON backrow_matinee(tmdb_id);

-- ============================================
-- 2. ADD FEATURED COLUMN TO CLUBS TABLE
-- ============================================

ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- Index for featured clubs lookup (filtering by featured_until done in queries)
CREATE INDEX IF NOT EXISTS idx_clubs_featured 
  ON clubs(featured, featured_at DESC) 
  WHERE featured = TRUE;

-- ============================================
-- 3. CREATE FUNCTION TO UPDATE UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_backrow_matinee_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_backrow_matinee_updated_at
  BEFORE UPDATE ON backrow_matinee
  FOR EACH ROW
  EXECUTE FUNCTION update_backrow_matinee_updated_at();

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Enable RLS on backrow_matinee
ALTER TABLE backrow_matinee ENABLE ROW LEVEL SECURITY;

-- Everyone can read active matinee
CREATE POLICY "Anyone can view active matinee"
  ON backrow_matinee
  FOR SELECT
  USING (expires_at IS NULL OR expires_at > NOW());

-- Only admins can insert/update (will be handled via service role in actions)
-- For now, allow authenticated users to read all matinees
CREATE POLICY "Authenticated users can view all matinees"
  ON backrow_matinee
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 5. HELPER FUNCTION TO GET CURRENT MATINEE
-- ============================================

CREATE OR REPLACE FUNCTION get_current_matinee()
RETURNS TABLE (
  id UUID,
  tmdb_id INTEGER,
  curator_note TEXT,
  featured_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  movie_title TEXT,
  movie_poster_url TEXT,
  movie_year TEXT,
  movie_director TEXT,
  movie_genres TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.tmdb_id,
    m.curator_note,
    m.featured_at,
    m.expires_at,
    mov.title AS movie_title,
    mov.poster_url AS movie_poster_url,
    mov.year AS movie_year,
    mov.director AS movie_director,
    mov.genres AS movie_genres
  FROM backrow_matinee m
  JOIN movies mov ON m.tmdb_id = mov.tmdb_id
  WHERE m.expires_at IS NULL OR m.expires_at > NOW()
  ORDER BY m.featured_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. HELPER FUNCTION TO GET FEATURED CLUB
-- ============================================

CREATE OR REPLACE FUNCTION get_featured_club()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  picture_url TEXT,
  member_count BIGINT,
  avg_rating NUMERIC,
  festival_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.picture_url,
    COUNT(DISTINCT cm.user_id)::BIGINT AS member_count,
    COALESCE(
      (
        SELECT AVG(r.rating)
        FROM ratings r
        JOIN nominations n ON r.nomination_id = n.id
        JOIN festivals f ON n.festival_id = f.id
        WHERE f.club_id = c.id
        AND f.status = 'completed'
      ),
      0
    ) AS avg_rating,
    COUNT(DISTINCT f.id)::BIGINT AS festival_count
  FROM clubs c
  LEFT JOIN club_members cm ON c.id = cm.club_id
  LEFT JOIN festivals f ON c.id = f.club_id
  WHERE c.featured = TRUE
    AND (c.featured_until IS NULL OR c.featured_until > NOW())
    AND c.archived = FALSE
  GROUP BY c.id, c.name, c.description, c.picture_url
  ORDER BY c.featured_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

