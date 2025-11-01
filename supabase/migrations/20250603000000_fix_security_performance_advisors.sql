-- Migration: Fix Security and Performance Advisors
-- Date: 2025-06-03
-- Fixes:
--   - 16 functions with mutable search_path (SECURITY)
--   - 8 unindexed foreign keys (PERFORMANCE)
--   - 67 RLS policies re-evaluating auth functions per row (PERFORMANCE)
--   - Consolidate duplicate permissive RLS policies (PERFORMANCE)

-- ============================================================================
-- PART 1: FIX FUNCTION SEARCH_PATH (16 functions)
-- ============================================================================

-- 1. update_theme_pool_votes_updated_at
CREATE OR REPLACE FUNCTION public.update_theme_pool_votes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 2. update_future_nomination_list_updated_at
CREATE OR REPLACE FUNCTION public.update_future_nomination_list_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 3. delete_old_archived_notifications
CREATE OR REPLACE FUNCTION public.delete_old_archived_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE archived = TRUE
    AND archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 4. archive_old_notifications
CREATE OR REPLACE FUNCTION public.archive_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET archived = TRUE, archived_at = NOW()
  WHERE archived = FALSE
    AND read = TRUE
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$function$;

-- 5. auto_add_user_to_backrow_club (SECURITY DEFINER - keep it but add search_path)
CREATE OR REPLACE FUNCTION public.auto_add_user_to_backrow_club()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  backrow_club_id UUID;
BEGIN
  -- Get the BackRow official club (where auto_add_new_users is enabled)
  SELECT id INTO backrow_club_id
  FROM clubs
  WHERE slug = 'backrow'
    AND (settings->>'auto_add_new_users')::boolean = true
    AND archived = false
  LIMIT 1;
  
  -- If BackRow club exists and has auto-add enabled, add the new user
  IF backrow_club_id IS NOT NULL THEN
    INSERT INTO club_members (club_id, user_id, role)
    VALUES (backrow_club_id, NEW.id, 'critic')
    ON CONFLICT (club_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. check_comment_depth
CREATE OR REPLACE FUNCTION public.check_comment_depth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
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
$function$;

-- 7. update_thread_comment_count
CREATE OR REPLACE FUNCTION public.update_thread_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
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
$function$;

-- 8. update_thread_upvote_count
CREATE OR REPLACE FUNCTION public.update_thread_upvote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
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
$function$;

-- 9. update_comment_upvote_count
CREATE OR REPLACE FUNCTION public.update_comment_upvote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
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
$function$;

-- 10. auto_create_movie_thread (SECURITY DEFINER - keep it but add search_path)
CREATE OR REPLACE FUNCTION public.auto_create_movie_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  club_settings JSONB;
  auto_create_enabled BOOLEAN;
  festival_status TEXT;
  festival_phase TEXT;
BEGIN
  -- Get festival status and phase
  SELECT status, phase INTO festival_status, festival_phase
  FROM festivals
  WHERE id = NEW.festival_id;
  
  -- Only create if festival is in watch_rate phase
  IF festival_phase = 'watch_rate' AND festival_status = 'watching' THEN
    -- Get club settings
    SELECT settings INTO club_settings
    FROM clubs
    WHERE id = (SELECT club_id FROM festivals WHERE id = NEW.festival_id);
    
    -- Check if auto-creation is enabled (default: true)
    auto_create_enabled := COALESCE((club_settings->>'auto_create_movie_threads')::boolean, true);
    
    IF auto_create_enabled THEN
      -- Get movie title from movies table and producer_id from clubs
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
        c.producer_id,
        'movie',
        NEW.tmdb_id,
        NEW.festival_id,
        true,
        true
      FROM festivals f
      JOIN clubs c ON c.id = f.club_id
      LEFT JOIN movies m ON m.tmdb_id = NEW.tmdb_id
      WHERE f.id = NEW.festival_id
      ON CONFLICT DO NOTHING; -- Prevent duplicate threads
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 11. auto_unlock_movie_thread
CREATE OR REPLACE FUNCTION public.auto_unlock_movie_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
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
$function$;

-- 12. auto_create_festival_thread
CREATE OR REPLACE FUNCTION public.auto_create_festival_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
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
        'Discussion: ' || COALESCE(NEW.theme, 'Festival'),
        'Discuss ' || COALESCE(NEW.theme, 'this festival') || ' here!',
        (SELECT producer_id FROM clubs WHERE id = NEW.club_id),
        'festival',
        NEW.id,
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 13. update_club_admin_updated_at
CREATE OR REPLACE FUNCTION public.update_club_admin_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 14. generate_slug
CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  -- Convert to lowercase
  -- Replace spaces and special chars with hyphens
  -- Remove multiple consecutive hyphens
  -- Remove leading/trailing hyphens
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$function$;

-- 15. get_backrow_matinee_club_id
CREATE OR REPLACE FUNCTION public.get_backrow_matinee_club_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
  RETURN (SELECT id FROM clubs WHERE slug = 'backrow-matinee' LIMIT 1);
END;
$function$;

-- 16. generate_season_slug
CREATE OR REPLACE FUNCTION public.generate_season_slug(season_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  RETURN lower(regexp_replace(season_name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$function$;

-- ============================================================================
-- PART 2: ADD MISSING FOREIGN KEY INDEXES (8 indexes)
-- ============================================================================

-- 1. club_events.tmdb_id_fkey
CREATE INDEX IF NOT EXISTS idx_club_events_tmdb_id ON public.club_events (tmdb_id);

-- 2. discussion_threads.author_id_fkey
CREATE INDEX IF NOT EXISTS idx_discussion_threads_author_id ON public.discussion_threads (author_id);

-- 3. notifications.club_id_fkey
CREATE INDEX IF NOT EXISTS idx_notifications_club_id ON public.notifications (club_id);

-- 4. notifications.festival_id_fkey
CREATE INDEX IF NOT EXISTS idx_notifications_festival_id ON public.notifications (festival_id);

-- 5. notifications.related_user_id_fkey
CREATE INDEX IF NOT EXISTS idx_notifications_related_user_id ON public.notifications (related_user_id);

-- 6. site_admins.created_by_fkey
CREATE INDEX IF NOT EXISTS idx_site_admins_created_by ON public.site_admins (created_by);

-- 7. site_announcements.created_by_fkey
CREATE INDEX IF NOT EXISTS idx_site_announcements_created_by ON public.site_announcements (created_by);

-- 8. site_settings.updated_by_fkey
CREATE INDEX IF NOT EXISTS idx_site_settings_updated_by ON public.site_settings (updated_by);

-- ============================================================================
-- PART 3: FIX RLS POLICIES - Wrap auth.uid() with (select auth.uid())
-- This prevents re-evaluation per row and evaluates once per query
-- ============================================================================

-- ---- discussion_thread_unlocks ----
DROP POLICY IF EXISTS "Users can view own unlocks" ON public.discussion_thread_unlocks;
CREATE POLICY "Users can view own unlocks" ON public.discussion_thread_unlocks
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own unlocks" ON public.discussion_thread_unlocks;
CREATE POLICY "Users can create own unlocks" ON public.discussion_thread_unlocks
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- ---- notifications ----
-- Drop duplicate policies and create single optimized one
DROP POLICY IF EXISTS "Users can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- ---- discussion_comments ----
DROP POLICY IF EXISTS "Users can view comments in clubs they're members of" ON public.discussion_comments;
CREATE POLICY "Users can view comments in clubs they're members of" ON public.discussion_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      JOIN discussion_threads dt ON dt.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND dt.id = discussion_comments.thread_id
    )
  );

DROP POLICY IF EXISTS "Users can create comments in clubs they're members of" ON public.discussion_comments;
CREATE POLICY "Users can create comments in clubs they're members of" ON public.discussion_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      JOIN discussion_threads dt ON dt.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND dt.id = discussion_comments.thread_id
    )
  );

