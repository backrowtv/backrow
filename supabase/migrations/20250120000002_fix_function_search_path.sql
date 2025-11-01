-- ============================================
-- FIX FUNCTION SEARCH PATH WARNINGS
-- ============================================
-- Purpose: Set search_path for functions to prevent search_path injection attacks
-- Date: 2025-01-20
-- 
-- This migration fixes Security Advisor warnings by:
-- 1. Setting search_path on all functions that are missing it
-- 2. Using SECURITY DEFINER where appropriate
-- ============================================

BEGIN;

-- ============================================
-- 1. FIX update_user_stats_from_standings
-- ============================================

CREATE OR REPLACE FUNCTION update_user_stats_from_standings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        total_points = user_stats.total_points + NEW.points,  -- Accumulate, don't replace
        festivals_played = user_stats.festivals_played + 1,
        festivals_won = user_stats.festivals_won + CASE WHEN NEW.rank = 1 THEN 1 ELSE 0 END,
        last_active = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- ============================================
-- 2. FIX update_backrow_matinee_updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_backrow_matinee_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. FIX get_current_matinee
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================
-- 4. FIX get_featured_club
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMIT;

-- ============================================
-- NOTES
-- ============================================
-- The remaining warnings are:
-- 1. Extension in Public (pg_trgm) - This is a common extension and typically safe
--    to leave in public schema for development. Can be moved to extensions schema
--    if needed for production.
--
-- 2. Leaked Password Protection Disabled - This is an Auth setting that should
--    be enabled in production. Go to Authentication > Settings > Password Protection
--    to enable it.

