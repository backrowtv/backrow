-- Migration: Create discussion system tables
-- Created: 2025-01-26
-- Purpose: Implement discussion threads, comments, votes, and unlocks for club discussions

BEGIN;

-- ============================================
-- 1. DISCUSSION THREADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS discussion_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  
  -- Thread type and linking
  thread_type TEXT NOT NULL CHECK (thread_type IN ('movie', 'person', 'festival', 'custom')),
  tmdb_id INTEGER REFERENCES movies(tmdb_id), -- For movie threads
  person_name TEXT, -- For person threads (actor/director/composer)
  person_type TEXT CHECK (person_type IS NULL OR person_type IN ('actor', 'director', 'composer')), -- For person threads
  festival_id UUID REFERENCES festivals(id), -- For festival threads
  
  -- Thread metadata
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_spoiler BOOLEAN DEFAULT FALSE,
  
  -- Auto-creation flags
  auto_created BOOLEAN DEFAULT FALSE,
  unlock_on_watch BOOLEAN DEFAULT FALSE, -- For movie threads
  
  -- Engagement metrics (only upvotes per Q8 decision)
  upvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for discussion_threads
CREATE INDEX IF NOT EXISTS idx_discussion_threads_club ON discussion_threads(club_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_type ON discussion_threads(thread_type);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_tmdb ON discussion_threads(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_threads_festival ON discussion_threads(festival_id) WHERE festival_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_threads_pinned ON discussion_threads(club_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_discussion_threads_created ON discussion_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_upvotes ON discussion_threads(upvotes DESC);

-- ============================================
-- 2. DISCUSSION COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS discussion_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE, -- For threading
  
  content TEXT NOT NULL,
  is_spoiler BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  
  -- Engagement metrics (only upvotes per Q8 decision)
  upvotes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for discussion_comments
CREATE INDEX IF NOT EXISTS idx_discussion_comments_thread ON discussion_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_parent ON discussion_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_comments_author ON discussion_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_created ON discussion_comments(created_at DESC);

-- ============================================
-- 3. DISCUSSION VOTES TABLE (UPVOTES ONLY)
-- ============================================

CREATE TABLE IF NOT EXISTS discussion_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT vote_target CHECK (
    (thread_id IS NOT NULL AND comment_id IS NULL) OR
    (thread_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT unique_user_vote UNIQUE (user_id, thread_id, comment_id)
);

-- Indexes for discussion_votes
CREATE INDEX IF NOT EXISTS idx_discussion_votes_thread ON discussion_votes(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_votes_comment ON discussion_votes(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_votes_user ON discussion_votes(user_id);

-- ============================================
-- 4. DISCUSSION THREAD UNLOCKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS discussion_thread_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_thread_unlock UNIQUE (thread_id, user_id)
);

-- Indexes for discussion_thread_unlocks
CREATE INDEX IF NOT EXISTS idx_discussion_unlocks_thread ON discussion_thread_unlocks(thread_id);
CREATE INDEX IF NOT EXISTS idx_discussion_unlocks_user ON discussion_thread_unlocks(user_id);

-- ============================================
-- 5. FUNCTION: Check comment depth (max 3 levels)
-- ============================================

CREATE OR REPLACE FUNCTION check_comment_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth INTEGER;
BEGIN
  -- If no parent, depth is 0 (top-level comment)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate depth by counting parent chain up to root
  WITH RECURSIVE comment_chain AS (
    -- Start with the parent comment
    SELECT id, parent_id, 1 AS level
    FROM discussion_comments
    WHERE id = NEW.parent_id
    
    UNION ALL
    
    -- Recursively find parent's parent
    SELECT c.id, c.parent_id, cc.level + 1
    FROM discussion_comments c
    JOIN comment_chain cc ON c.id = cc.parent_id
    WHERE c.parent_id IS NOT NULL
  )
  SELECT MAX(level) INTO depth FROM comment_chain;
  
  -- If depth is NULL, parent doesn't exist (shouldn't happen due to FK)
  IF depth IS NULL THEN
    depth := 1;
  END IF;
  
  -- Check if adding this comment would exceed max depth (3 levels = 0, 1, 2, 3)
  -- depth already includes the parent, so we check if depth >= 3
  IF depth >= 3 THEN
    RAISE EXCEPTION 'Maximum comment depth (3 levels) exceeded';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check comment depth before insert
CREATE TRIGGER check_comment_depth_trigger
BEFORE INSERT ON discussion_comments
FOR EACH ROW
WHEN (NEW.parent_id IS NOT NULL)
EXECUTE FUNCTION check_comment_depth();

-- ============================================
-- 6. FUNCTION: Update thread comment count
-- ============================================

CREATE OR REPLACE FUNCTION update_thread_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussion_threads
    SET comment_count = comment_count + 1
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussion_threads
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment count
CREATE TRIGGER update_thread_comment_count_trigger
AFTER INSERT OR DELETE ON discussion_comments
FOR EACH ROW
EXECUTE FUNCTION update_thread_comment_count();

-- ============================================
-- 7. FUNCTION: Update thread upvote count
-- ============================================

CREATE OR REPLACE FUNCTION update_thread_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.thread_id IS NOT NULL THEN
      UPDATE discussion_threads
      SET upvotes = upvotes + 1
      WHERE id = NEW.thread_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.thread_id IS NOT NULL THEN
      UPDATE discussion_threads
      SET upvotes = GREATEST(upvotes - 1, 0)
      WHERE id = OLD.thread_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread upvote count
CREATE TRIGGER update_thread_upvote_count_trigger
AFTER INSERT OR DELETE ON discussion_votes
FOR EACH ROW
EXECUTE FUNCTION update_thread_upvote_count();

-- ============================================
-- 8. FUNCTION: Update comment upvote count
-- ============================================

CREATE OR REPLACE FUNCTION update_comment_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE discussion_comments
      SET upvotes = upvotes + 1
      WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE discussion_comments
      SET upvotes = GREATEST(upvotes - 1, 0)
      WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment upvote count
CREATE TRIGGER update_comment_upvote_count_trigger
AFTER INSERT OR DELETE ON discussion_votes
FOR EACH ROW
EXECUTE FUNCTION update_comment_upvote_count();

-- ============================================
-- 9. FUNCTION: Auto-create festival thread
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_festival_thread()
RETURNS TRIGGER AS $$
DECLARE
  club_settings JSONB;
  auto_create_enabled BOOLEAN;
BEGIN
  -- Check if festival just entered 'nominating' phase
  IF NEW.status = 'nominating' AND (OLD.status IS NULL OR OLD.status != 'nominating') THEN
    -- Get club settings
    SELECT settings INTO club_settings
    FROM clubs
    WHERE id = NEW.club_id;
    
    -- Check if auto-creation is enabled (default: true)
    auto_create_enabled := COALESCE((club_settings->>'auto_create_festival_threads')::boolean, true);
    
    IF auto_create_enabled THEN
      -- Create festival discussion thread
      INSERT INTO discussion_threads (
        club_id,
        title,
        content,
        author_id,
        thread_type,
        festival_id,
        auto_created
      )
      VALUES (
        NEW.club_id,
        'Discussion: ' || NEW.name,
        'Discuss ' || NEW.name || ' here!',
        (SELECT producer_id FROM clubs WHERE id = NEW.club_id),
        'festival',
        NEW.id,
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create festival thread
CREATE TRIGGER auto_create_festival_thread_trigger
AFTER INSERT OR UPDATE ON festivals
FOR EACH ROW
EXECUTE FUNCTION auto_create_festival_thread();

-- ============================================
-- 10. FUNCTION: Auto-create movie thread on watch phase
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_movie_thread()
RETURNS TRIGGER AS $$
DECLARE
  club_settings JSONB;
  auto_create_enabled BOOLEAN;
  festival_status TEXT;
BEGIN
  -- Check if nomination just entered 'watch_rate' phase
  IF NEW.status = 'watch_rate' AND (OLD.status IS NULL OR OLD.status != 'watch_rate') THEN
    -- Get festival status
    SELECT status INTO festival_status
    FROM festivals
    WHERE id = NEW.festival_id;
    
    -- Only create if festival is in watch/rate phase
    IF festival_status = 'watch_rate' THEN
      -- Get club settings
      SELECT settings INTO club_settings
      FROM clubs
      WHERE id = (SELECT club_id FROM festivals WHERE id = NEW.festival_id);
      
      -- Check if auto-creation is enabled (default: true)
      auto_create_enabled := COALESCE((club_settings->>'auto_create_movie_threads')::boolean, true);
      
      IF auto_create_enabled THEN
        -- Get movie title from movies table
        INSERT INTO discussion_threads (
          club_id,
          title,
          content,
          author_id,
          thread_type,
          tmdb_id,
          festival_id,
          auto_created,
          unlock_on_watch
        )
        SELECT
          f.club_id,
          'Discussion: ' || COALESCE(m.title, 'Movie #' || NEW.tmdb_id::text),
          'Discuss this movie here! (Unlocks when you mark as watched)',
          f.producer_id,
          'movie',
          NEW.tmdb_id,
          NEW.festival_id,
          true,
          true
        FROM festivals f
        LEFT JOIN movies m ON m.tmdb_id = NEW.tmdb_id
        WHERE f.id = NEW.festival_id
        ON CONFLICT DO NOTHING; -- Prevent duplicate threads
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create movie thread
CREATE TRIGGER auto_create_movie_thread_trigger
AFTER INSERT OR UPDATE ON nominations
FOR EACH ROW
EXECUTE FUNCTION auto_create_movie_thread();

-- ============================================
-- 11. FUNCTION: Auto-unlock movie thread when watched
-- ============================================

CREATE OR REPLACE FUNCTION auto_unlock_movie_thread()
RETURNS TRIGGER AS $$
BEGIN
  -- When user marks a movie as watched, unlock related threads
  IF TG_OP = 'INSERT' THEN
    INSERT INTO discussion_thread_unlocks (thread_id, user_id)
    SELECT dt.id, NEW.user_id
    FROM discussion_threads dt
    WHERE dt.tmdb_id = NEW.tmdb_id
      AND dt.thread_type = 'movie'
      AND dt.unlock_on_watch = true
      AND NOT EXISTS (
        SELECT 1 FROM discussion_thread_unlocks dtu
        WHERE dtu.thread_id = dt.id AND dtu.user_id = NEW.user_id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-unlock movie thread
CREATE TRIGGER auto_unlock_movie_thread_trigger
AFTER INSERT ON watch_history
FOR EACH ROW
EXECUTE FUNCTION auto_unlock_movie_thread();

-- ============================================
-- 12. RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_thread_unlocks ENABLE ROW LEVEL SECURITY;

-- Discussion Threads: View if member of club
CREATE POLICY "Users can view threads in clubs they're members of"
ON discussion_threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = discussion_threads.club_id
    AND user_id = auth.uid()
  )
);

-- Discussion Threads: Create if member of club
CREATE POLICY "Users can create threads in clubs they're members of"
ON discussion_threads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = discussion_threads.club_id
    AND user_id = auth.uid()
  )
  AND author_id = auth.uid()
);

-- Discussion Threads: Update own threads or if admin
CREATE POLICY "Users can update own threads or admins can update any"
ON discussion_threads
FOR UPDATE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = discussion_threads.club_id
    AND user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Discussion Threads: Delete own threads or if admin
CREATE POLICY "Users can delete own threads or admins can delete any"
ON discussion_threads
FOR DELETE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = discussion_threads.club_id
    AND user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Discussion Comments: View if member of club
CREATE POLICY "Users can view comments in clubs they're members of"
ON discussion_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_comments.thread_id
    AND cm.user_id = auth.uid()
  )
);