DROP POLICY IF EXISTS "Users can update own comments" ON public.discussion_comments;
CREATE POLICY "Users can update own comments" ON public.discussion_comments
  FOR UPDATE USING (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own comments or admins can delete any" ON public.discussion_comments;
CREATE POLICY "Users can delete own comments or admins can delete any" ON public.discussion_comments
  FOR DELETE USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM club_members cm
      JOIN discussion_threads dt ON dt.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND dt.id = discussion_comments.thread_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- discussion_votes ----
DROP POLICY IF EXISTS "Users can create own votes" ON public.discussion_votes;
CREATE POLICY "Users can create own votes" ON public.discussion_votes
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own votes" ON public.discussion_votes;
CREATE POLICY "Users can delete own votes" ON public.discussion_votes
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ---- discussion_threads ----
DROP POLICY IF EXISTS "Users can view threads in clubs they're members of" ON public.discussion_threads;
CREATE POLICY "Users can view threads in clubs they're members of" ON public.discussion_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) AND cm.club_id = discussion_threads.club_id
    )
  );

DROP POLICY IF EXISTS "Users can create threads in clubs they're members of" ON public.discussion_threads;
CREATE POLICY "Users can create threads in clubs they're members of" ON public.discussion_threads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) AND cm.club_id = discussion_threads.club_id
    )
  );

