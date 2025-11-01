-- Migration: Create discussion_thread_tags for multi-entity tagging system
-- Created: 2026-01-13
-- Purpose: Allow discussion threads to be tagged with multiple movies, people (actors/directors/composers), and festivals

BEGIN;

-- ============================================
-- 1. CREATE DISCUSSION_THREAD_TAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS discussion_thread_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('movie', 'actor', 'director', 'composer', 'festival')),
  
  -- Entity references (one will be set based on tag_type)
  tmdb_id INTEGER REFERENCES movies(tmdb_id) ON DELETE CASCADE,           -- For movie tags
  person_tmdb_id INTEGER REFERENCES persons(tmdb_id) ON DELETE CASCADE,   -- For actor/director/composer tags
  festival_id UUID REFERENCES festivals(id) ON DELETE CASCADE,            -- For festival tags
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one entity type is set per tag
  CONSTRAINT valid_tag_reference CHECK (
    (tag_type = 'movie' AND tmdb_id IS NOT NULL AND person_tmdb_id IS NULL AND festival_id IS NULL) OR
    (tag_type IN ('actor', 'director', 'composer') AND person_tmdb_id IS NOT NULL AND tmdb_id IS NULL AND festival_id IS NULL) OR
    (tag_type = 'festival' AND festival_id IS NOT NULL AND tmdb_id IS NULL AND person_tmdb_id IS NULL)
  ),
  
  -- Prevent duplicate tags on same thread
  CONSTRAINT unique_movie_tag UNIQUE (thread_id, tag_type, tmdb_id),
  CONSTRAINT unique_person_tag UNIQUE (thread_id, tag_type, person_tmdb_id),
  CONSTRAINT unique_festival_tag UNIQUE (thread_id, tag_type, festival_id)
);

-- Add comment for documentation
COMMENT ON TABLE discussion_thread_tags IS 'Junction table for many-to-many relationship between discussion threads and entities (movies, people, festivals)';
COMMENT ON COLUMN discussion_thread_tags.tag_type IS 'Type of tag: movie, actor, director, composer, or festival';

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_discussion_thread_tags_thread_id 
ON discussion_thread_tags(thread_id);

CREATE INDEX IF NOT EXISTS idx_discussion_thread_tags_tag_type 
ON discussion_thread_tags(tag_type);

CREATE INDEX IF NOT EXISTS idx_discussion_thread_tags_tmdb_id 
ON discussion_thread_tags(tmdb_id) 
WHERE tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discussion_thread_tags_person_tmdb_id 
ON discussion_thread_tags(person_tmdb_id) 
WHERE person_tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discussion_thread_tags_festival_id 
ON discussion_thread_tags(festival_id) 
WHERE festival_id IS NOT NULL;

-- Composite index for filtering threads by tag type
CREATE INDEX IF NOT EXISTS idx_discussion_thread_tags_thread_type 
ON discussion_thread_tags(thread_id, tag_type);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE discussion_thread_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tags follow the same access rules as threads

-- SELECT: Users can view tags for threads in clubs they're members of
CREATE POLICY "Users can view tags for threads in their clubs"
ON discussion_thread_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_thread_tags.thread_id
    AND cm.user_id = auth.uid()
  )
);

-- INSERT: Users can add tags to threads in clubs they're members of
CREATE POLICY "Users can add tags to threads in their clubs"
ON discussion_thread_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_thread_tags.thread_id
    AND cm.user_id = auth.uid()
  )
);

-- DELETE: Thread author or admin can remove tags
CREATE POLICY "Thread author or admin can remove tags"
ON discussion_thread_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM discussion_threads dt
    WHERE dt.id = discussion_thread_tags.thread_id
    AND (
      dt.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM club_members cm
        WHERE cm.club_id = dt.club_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
      )
    )
  )
);

-- ============================================
-- 4. MIGRATE EXISTING THREAD LINKS TO TAGS
-- ============================================

-- Migrate movie tags from existing threads
INSERT INTO discussion_thread_tags (thread_id, tag_type, tmdb_id)
SELECT id, 'movie', tmdb_id
FROM discussion_threads
WHERE tmdb_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate person tags from existing threads
-- Determine tag_type based on person_type column
INSERT INTO discussion_thread_tags (thread_id, tag_type, person_tmdb_id)
SELECT 
  dt.id,
  CASE 
    WHEN dt.person_type = 'actor' THEN 'actor'
    WHEN dt.person_type = 'director' THEN 'director'
    WHEN dt.person_type = 'composer' THEN 'composer'
    ELSE 'actor' -- Default to actor if person_type not set
  END,
  dt.person_tmdb_id
FROM discussion_threads dt
WHERE dt.person_tmdb_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate festival tags from existing threads
INSERT INTO discussion_thread_tags (thread_id, tag_type, festival_id)
SELECT id, 'festival', festival_id
FROM discussion_threads
WHERE festival_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. ADD COMMENTS FOR DEPRECATION NOTICE
-- ============================================

COMMENT ON COLUMN discussion_threads.tmdb_id IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';
COMMENT ON COLUMN discussion_threads.person_tmdb_id IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';
COMMENT ON COLUMN discussion_threads.person_name IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';
COMMENT ON COLUMN discussion_threads.person_type IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';
COMMENT ON COLUMN discussion_threads.festival_id IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';

COMMIT;