-- Discussion Comments: Create if member of club and thread not locked
CREATE POLICY "Users can create comments in clubs they're members of"
ON discussion_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_comments.thread_id
    AND cm.user_id = auth.uid()
    AND dt.is_locked = false
  )
  AND author_id = auth.uid()
);

-- Discussion Comments: Update own comments
CREATE POLICY "Users can update own comments"
ON discussion_comments
FOR UPDATE
USING (author_id = auth.uid());

-- Discussion Comments: Delete own comments or if admin
CREATE POLICY "Users can delete own comments or admins can delete any"
ON discussion_comments
FOR DELETE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM discussion_threads dt
    JOIN club_members cm ON cm.club_id = dt.club_id
    WHERE dt.id = discussion_comments.thread_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- Discussion Votes: View all votes
CREATE POLICY "Users can view votes"
ON discussion_votes
FOR SELECT
USING (true);

-- Discussion Votes: Create own votes
CREATE POLICY "Users can create own votes"
ON discussion_votes
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Discussion Votes: Delete own votes
CREATE POLICY "Users can delete own votes"
ON discussion_votes
FOR DELETE
USING (user_id = auth.uid());

-- Discussion Thread Unlocks: View own unlocks
CREATE POLICY "Users can view own unlocks"
ON discussion_thread_unlocks
FOR SELECT
USING (user_id = auth.uid());

-- Discussion Thread Unlocks: Create own unlocks (via trigger)
CREATE POLICY "Users can create own unlocks"
ON discussion_thread_unlocks
FOR INSERT
WITH CHECK (user_id = auth.uid());

COMMIT;