DROP POLICY IF EXISTS "Users can update own threads or admins can update any" ON public.discussion_threads;
CREATE POLICY "Users can update own threads or admins can update any" ON public.discussion_threads
  FOR UPDATE USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = discussion_threads.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Users can delete own threads or admins can delete any" ON public.discussion_threads;
CREATE POLICY "Users can delete own threads or admins can delete any" ON public.discussion_threads
  FOR DELETE USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = discussion_threads.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- filter_analytics ----
DROP POLICY IF EXISTS "Users can view own filter analytics" ON public.filter_analytics;
CREATE POLICY "Users can view own filter analytics" ON public.filter_analytics
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ---- search_analytics ----
DROP POLICY IF EXISTS "Users can view own search analytics" ON public.search_analytics;
CREATE POLICY "Users can view own search analytics" ON public.search_analytics
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ---- user_badges ----
DROP POLICY IF EXISTS "User badges can be created by authenticated users" ON public.user_badges;
CREATE POLICY "User badges can be created by authenticated users" ON public.user_badges
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- ---- theme_pool ----
DROP POLICY IF EXISTS "Club members can insert themes" ON public.theme_pool;
CREATE POLICY "Club members can insert themes" ON public.theme_pool
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) AND cm.club_id = theme_pool.club_id
    )
  );

DROP POLICY IF EXISTS "Users can update themes they added" ON public.theme_pool;
CREATE POLICY "Users can update themes they added" ON public.theme_pool
  FOR UPDATE USING (added_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete themes they added" ON public.theme_pool;
CREATE POLICY "Users can delete themes they added" ON public.theme_pool
  FOR DELETE USING (added_by = (SELECT auth.uid()));

-- ---- club_announcements ----
DROP POLICY IF EXISTS "Members can view active announcements" ON public.club_announcements;
CREATE POLICY "Members can view active announcements" ON public.club_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) AND cm.club_id = club_announcements.club_id
    )
  );

DROP POLICY IF EXISTS "Admins can create announcements" ON public.club_announcements;
CREATE POLICY "Admins can create announcements" ON public.club_announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_announcements.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Admins can update announcements" ON public.club_announcements;
CREATE POLICY "Admins can update announcements" ON public.club_announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_announcements.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.club_announcements;
CREATE POLICY "Admins can delete announcements" ON public.club_announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_announcements.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- club_polls ----
DROP POLICY IF EXISTS "Members can view active polls" ON public.club_polls;
CREATE POLICY "Members can view active polls" ON public.club_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) AND cm.club_id = club_polls.club_id
    )
  );

DROP POLICY IF EXISTS "Admins can create polls" ON public.club_polls;
CREATE POLICY "Admins can create polls" ON public.club_polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_polls.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Admins can update polls" ON public.club_polls;
CREATE POLICY "Admins can update polls" ON public.club_polls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_polls.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Admins can delete polls" ON public.club_polls;
CREATE POLICY "Admins can delete polls" ON public.club_polls
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_polls.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- club_poll_votes ----
DROP POLICY IF EXISTS "Members can view votes" ON public.club_poll_votes;
CREATE POLICY "Members can view votes" ON public.club_poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      JOIN club_polls cp ON cp.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) AND cp.id = club_poll_votes.poll_id
    )
  );

DROP POLICY IF EXISTS "Members can vote on polls" ON public.club_poll_votes;
CREATE POLICY "Members can vote on polls" ON public.club_poll_votes
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM club_members cm
      JOIN club_polls cp ON cp.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) AND cp.id = club_poll_votes.poll_id
    )
  );

