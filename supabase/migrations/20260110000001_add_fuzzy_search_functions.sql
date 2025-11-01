-- ============================================
-- Add fuzzy search functions using pg_trgm
-- ============================================
-- These functions provide typo-tolerant search using PostgreSQL's 
-- trigram similarity matching.

-- Set the similarity threshold (0.3 is default, lower = more matches)
SELECT set_limit(0.2);

-- ============================================
-- Fuzzy search for festivals by theme
-- ============================================
CREATE OR REPLACE FUNCTION fuzzy_search_festivals(
  search_query TEXT,
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  theme TEXT,
  slug TEXT,
  club_id UUID,
  club_name TEXT,
  club_slug TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.theme,
    f.slug,
    f.club_id,
    c.name AS club_name,
    c.slug AS club_slug,
    similarity(LOWER(f.theme), LOWER(search_query)) AS similarity_score
  FROM festivals f
  LEFT JOIN clubs c ON c.id = f.club_id
  WHERE 
    -- Exact/partial match with ILIKE
    f.theme ILIKE '%' || search_query || '%'
    -- OR trigram similarity match for typos
    OR LOWER(f.theme) % LOWER(search_query)
  ORDER BY 
    -- Prioritize exact matches
    CASE WHEN f.theme ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    -- Then by similarity score
    similarity(LOWER(f.theme), LOWER(search_query)) DESC
  LIMIT result_limit;
END;
$$;

-- ============================================
-- Fuzzy search for discussion threads
-- ============================================
CREATE OR REPLACE FUNCTION fuzzy_search_discussions(
  search_query TEXT,
  user_club_ids UUID[],
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  club_id UUID,
  club_name TEXT,
  club_slug TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.slug,
    dt.title,
    dt.club_id,
    c.name AS club_name,
    c.slug AS club_slug,
    GREATEST(
      similarity(LOWER(dt.title), LOWER(search_query)),
      similarity(LOWER(COALESCE(dt.content, '')), LOWER(search_query))
    ) AS similarity_score
  FROM discussion_threads dt
  LEFT JOIN clubs c ON c.id = dt.club_id
  WHERE 
    dt.club_id = ANY(user_club_ids)
    AND (
      -- Exact/partial match with ILIKE
      dt.title ILIKE '%' || search_query || '%'
      OR dt.content ILIKE '%' || search_query || '%'
      -- OR trigram similarity match for typos
      OR LOWER(dt.title) % LOWER(search_query)
      OR LOWER(COALESCE(dt.content, '')) % LOWER(search_query)
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE 
      WHEN dt.title ILIKE '%' || search_query || '%' THEN 0 
      WHEN dt.content ILIKE '%' || search_query || '%' THEN 1 
      ELSE 2 
    END,
    -- Then by similarity score
    similarity_score DESC
  LIMIT result_limit;
END;
$$;

-- ============================================
-- Fuzzy search for club notes
-- ============================================
CREATE OR REPLACE FUNCTION fuzzy_search_club_notes(
  search_query TEXT,
  user_club_ids UUID[],
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  note TEXT,
  club_id UUID,
  club_name TEXT,
  tmdb_id INT,
  movie_title TEXT,
  movie_year INT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cn.id,
    cn.note,
    cn.club_id,
    c.name AS club_name,
    cn.tmdb_id,
    m.title AS movie_title,
    m.year AS movie_year,
    similarity(LOWER(cn.note), LOWER(search_query)) AS similarity_score
  FROM club_notes cn
  LEFT JOIN clubs c ON c.id = cn.club_id
  LEFT JOIN movies m ON m.tmdb_id = cn.tmdb_id
  WHERE 
    cn.club_id = ANY(user_club_ids)
    AND (
      -- Exact/partial match with ILIKE
      cn.note ILIKE '%' || search_query || '%'
      -- OR trigram similarity match for typos
      OR LOWER(cn.note) % LOWER(search_query)
    )
  ORDER BY 
    CASE WHEN cn.note ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    similarity_score DESC
  LIMIT result_limit;
END;
$$;

-- ============================================
-- Fuzzy search for private notes
-- ============================================
CREATE OR REPLACE FUNCTION fuzzy_search_private_notes(
  search_query TEXT,
  user_id_param UUID,
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  note TEXT,
  tmdb_id INT,
  movie_title TEXT,
  movie_year INT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pn.id,
    pn.note,
    pn.tmdb_id,
    m.title AS movie_title,
    m.year AS movie_year,
    similarity(LOWER(pn.note), LOWER(search_query)) AS similarity_score
  FROM private_notes pn
  LEFT JOIN movies m ON m.tmdb_id = pn.tmdb_id
  WHERE 
    pn.user_id = user_id_param
    AND (
      -- Exact/partial match with ILIKE
      pn.note ILIKE '%' || search_query || '%'
      -- OR trigram similarity match for typos
      OR LOWER(pn.note) % LOWER(search_query)
    )
  ORDER BY 
    CASE WHEN pn.note ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    similarity_score DESC
  LIMIT result_limit;
END;
$$;

-- ============================================
-- Fuzzy search for movies (local database fallback)
-- ============================================
CREATE OR REPLACE FUNCTION fuzzy_search_movies(
  search_query TEXT,
  result_limit INT DEFAULT 20
)
RETURNS TABLE (
  tmdb_id INT,
  title TEXT,
  year INT,
  poster_url TEXT,
  slug TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.tmdb_id,
    m.title,
    m.year,
    m.poster_url,
    m.slug,
    similarity(LOWER(m.title), LOWER(search_query)) AS similarity_score
  FROM movies m
  WHERE 
    -- Exact/partial match with ILIKE
    m.title ILIKE '%' || search_query || '%'
    -- OR trigram similarity match for typos
    OR LOWER(m.title) % LOWER(search_query)
  ORDER BY 
    CASE WHEN m.title ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    m.popularity_score DESC NULLS LAST,
    similarity_score DESC
  LIMIT result_limit;
END;
$$;

-- ============================================
-- Create GIN indexes for faster trigram matching
-- ============================================
-- These indexes speed up the % operator significantly

-- Index on festivals.theme
CREATE INDEX IF NOT EXISTS idx_festivals_theme_trgm 
ON festivals USING GIN (theme gin_trgm_ops);

-- Index on discussion_threads.title  
CREATE INDEX IF NOT EXISTS idx_discussion_threads_title_trgm 
ON discussion_threads USING GIN (title gin_trgm_ops);

-- Index on discussion_threads.content
CREATE INDEX IF NOT EXISTS idx_discussion_threads_content_trgm 
ON discussion_threads USING GIN (content gin_trgm_ops);

-- Index on club_notes.note
CREATE INDEX IF NOT EXISTS idx_club_notes_note_trgm 
ON club_notes USING GIN (note gin_trgm_ops);

-- Index on private_notes.note
CREATE INDEX IF NOT EXISTS idx_private_notes_note_trgm 
ON private_notes USING GIN (note gin_trgm_ops);

-- Index on movies.title
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm 
ON movies USING GIN (title gin_trgm_ops);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION fuzzy_search_festivals TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_search_discussions TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_search_club_notes TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_search_private_notes TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_search_movies TO authenticated;