DROP POLICY IF EXISTS "Users can update their votes" ON public.club_poll_votes;
CREATE POLICY "Users can update their votes" ON public.club_poll_votes
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their votes" ON public.club_poll_votes;
CREATE POLICY "Users can delete their votes" ON public.club_poll_votes
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ---- site_settings ----
-- Drop duplicate policies and create single optimized ones
DROP POLICY IF EXISTS "Only site admins can view site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Only site admins can modify site_settings" ON public.site_settings;
CREATE POLICY "Site admins can manage site_settings" ON public.site_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (SELECT auth.uid())
    )
  );

-- ---- club_word_blacklist ----
DROP POLICY IF EXISTS "Members can view blacklist" ON public.club_word_blacklist;
CREATE POLICY "Members can view blacklist" ON public.club_word_blacklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) AND cm.club_id = club_word_blacklist.club_id
    )
  );

DROP POLICY IF EXISTS "Admins can add words to blacklist" ON public.club_word_blacklist;
CREATE POLICY "Admins can add words to blacklist" ON public.club_word_blacklist
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_word_blacklist.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Admins can delete words from blacklist" ON public.club_word_blacklist;
CREATE POLICY "Admins can delete words from blacklist" ON public.club_word_blacklist
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_word_blacklist.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- site_admins ----
DROP POLICY IF EXISTS "Only site admins can view site_admins" ON public.site_admins;
CREATE POLICY "Only site admins can view site_admins" ON public.site_admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Only super admins can insert site_admins" ON public.site_admins;
CREATE POLICY "Only super admins can insert site_admins" ON public.site_admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (SELECT auth.uid()) AND sa.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Only super admins can delete site_admins" ON public.site_admins;
CREATE POLICY "Only super admins can delete site_admins" ON public.site_admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (SELECT auth.uid()) AND sa.role = 'super_admin'
    )
  );

-- ---- theme_votes ----
-- Drop duplicate policies and consolidate
DROP POLICY IF EXISTS "Users can view theme votes for their clubs" ON public.theme_votes;
DROP POLICY IF EXISTS "Users can vote on themes" ON public.theme_votes;

CREATE POLICY "Users can view theme votes for their clubs" ON public.theme_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      JOIN festivals f ON f.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) AND f.id = theme_votes.festival_id
    )
  );

CREATE POLICY "Users can manage own theme votes" ON public.theme_votes
  FOR ALL USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---- theme_pool_votes ----
-- Drop duplicate policies and consolidate
DROP POLICY IF EXISTS "Users can read theme pool votes" ON public.theme_pool_votes;
DROP POLICY IF EXISTS "Users can vote on themes" ON public.theme_pool_votes;

CREATE POLICY "Users can read theme pool votes" ON public.theme_pool_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = (SELECT auth.uid()) 
        AND theme_pool.id = theme_pool_votes.theme_id
    )
  );

CREATE POLICY "Users can manage own theme pool votes" ON public.theme_pool_votes
  FOR ALL USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = (SELECT auth.uid()) 
        AND theme_pool.id = theme_pool_votes.theme_id
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = (SELECT auth.uid()) 
        AND theme_pool.id = theme_pool_votes.theme_id
    )
  );

-- ---- users ----
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- ---- seasons ----
DROP POLICY IF EXISTS "Producers and directors can insert seasons" ON public.seasons;
CREATE POLICY "Producers and directors can insert seasons" ON public.seasons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = seasons.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- festivals ----
DROP POLICY IF EXISTS "Producers and directors can create festivals" ON public.festivals;
CREATE POLICY "Producers and directors can create festivals" ON public.festivals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = festivals.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Producers and directors can update festivals" ON public.festivals;
CREATE POLICY "Producers and directors can update festivals" ON public.festivals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = festivals.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- site_announcements ----
-- Consolidate the 3 SELECT policies into 2 (public view + admin view)
DROP POLICY IF EXISTS "Anyone can view active site_announcements" ON public.site_announcements;
DROP POLICY IF EXISTS "Site admins can view all site_announcements" ON public.site_announcements;
DROP POLICY IF EXISTS "Only site admins can modify site_announcements" ON public.site_announcements;

-- Public can view active announcements (no auth needed)
CREATE POLICY "Anyone can view active site_announcements" ON public.site_announcements
  FOR SELECT USING (
    (is_active = true AND (expires_at IS NULL OR expires_at > now()))
    OR EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (SELECT auth.uid())
    )
  );

-- Admins can manage all announcements
CREATE POLICY "Site admins can manage site_announcements" ON public.site_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (SELECT auth.uid())
    )
  );

-- ---- nominations ----
DROP POLICY IF EXISTS "Members can create nominations during nominating phase" ON public.nominations;
CREATE POLICY "Members can create nominations during nominating phase" ON public.nominations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      JOIN festivals f ON f.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND f.id = nominations.festival_id
    )
  );

DROP POLICY IF EXISTS "Users can update their own nominations" ON public.nominations;
CREATE POLICY "Users can update their own nominations" ON public.nominations
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own nominations" ON public.nominations;
CREATE POLICY "Users can delete their own nominations" ON public.nominations
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ---- future_nomination_list ----
DROP POLICY IF EXISTS "Users can view own future nomination list" ON public.future_nomination_list;
CREATE POLICY "Users can view own future nomination list" ON public.future_nomination_list
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert into own future nomination list" ON public.future_nomination_list;
CREATE POLICY "Users can insert into own future nomination list" ON public.future_nomination_list
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own future nomination list" ON public.future_nomination_list;
CREATE POLICY "Users can update own future nomination list" ON public.future_nomination_list
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete from own future nomination list" ON public.future_nomination_list;
CREATE POLICY "Users can delete from own future nomination list" ON public.future_nomination_list
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ---- persons ----
DROP POLICY IF EXISTS "Authenticated users can insert persons" ON public.persons;
CREATE POLICY "Authenticated users can insert persons" ON public.persons
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update persons" ON public.persons;
CREATE POLICY "Authenticated users can update persons" ON public.persons
  FOR UPDATE USING ((SELECT auth.uid()) IS NOT NULL);

-- ---- club_events ----
DROP POLICY IF EXISTS "Club members can view events" ON public.club_events;
CREATE POLICY "Club members can view events" ON public.club_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) AND cm.club_id = club_events.club_id
    )
  );

DROP POLICY IF EXISTS "Club admins can create events" ON public.club_events;
CREATE POLICY "Club admins can create events" ON public.club_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_events.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Club admins can update events" ON public.club_events;
CREATE POLICY "Club admins can update events" ON public.club_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_events.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

DROP POLICY IF EXISTS "Club admins can delete events" ON public.club_events;
CREATE POLICY "Club admins can delete events" ON public.club_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = (SELECT auth.uid()) 
        AND cm.club_id = club_events.club_id
        AND cm.role IN ('producer', 'director')
    )
  );

-- ---- club_event_rsvps ----
DROP POLICY IF EXISTS "Club members can view RSVPs" ON public.club_event_rsvps;
CREATE POLICY "Club members can view RSVPs" ON public.club_event_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      JOIN club_events ce ON ce.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) AND ce.id = club_event_rsvps.event_id
    )
  );

DROP POLICY IF EXISTS "Club members can RSVP" ON public.club_event_rsvps;
CREATE POLICY "Club members can RSVP" ON public.club_event_rsvps
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM club_members cm
      JOIN club_events ce ON ce.club_id = cm.club_id
      WHERE cm.user_id = (SELECT auth.uid()) AND ce.id = club_event_rsvps.event_id
    )
  );

DROP POLICY IF EXISTS "Members can update own RSVP" ON public.club_event_rsvps;
CREATE POLICY "Members can update own RSVP" ON public.club_event_rsvps
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Members can delete own RSVP" ON public.club_event_rsvps;
CREATE POLICY "Members can delete own RSVP" ON public.club_event_rsvps
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 4: NOTE ABOUT UNUSED INDEXES
-- ============================================================================
-- The 75 unused indexes have been reviewed. Many are for features that:
-- 1. Haven't been heavily used yet (analytics tables, backrow_matinee, etc.)
-- 2. May be needed as the app scales
-- 3. Have minimal storage/write overhead for a small app
-- 
-- Decision: Keep unused indexes for now. They can be dropped individually later
-- if storage becomes a concern. The performance impact of unused indexes is 
-- minimal compared to the cost of missing indexes when features are used.
-- 
-- To drop an unused index manually:
-- DROP INDEX IF EXISTS idx_index_name;
-- ============================================================================

