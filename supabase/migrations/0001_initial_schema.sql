-- ============================================================================
-- BackRow Initial Schema — Baseline
-- ============================================================================
-- Reset on 2026-04-17 by squashing 118 historical migrations into this single
-- authoritative baseline. All schema changes after this date are additive
-- migrations layered on top. See docs/database-baseline.md for details.
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm   WITH SCHEMA extensions;
-- pg_cron must be enabled from the Supabase dashboard (Database → Extensions)
-- before this baseline is applied. The DO-block at the end of this file
-- installs scheduled jobs only if pg_cron is present.

-- ----------------------------------------------------------------------------
-- Public schema objects
-- ----------------------------------------------------------------------------

--
--




--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'BackRow application schema';


--
-- Name: _run_pgtap_test(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._run_pgtap_test(test_sql text) RETURNS SETOF text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  create_part text;
  select_part text;
  split_pos int;
BEGIN
  SET LOCAL search_path = public, extensions, pg_temp;
  split_pos := length(test_sql) - position(reverse('SELECT') in reverse(upper(test_sql))) - 5;
  IF split_pos > 0 AND split_pos < length(test_sql) THEN
    create_part := left(test_sql, split_pos);
    select_part := substr(test_sql, split_pos + 1);
    EXECUTE create_part;
    RETURN QUERY EXECUTE select_part;
  ELSE
    RETURN QUERY EXECUTE test_sql;
  END IF;
END;
$$;


--
-- Name: archive_old_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_old_notifications() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE archived_count INTEGER;
BEGIN
  UPDATE public.notifications SET archived = TRUE, archived_at = NOW() WHERE archived = FALSE AND read = TRUE AND created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;


--
-- Name: auto_add_user_to_backrow_club(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_add_user_to_backrow_club() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE backrow_club_id UUID;
BEGIN
  SELECT id INTO backrow_club_id FROM clubs WHERE slug = 'backrow' AND (settings->>'auto_add_new_users')::boolean = true AND archived = false LIMIT 1;
  IF backrow_club_id IS NOT NULL THEN
    INSERT INTO club_members (club_id, user_id, role) VALUES (backrow_club_id, NEW.id, 'critic') ON CONFLICT (club_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_add_user_to_backrow_club(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_add_user_to_backrow_club() IS 'Automatically adds new users to the BackRow club if it has auto_add_new_users enabled in settings';


--
-- Name: auto_create_festival_thread(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_create_festival_thread() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE club_settings JSONB; auto_create_enabled BOOLEAN;
BEGIN
  IF NEW.status = 'nominating' AND (OLD.status IS NULL OR OLD.status != 'nominating') THEN
    SELECT settings INTO club_settings FROM clubs WHERE id = NEW.club_id;
    auto_create_enabled := COALESCE((club_settings->>'auto_create_festival_threads')::boolean, true);
    IF auto_create_enabled THEN
      INSERT INTO discussion_threads (club_id, title, content, author_id, thread_type, festival_id, auto_created)
      VALUES (NEW.club_id, 'Discussion: ' || COALESCE(NEW.theme, 'Festival'), 'Discuss ' || COALESCE(NEW.theme, 'this festival') || ' here!',
        (SELECT producer_id FROM clubs WHERE id = NEW.club_id), 'festival', NEW.id, true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_create_movie_thread(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_create_movie_thread() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  club_settings JSONB;
  auto_create_enabled BOOLEAN;
  festival_status TEXT;
  festival_phase TEXT;
BEGIN
  -- Skip if movie is in the pool (endless festivals only)
  IF NEW.endless_status = 'pool' THEN
    RETURN NEW;
  END IF;

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
        'Discuss this movie here!',
        c.producer_id,
        'movie',
        NEW.tmdb_id,
        NEW.festival_id,
        true,
        false
      FROM festivals f
      JOIN clubs c ON c.id = f.club_id
      LEFT JOIN movies m ON m.tmdb_id = NEW.tmdb_id
      WHERE f.id = NEW.festival_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_create_movie_thread(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_create_movie_thread() IS 'Auto-creates discussion threads for movies when they enter the watch phase.
For endless festivals, movies in the pool (endless_status = ''pool'') are skipped.
Threads are only created when movies are playing.';


--
-- Name: auto_unlock_movie_thread(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_unlock_movie_thread() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO discussion_thread_unlocks (thread_id, user_id)
    SELECT dt.id, NEW.user_id FROM discussion_threads dt
    WHERE dt.tmdb_id = NEW.tmdb_id AND dt.thread_type = 'movie' AND dt.unlock_on_watch = true
      AND NOT EXISTS (SELECT 1 FROM discussion_thread_unlocks dtu WHERE dtu.thread_id = dt.id AND dtu.user_id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: can_update_club(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_update_club(p_club_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_id = p_club_id 
      AND user_id = p_user_id
      AND role IN ('producer', 'director')
  );
END;
$$;


--
-- Name: check_festival_type_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_festival_type_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_season_id UUID;
  active_festival_count INT;
  old_festival_type TEXT;
  new_festival_type TEXT;
BEGIN
  -- Extract festival_type from old and new settings
  old_festival_type := COALESCE(OLD.settings->>'festival_type', 'standard');
  new_festival_type := COALESCE(NEW.settings->>'festival_type', 'standard');

  -- Only check if festival_type is actually changing
  IF old_festival_type = new_festival_type THEN
    RETURN NEW;
  END IF;

  -- Find current season for this club (active season = started but not ended)
  SELECT id INTO current_season_id
  FROM seasons
  WHERE club_id = NEW.id
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
  ORDER BY start_date DESC
  LIMIT 1;

  -- If no current season, allow the change (endless clubs won't have seasons)
  IF current_season_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count active festivals (not draft, completed, or cancelled)
  SELECT COUNT(*) INTO active_festival_count
  FROM festivals
  WHERE season_id = current_season_id
    AND status NOT IN ('draft', 'completed', 'cancelled');

  -- Block if there are active festivals
  IF active_festival_count > 0 THEN
    RAISE EXCEPTION 'Cannot change festival type while a festival is actively running. Complete or cancel the current festival first.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION check_festival_type_change(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_festival_type_change() IS 'Prevents changing festival_type in club settings while a season has active festivals. Clubs without seasons (endless mode) can always change.';


--
-- Name: delete_old_archived_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_old_archived_notifications() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications WHERE archived = TRUE AND archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: ensure_single_default_rubric(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_rubric() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_rubrics
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fuzzy_search_club_notes(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fuzzy_search_club_notes(search_query text, result_limit integer DEFAULT 5) RETURNS TABLE(id uuid, note text, club_id uuid, club_name text, tmdb_id integer, movie_title text, movie_year integer, similarity_score real)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
  user_club_ids UUID[];
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's club memberships internally (cannot be spoofed)
  SELECT ARRAY_AGG(club_id) INTO user_club_ids
  FROM club_members
  WHERE user_id = current_user_id;

  IF user_club_ids IS NULL OR array_length(user_club_ids, 1) IS NULL THEN
    RETURN;  -- No clubs, return empty
  END IF;

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
      cn.note ILIKE '%' || search_query || '%'
      OR LOWER(cn.note) % LOWER(search_query)
    )
  ORDER BY 
    CASE WHEN cn.note ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    similarity_score DESC
  LIMIT result_limit;
END;
$$;


--
-- Name: fuzzy_search_discussions(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fuzzy_search_discussions(search_query text, result_limit integer DEFAULT 5) RETURNS TABLE(id uuid, slug text, title text, club_id uuid, club_name text, club_slug text, similarity_score real)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
  user_club_ids UUID[];
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's club memberships internally (cannot be spoofed)
  SELECT ARRAY_AGG(club_id) INTO user_club_ids
  FROM club_members
  WHERE user_id = current_user_id;

  IF user_club_ids IS NULL OR array_length(user_club_ids, 1) IS NULL THEN
    RETURN;  -- No clubs, return empty
  END IF;

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
      dt.title ILIKE '%' || search_query || '%'
      OR dt.content ILIKE '%' || search_query || '%'
      OR LOWER(dt.title) % LOWER(search_query)
      OR LOWER(COALESCE(dt.content, '')) % LOWER(search_query)
    )
  ORDER BY 
    CASE 
      WHEN dt.title ILIKE '%' || search_query || '%' THEN 0 
      WHEN dt.content ILIKE '%' || search_query || '%' THEN 1 
      ELSE 2 
    END,
    similarity_score DESC
  LIMIT result_limit;
END;
$$;


--
-- Name: fuzzy_search_festivals(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fuzzy_search_festivals(search_query text, result_limit integer DEFAULT 5) RETURNS TABLE(id uuid, theme text, slug text, club_id uuid, club_name text, club_slug text, similarity_score real)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
    f.theme ILIKE '%' || search_query || '%'
    OR LOWER(f.theme) % LOWER(search_query)
  ORDER BY 
    CASE WHEN f.theme ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    similarity(LOWER(f.theme), LOWER(search_query)) DESC
  LIMIT result_limit;
END;
$$;


--
-- Name: fuzzy_search_movies(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fuzzy_search_movies(search_query text, result_limit integer DEFAULT 20) RETURNS TABLE(tmdb_id integer, title text, year integer, poster_url text, slug text, similarity_score real)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
    m.title ILIKE '%' || search_query || '%'
    OR LOWER(m.title) % LOWER(search_query)
  ORDER BY 
    CASE WHEN m.title ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    m.popularity_score DESC NULLS LAST,
    similarity_score DESC
  LIMIT result_limit;
END;
$$;


--
-- Name: fuzzy_search_private_notes(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fuzzy_search_private_notes(search_query text, result_limit integer DEFAULT 5) RETURNS TABLE(id uuid, note text, tmdb_id integer, movie_title text, movie_year integer, similarity_score real)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get authenticated user - this is the security fix
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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
    pn.user_id = current_user_id  -- Hardcoded to auth.uid(), not a parameter
    AND (
      pn.note ILIKE '%' || search_query || '%'
      OR LOWER(pn.note) % LOWER(search_query)
    )
  ORDER BY 
    CASE WHEN pn.note ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    similarity_score DESC
  LIMIT result_limit;
END;
$$;


--
-- Name: generate_season_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_season_slug(season_name text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ BEGIN RETURN lower(regexp_replace(season_name, '[^a-zA-Z0-9]+', '-', 'g')); END; $$;


--
-- Name: generate_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_slug(input_text text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'), '-+', '-', 'g'));
END;
$$;


--
-- Name: get_backrow_matinee_club_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_backrow_matinee_club_id() RETURNS uuid
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$ BEGIN RETURN (SELECT id FROM clubs WHERE slug = 'backrow-matinee' LIMIT 1); END; $$;


--
-- Name: get_current_matinee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_matinee() RETURNS TABLE(id uuid, tmdb_id integer, curator_note text, featured_at timestamp with time zone, expires_at timestamp with time zone, movie_title text, movie_poster_url text, movie_year text, movie_director text, movie_genres text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_featured_club(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_featured_club() RETURNS TABLE(id uuid, name text, description text, picture_url text, member_count bigint, avg_rating numeric, festival_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: is_club_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_club_member(p_club_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1
          FROM public.club_members
              WHERE club_id = p_club_id 
                  AND user_id = p_user_id
                    );
                    END;
                    $$;


--
-- Name: FUNCTION is_club_member(p_club_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_club_member(p_club_id uuid, p_user_id uuid) IS 'Helper function to check club membership without RLS recursion. Uses SECURITY DEFINER to bypass RLS when checking membership.';


--
-- Name: is_club_producer(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_club_producer(p_club_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.clubs
    WHERE id = p_club_id 
      AND producer_id = p_user_id
  );
END;
$$;


--
-- Name: is_club_public(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_club_public(p_club_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.clubs
    WHERE id = p_club_id 
      AND privacy LIKE 'public_%'
  );
END;
$$;


--
-- Name: is_site_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_site_admin(check_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM site_admins
    WHERE user_id = check_user_id
  );
END;
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(check_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM site_admins
    WHERE user_id = check_user_id
    AND role = 'super_admin'
  );
END;
$$;


--
-- Name: is_user_blocked(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_blocked(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if the current user has blocked the target user
  -- OR if the target user has blocked the current user
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = target_user_id)
       OR (blocker_id = target_user_id AND blocked_id = auth.uid())
  );
END;
$$;


--
-- Name: FUNCTION is_user_blocked(target_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_user_blocked(target_user_id uuid) IS 'Check if there is a block relationship between current user and target user (either direction)';


--
-- Name: run_pgtap_test(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_pgtap_test(test_sql text) RETURNS SETOF text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  -- Grant temporary access then call the INVOKER function
  -- Actually, since we're SECURITY DEFINER (postgres), just call _run_pgtap_test directly
  -- But that makes _run_pgtap_test also run as postgres... 
  -- The key: SET LOCAL ROLE must happen OUTSIDE any SECURITY DEFINER function
  -- So we need to NOT use SECURITY DEFINER at all, but grant service_role the needed access
  RETURN QUERY SELECT * FROM _run_pgtap_test(test_sql);
END;
$$;


--
-- Name: search_private_notes_fuzzy(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_private_notes_fuzzy(search_query text, result_limit integer DEFAULT 20) RETURNS TABLE(id uuid, note text, tmdb_id text, movie_title text, movie_year integer, similarity_score real)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the authenticated user - this cannot be spoofed
  current_user_id := auth.uid();
  
  -- Reject anonymous access
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Search only the current user's notes
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
    pn.user_id = current_user_id  -- Hardcoded to auth.uid()
    AND (
      pn.note ILIKE '%' || search_query || '%'
      OR similarity(LOWER(pn.note), LOWER(search_query)) > 0.1
    )
  ORDER BY similarity_score DESC
  LIMIT result_limit;
END;
$$;


--
-- Name: FUNCTION search_private_notes_fuzzy(search_query text, result_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.search_private_notes_fuzzy(search_query text, result_limit integer) IS 'Search current user private notes. Uses auth.uid() internally - cannot read other users notes.';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: snapshot_rubric_on_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.snapshot_rubric_on_lock() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.is_locked = true AND OLD.is_locked = false THEN
    NEW.rubric_snapshot = (
      SELECT jsonb_build_object(
        'name', name,
        'categories', categories
      )
      FROM public.user_rubrics
      WHERE id = NEW.rubric_id
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: tap_finish(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tap_finish() RETURNS SETOF text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'extensions'
    AS $$ SELECT * FROM finish(); $$;


--
-- Name: tap_ok(boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tap_ok(v_bool boolean, v_desc text) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'extensions'
    AS $$ SELECT ok(v_bool, v_desc); $$;


--
-- Name: tap_plan(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tap_plan(v_count integer) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'extensions'
    AS $$ SELECT plan(v_count); $$;


--
-- Name: test_authenticate_as(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_authenticate_as(user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'sub', user_id::text, 'role', 'authenticated', 'iss', 'supabase', 'aud', 'authenticated'
  )::text, true);
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
END;
$$;


--
-- Name: test_clear_authentication(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_clear_authentication() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;


--
-- Name: test_count_as_authenticated(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_count_as_authenticated(query_sql text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count int;
BEGIN
  SET LOCAL ROLE authenticated;
  EXECUTE 'SELECT count(*) FROM (' || query_sql || ') sub' INTO v_count;
  RESET ROLE;
  RETURN v_count;
END;
$$;


--
-- Name: test_create_user(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_create_user(p_email text, p_username text DEFAULT NULL::text, p_display_name text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_username text := COALESCE(p_username, 'test_' || substr(v_user_id::text, 1, 8));
  v_display_name text := COALESCE(p_display_name, v_username);
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('username', v_username, 'display_name', v_display_name)::jsonb,
    now(), now(), '', '', '', ''
  );
  INSERT INTO public.users (id, email, username, display_name) VALUES (v_user_id, p_email, v_username, v_display_name);
  RETURN v_user_id;
END;
$$;


--
-- Name: test_delete_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_delete_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.users WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;


--
-- Name: update_backrow_matinee_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_backrow_matinee_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                        BEGIN
                                                                                                                                                          NEW.updated_at = NOW();
                                                                                                                                                            RETURN NEW;
                                                                                                                                                            END;
                                                                                                                                                            $$;


--
-- Name: update_club_admin_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_club_admin_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


--
-- Name: update_comment_upvote_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_comment_upvote_count() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN IF NEW.comment_id IS NOT NULL THEN UPDATE discussion_comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id; END IF; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN IF OLD.comment_id IS NOT NULL THEN UPDATE discussion_comments SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.comment_id; END IF; RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_future_nomination_list_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_future_nomination_list_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


--
-- Name: update_join_request_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_join_request_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_theme_pool_votes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_theme_pool_votes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


--
-- Name: update_thread_comment_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_thread_comment_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussion_threads
    SET comment_count = comment_count + 1,
        updated_at = NOW()
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
$$;


--
-- Name: update_thread_upvote_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_thread_upvote_count() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN IF NEW.thread_id IS NOT NULL THEN UPDATE discussion_threads SET upvotes = upvotes + 1 WHERE id = NEW.thread_id; END IF; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN IF OLD.thread_id IS NOT NULL THEN UPDATE discussion_threads SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.thread_id; END IF; RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_clubs_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_clubs_count() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET clubs_count = clubs_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET clubs_count = GREATEST(0, clubs_count - 1) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_user_movies_watched_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_movies_watched_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET movies_watched_count = movies_watched_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET movies_watched_count = GREATEST(0, movies_watched_count - 1) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_user_stats_from_standings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_stats_from_standings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: validate_festival_dates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_festival_dates() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Endless festivals have no season — skip validation
  IF NEW.season_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM 1 FROM public.seasons 
  WHERE id = NEW.season_id 
  FOR UPDATE;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.seasons 
    WHERE id = NEW.season_id 
    AND NEW.start_date >= start_date 
    AND COALESCE(NEW.results_date, NEW.rating_deadline, NEW.watch_deadline, NEW.start_date) <= end_date
  ) THEN
    RAISE EXCEPTION 'Festival dates must fall within season dates';
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    club_id uuid,
    user_id uuid,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.activity_log REPLICA IDENTITY FULL;


--
-- Name: TABLE activity_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activity_log IS 'Club activity log for displaying recent actions in feeds';


--
-- Name: activity_log_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log_archive (
    id uuid NOT NULL,
    club_id uuid,
    user_id uuid,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone NOT NULL,
    archived_at timestamp with time zone DEFAULT now()
);


--
-- Name: background_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.background_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    image_url text NOT NULL,
    height_preset text DEFAULT 'default'::text NOT NULL,
    height_px integer,
    opacity numeric(3,2) DEFAULT 0.80 NOT NULL,
    object_position text DEFAULT 'center center'::text NOT NULL,
    credit_title text,
    credit_year integer,
    credit_studio text,
    credit_actor text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vignette_opacity numeric(3,2) DEFAULT 0.40 NOT NULL,
    scale numeric(3,2) DEFAULT 1.00 NOT NULL,
    extend_past_content boolean DEFAULT false,
    mobile_height_preset text DEFAULT 'default'::text,
    mobile_height_px integer,
    mobile_scale numeric DEFAULT 1.00,
    mobile_object_position text DEFAULT 'center center'::text,
    mobile_opacity numeric,
    CONSTRAINT background_images_entity_type_check CHECK ((entity_type = ANY (ARRAY['site_page'::text, 'club'::text, 'festival'::text, 'profile'::text]))),
    CONSTRAINT background_images_height_preset_check CHECK ((height_preset = ANY (ARRAY['compact'::text, 'default'::text, 'tall'::text, 'custom'::text]))),
    CONSTRAINT background_images_mobile_height_preset_check CHECK ((mobile_height_preset = ANY (ARRAY['compact'::text, 'default'::text, 'tall'::text, 'custom'::text]))),
    CONSTRAINT background_images_mobile_scale_check CHECK (((mobile_scale >= 0.5) AND (mobile_scale <= 2.0))),
    CONSTRAINT background_images_opacity_check CHECK (((opacity >= 0.1) AND (opacity <= 1.0))),
    CONSTRAINT background_images_scale_check CHECK (((scale >= 0.5) AND (scale <= 2.0))),
    CONSTRAINT background_images_vignette_opacity_check CHECK (((vignette_opacity >= 0.0) AND (vignette_opacity <= 1.0)))
);


--
-- Name: TABLE background_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.background_images IS 'Stores background image settings for site pages, clubs, festivals, and profiles';


--
-- Name: COLUMN background_images.vignette_opacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.background_images.vignette_opacity IS 'Opacity of the dark vignette overlay at bottom of image (0-1). Use 0 for images with light bottoms.';


--
-- Name: COLUMN background_images.scale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.background_images.scale IS 'Image scale factor for zoom/crop (0.5 = 50%, 1.0 = 100%, max 2.0 = 200%)';


--
-- Name: COLUMN background_images.extend_past_content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.background_images.extend_past_content IS 'When true, background image extends beyond max-w-7xl (1280px) on wide screens. Shows more of landscape images on desktop.';


--
-- Name: COLUMN background_images.mobile_height_preset; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.background_images.mobile_height_preset IS 'Height preset for mobile viewport (compact, default, tall, custom). If null, uses desktop height_preset.';


--
-- Name: COLUMN background_images.mobile_height_px; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.background_images.mobile_height_px IS 'Custom height in pixels for mobile viewport. Only used when mobile_height_preset is custom.';


--
-- Name: COLUMN background_images.mobile_scale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.background_images.mobile_scale IS 'Scale factor for mobile viewport (0.5-2.0). Defaults to 1.0.';


--
-- Name: COLUMN background_images.mobile_object_position; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.background_images.mobile_object_position IS 'CSS object-position for mobile viewport. Defaults to center center.';


--
-- Name: backrow_matinee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backrow_matinee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tmdb_id integer NOT NULL,
    curator_note text,
    featured_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    club_id uuid
);


--
-- Name: TABLE backrow_matinee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.backrow_matinee IS 'Special BackRow Matinee club weekly movie picks';


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon_url text,
    badge_type text NOT NULL,
    club_id uuid,
    requirements_jsonb jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT badges_badge_type_check CHECK ((badge_type = ANY (ARRAY['site'::text, 'club'::text, 'club_challenge'::text]))),
    CONSTRAINT badges_type_club_check CHECK ((((badge_type = 'site'::text) AND (club_id IS NULL)) OR ((badge_type = 'club'::text) AND (club_id IS NOT NULL)) OR ((badge_type = 'club_challenge'::text) AND (club_id IS NULL))))
);


--
-- Name: TABLE badges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.badges IS 'Available badges that can be earned by users';


--
-- Name: blocked_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_users (
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    blocked_by uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE blocked_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blocked_users IS 'Club-level user blocks';


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    club_id uuid,
    user_id uuid,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.chat_messages REPLICA IDENTITY FULL;


--
-- Name: TABLE chat_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_messages IS 'Real-time club chat messages';


--
-- Name: chat_messages_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages_archive (
    id uuid NOT NULL,
    club_id uuid,
    user_id uuid,
    message text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    archived_at timestamp with time zone DEFAULT now()
);


--
-- Name: club_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    content_html text,
    image_url text,
    announcement_type text DEFAULT 'simple'::text,
    image_opacity numeric(3,2) DEFAULT 0.3,
    CONSTRAINT club_announcements_type_check CHECK ((announcement_type = ANY (ARRAY['simple'::text, 'rich'::text])))
);


--
-- Name: TABLE club_announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_announcements IS 'Admin announcements pinned to club pages';


--
-- Name: COLUMN club_announcements.image_opacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_announcements.image_opacity IS 'Opacity of background image (0.0 to 1.0, default 0.3)';


--
-- Name: club_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_badges (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    earned_at timestamp with time zone,
    progress integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE club_badges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_badges IS 'Tracks which club challenge badges each club has earned';


--
-- Name: COLUMN club_badges.earned_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_badges.earned_at IS 'When the badge was earned (NULL if not yet earned)';


--
-- Name: COLUMN club_badges.progress; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_badges.progress IS 'Current progress toward the badge threshold';


--
-- Name: club_event_rsvps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_event_rsvps (
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT club_event_rsvps_status_check CHECK ((status = ANY (ARRAY['going'::text, 'maybe'::text, 'not_going'::text])))
);


--
-- Name: TABLE club_event_rsvps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_event_rsvps IS 'RSVP responses for club events';


--
-- Name: club_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    created_by uuid NOT NULL,
    poll_id uuid,
    title text NOT NULL,
    description text,
    event_type text NOT NULL,
    event_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    tmdb_id integer,
    status text DEFAULT 'upcoming'::text NOT NULL,
    location text,
    max_attendees integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT club_events_event_type_check CHECK ((event_type = ANY (ARRAY['watch_party'::text, 'discussion'::text, 'meetup'::text, 'custom'::text]))),
    CONSTRAINT club_events_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'ongoing'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE club_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_events IS 'Scheduled watch parties and events within clubs';


--
-- Name: COLUMN club_events.poll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_events.poll_id IS 'Reference to the poll that created this event (if created via poll)';


--
-- Name: COLUMN club_events.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_events.event_type IS 'Type of event: watch_party, discussion, meetup, or custom';


--
-- Name: COLUMN club_events.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_events.status IS 'Event status: upcoming, ongoing, completed, or cancelled';


--
-- Name: COLUMN club_events.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_events.location IS 'Virtual meeting link or physical location';


--
-- Name: club_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    token text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    used_by uuid
);


--
-- Name: club_join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    message text,
    denial_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text])))
);


--
-- Name: club_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_members (
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    club_display_name text,
    joined_at timestamp with time zone DEFAULT now(),
    club_avatar_url text,
    club_bio text,
    preferences jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT club_members_role_check CHECK ((role = ANY (ARRAY['critic'::text, 'director'::text, 'producer'::text])))
);


--
-- Name: TABLE club_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_members IS 'Club membership records with roles (producer, director, critic)';


--
-- Name: COLUMN club_members.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_members.role IS 'Member role: producer (owner), director (admin), critic (member)';


--
-- Name: COLUMN club_members.club_avatar_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_members.club_avatar_url IS 'URL to club-specific avatar image (stored in Supabase Storage). If null, uses global avatar_url from users table.';


--
-- Name: COLUMN club_members.club_bio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_members.club_bio IS 'Club-specific bio text. If null, uses global bio from users table.';


--
-- Name: COLUMN club_members.preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_members.preferences IS 'Per-club user preferences including default_rubric_id (references user personal rubrics)';


--
-- Name: club_movie_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_movie_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    user_id uuid NOT NULL,
    pitch text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: TABLE club_movie_pool; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_movie_pool IS 'Stores movie pool items for clubs, independent of festivals. Works for both standard and endless festival clubs.';


--
-- Name: club_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    tmdb_id integer,
    club_id uuid,
    note text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE club_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_notes IS 'Shared notes visible to club members for movies';


--
-- Name: club_poll_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_poll_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    poll_id uuid NOT NULL,
    user_id uuid NOT NULL,
    option_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE club_poll_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_poll_votes IS 'Votes cast on club polls';


--
-- Name: club_polls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_polls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    question text NOT NULL,
    options jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    action_type text,
    action_data jsonb,
    processed_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    allow_multiple boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE club_polls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_polls IS 'Polls for club decisions (date selection, movie voting, etc.)';


--
-- Name: COLUMN club_polls.action_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_polls.action_type IS 'Type of action to perform when poll ends (e.g., create_event)';


--
-- Name: COLUMN club_polls.action_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_polls.action_data IS 'JSON data for the action (e.g., event details)';


--
-- Name: COLUMN club_polls.processed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_polls.processed_at IS 'Timestamp when poll action was processed (for event creation from polls)';


--
-- Name: COLUMN club_polls.is_anonymous; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_polls.is_anonymous IS 'When true, voter identities are hidden but vote counts are visible';


--
-- Name: COLUMN club_polls.allow_multiple; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.club_polls.allow_multiple IS 'When true, users can vote for multiple options';


--
-- Name: club_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    title text NOT NULL,
    url text,
    icon text,
    description text,
    display_order integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resource_type text DEFAULT 'link'::text NOT NULL,
    content text,
    CONSTRAINT club_resources_type_check CHECK ((((resource_type = 'link'::text) AND (url IS NOT NULL)) OR ((resource_type = ANY (ARRAY['text'::text, 'rules'::text])) AND (content IS NOT NULL))))
);


--
-- Name: TABLE club_resources; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_resources IS 'External resource links for clubs (Discord, Facebook groups, etc.)';


--
-- Name: club_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_stats (
    club_id uuid NOT NULL,
    members_count integer DEFAULT 0,
    festivals_count integer DEFAULT 0,
    completed_festivals integer DEFAULT 0,
    total_movies_watched integer DEFAULT 0,
    average_festival_rating numeric(3,1),
    most_nominated_movie_id integer,
    highest_rated_movie_id integer,
    last_activity timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: club_word_blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_word_blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    word text NOT NULL,
    added_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE club_word_blacklist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.club_word_blacklist IS 'Banned words for club content moderation';


--
-- Name: clubs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clubs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    privacy text NOT NULL,
    producer_id uuid NOT NULL,
    archived boolean DEFAULT false,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    featured boolean DEFAULT false NOT NULL,
    featured_at timestamp with time zone,
    featured_until timestamp with time zone,
    slug text,
    background_type text,
    background_value text,
    keywords text[] DEFAULT '{}'::text[],
    picture_url text,
    theme_submissions_locked boolean DEFAULT false,
    theme_color text,
    avatar_icon text,
    avatar_color_index integer,
    avatar_border_color_index integer,
    festival_type text DEFAULT 'standard'::text,
    themes_enabled boolean DEFAULT true,
    theme_governance text DEFAULT 'democracy'::text,
    theme_voting_enabled boolean DEFAULT true,
    max_themes_per_user integer,
    max_nominations_per_user integer DEFAULT 3,
    blind_nominations_enabled boolean DEFAULT false,
    allow_non_admin_nominations boolean DEFAULT true,
    rating_min numeric DEFAULT 0,
    rating_max numeric DEFAULT 10,
    rating_increment numeric DEFAULT 0.5,
    rating_unit text DEFAULT 'numbers'::text,
    rating_visual_icon text,
    club_ratings_enabled boolean DEFAULT true,
    scoring_enabled boolean DEFAULT true,
    nomination_guessing_enabled boolean DEFAULT false,
    season_standings_enabled boolean DEFAULT true,
    auto_start_next_festival boolean DEFAULT false,
    results_reveal_type text DEFAULT 'manual'::text,
    results_reveal_direction text DEFAULT 'backward'::text,
    results_reveal_delay_seconds integer DEFAULT 5,
    rubric_enforcement text,
    rating_rubric_name text,
    movie_pool_voting_enabled boolean DEFAULT true,
    movie_pool_governance text DEFAULT 'democracy'::text,
    movie_pool_auto_promote_threshold integer DEFAULT 5,
    nomination_timing jsonb,
    watch_rate_timing jsonb,
    placement_points jsonb,
    recently_watched_retention jsonb,
    featured_badge_ids text[] DEFAULT '{}'::text[],
    genres text[],
    CONSTRAINT clubs_featured_badge_ids_max_5 CHECK (((array_length(featured_badge_ids, 1) IS NULL) OR (array_length(featured_badge_ids, 1) <= 5))),
    CONSTRAINT clubs_genres_max_3 CHECK (((genres IS NULL) OR (array_length(genres, 1) <= 3))),
    CONSTRAINT clubs_privacy_check CHECK ((privacy = ANY (ARRAY['public_open'::text, 'public_moderated'::text, 'private'::text])))
);


--
-- Name: TABLE clubs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clubs IS 'Movie clubs where members watch and rate films together. Can be public or private.';


--
-- Name: COLUMN clubs.privacy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.privacy IS 'Club privacy type: private (not discoverable, invite only), public_open (discoverable, anyone can join), public_moderated (discoverable, requires approval to join)';


--
-- Name: COLUMN clubs.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.settings IS 'JSONB containing club preferences: festival_mode, theme_pool_enabled, auto_create_threads, etc.';


--
-- Name: COLUMN clubs.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.slug IS 'URL-friendly unique identifier for the club';


--
-- Name: COLUMN clubs.background_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.background_type IS 'Type of background: gradient, preset_image, or custom_image';


--
-- Name: COLUMN clubs.background_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.background_value IS 'Background value: gradient name, preset image ID, or custom image URL';


--
-- Name: COLUMN clubs.keywords; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.keywords IS 'Array of club keywords/tags for discovery (max 25 chars each, max 2 words per tag)';


--
-- Name: COLUMN clubs.picture_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.picture_url IS 'URL to club picture in Supabase Storage';


--
-- Name: COLUMN clubs.theme_submissions_locked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.theme_submissions_locked IS 'When true, members cannot submit new themes to the theme pool';


--
-- Name: COLUMN clubs.theme_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.theme_color IS 'Theme accent color ID for club styling (e.g., rose, teal, violet)';


--
-- Name: COLUMN clubs.avatar_icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.avatar_icon IS 'Custom club avatar icon';


--
-- Name: COLUMN clubs.avatar_color_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.avatar_color_index IS 'Index into avatar color palette';


--
-- Name: COLUMN clubs.avatar_border_color_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.avatar_border_color_index IS 'Index into avatar border color palette';


--
-- Name: COLUMN clubs.festival_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.festival_type IS 'Type of festival: standard, endless';


--
-- Name: COLUMN clubs.themes_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.themes_enabled IS 'Whether themed festivals are enabled';


--
-- Name: COLUMN clubs.theme_governance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.theme_governance IS 'How themes are chosen: democracy, autocracy, rotation';


--
-- Name: COLUMN clubs.club_ratings_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.club_ratings_enabled IS 'Whether ratings are enabled for the club';


--
-- Name: COLUMN clubs.scoring_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.scoring_enabled IS 'Whether competitive scoring is enabled';


--
-- Name: COLUMN clubs.nomination_guessing_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.nomination_guessing_enabled IS 'Whether nomination guessing game is enabled';


--
-- Name: COLUMN clubs.featured_badge_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clubs.featured_badge_ids IS 'Array of badge IDs (max 5) to display on club ID card';


--
-- Name: contact_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: curated_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curated_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    emoji text,
    movies jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    show_on_search boolean DEFAULT true NOT NULL,
    show_on_home boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    club_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT message_not_empty CHECK ((length(TRIM(BOTH FROM message)) > 0))
);


--
-- Name: TABLE direct_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.direct_messages IS 'Private messages between club members';


--
-- Name: discussion_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    thread_id uuid NOT NULL,
    author_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    is_spoiler boolean DEFAULT false,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    upvotes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY public.discussion_comments REPLICA IDENTITY FULL;


--
-- Name: TABLE discussion_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discussion_comments IS 'Comments on discussion threads with support for nested replies (max 3 levels)';


--
-- Name: COLUMN discussion_comments.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_comments.deleted_at IS 'Soft delete timestamp - NULL means active';


--
-- Name: discussion_thread_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_thread_tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    thread_id uuid NOT NULL,
    tag_type text NOT NULL,
    tmdb_id integer,
    person_tmdb_id integer,
    festival_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT discussion_thread_tags_tag_type_check CHECK ((tag_type = ANY (ARRAY['movie'::text, 'actor'::text, 'director'::text, 'composer'::text, 'festival'::text]))),
    CONSTRAINT valid_tag_reference CHECK ((((tag_type = 'movie'::text) AND (tmdb_id IS NOT NULL) AND (person_tmdb_id IS NULL) AND (festival_id IS NULL)) OR ((tag_type = ANY (ARRAY['actor'::text, 'director'::text, 'composer'::text])) AND (person_tmdb_id IS NOT NULL) AND (tmdb_id IS NULL) AND (festival_id IS NULL)) OR ((tag_type = 'festival'::text) AND (festival_id IS NOT NULL) AND (tmdb_id IS NULL) AND (person_tmdb_id IS NULL))))
);


--
-- Name: TABLE discussion_thread_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discussion_thread_tags IS 'Junction table for many-to-many relationship between discussion threads and entities (movies, people, festivals)';


--
-- Name: COLUMN discussion_thread_tags.tag_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_thread_tags.tag_type IS 'Type of tag: movie, actor, director, composer, or festival';


--
-- Name: discussion_thread_unlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_thread_unlocks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    thread_id uuid NOT NULL,
    user_id uuid NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE discussion_thread_unlocks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discussion_thread_unlocks IS 'Tracks which users have unlocked spoiler-protected movie threads';


--
-- Name: discussion_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_threads (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid NOT NULL,
    thread_type text NOT NULL,
    tmdb_id integer,
    person_name text,
    person_type text,
    festival_id uuid,
    is_pinned boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    is_spoiler boolean DEFAULT false,
    auto_created boolean DEFAULT false,
    unlock_on_watch boolean DEFAULT false,
    upvotes integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    person_tmdb_id integer,
    slug text,
    CONSTRAINT discussion_threads_person_type_check CHECK (((person_type IS NULL) OR (person_type = ANY (ARRAY['actor'::text, 'director'::text, 'composer'::text])))),
    CONSTRAINT discussion_threads_thread_type_check CHECK ((thread_type = ANY (ARRAY['movie'::text, 'person'::text, 'festival'::text, 'custom'::text])))
);

ALTER TABLE ONLY public.discussion_threads REPLICA IDENTITY FULL;


--
-- Name: TABLE discussion_threads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discussion_threads IS 'Discussion threads for clubs, movies, or festivals. Can be auto-created or user-created.';


--
-- Name: COLUMN discussion_threads.tmdb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_threads.tmdb_id IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';


--
-- Name: COLUMN discussion_threads.person_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_threads.person_name IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';


--
-- Name: COLUMN discussion_threads.person_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_threads.person_type IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';


--
-- Name: COLUMN discussion_threads.festival_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_threads.festival_id IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';


--
-- Name: COLUMN discussion_threads.person_tmdb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_threads.person_tmdb_id IS 'DEPRECATED: Use discussion_thread_tags table instead. Kept for backward compatibility.';


--
-- Name: COLUMN discussion_threads.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussion_threads.slug IS 'URL-friendly slug generated from thread title, unique per club';


--
-- Name: discussion_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_votes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    thread_id uuid,
    comment_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vote_target CHECK ((((thread_id IS NOT NULL) AND (comment_id IS NULL)) OR ((thread_id IS NULL) AND (comment_id IS NOT NULL))))
);


--
-- Name: TABLE discussion_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discussion_votes IS 'Upvotes on threads and comments';


--
-- Name: email_digest_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_digest_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    digest_type text NOT NULL,
    sent_at timestamp with time zone NOT NULL,
    notification_ids uuid[]
);


--
-- Name: favorite_clubs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_clubs (
    user_id uuid NOT NULL,
    club_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE favorite_clubs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.favorite_clubs IS 'User favorite clubs for quick access in sidebar';


--
-- Name: feedback_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    user_id uuid,
    status text DEFAULT 'open'::text NOT NULL,
    admin_response text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feedback_items_description_check CHECK (((description IS NULL) OR (length(description) <= 1000))),
    CONSTRAINT feedback_items_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text, 'wont_fix'::text]))),
    CONSTRAINT feedback_items_title_check CHECK ((length(title) <= 200)),
    CONSTRAINT feedback_items_type_check CHECK ((type = ANY (ARRAY['bug'::text, 'feature'::text])))
);


--
-- Name: TABLE feedback_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feedback_items IS 'User-submitted bug reports and feature requests with voting support';


--
-- Name: COLUMN feedback_items.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feedback_items.type IS 'Type of feedback: bug or feature';


--
-- Name: COLUMN feedback_items.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feedback_items.status IS 'Current status: open, in_progress, resolved, closed, wont_fix';


--
-- Name: COLUMN feedback_items.admin_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feedback_items.admin_response IS 'Optional response from site admin';


--
-- Name: feedback_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE feedback_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feedback_votes IS 'Upvotes on feedback items - one vote per user per item';


--
-- Name: festival_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.festival_results (
    festival_id uuid NOT NULL,
    results jsonb NOT NULL,
    calculated_at timestamp with time zone NOT NULL,
    is_final boolean DEFAULT false
);


--
-- Name: TABLE festival_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.festival_results IS 'CACHED results for completed festivals - JSONB containing points, never recalculate';


--
-- Name: COLUMN festival_results.results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festival_results.results IS 'CACHED JSONB results - never recalculate, always use this value';


--
-- Name: festival_rubric_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.festival_rubric_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    festival_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rubric_id uuid,
    rubric_snapshot jsonb,
    use_club_rubric boolean DEFAULT false NOT NULL,
    opted_out boolean DEFAULT false NOT NULL,
    dont_ask_again boolean DEFAULT false NOT NULL,
    locked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE festival_rubric_locks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.festival_rubric_locks IS 'Locks a user''s rubric choice for a specific festival';


--
-- Name: COLUMN festival_rubric_locks.rubric_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festival_rubric_locks.rubric_snapshot IS 'Snapshot of rubric categories at lock time';


--
-- Name: festival_standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.festival_standings (
    festival_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rank integer NOT NULL,
    points numeric(5,1) NOT NULL,
    nominations_count integer DEFAULT 0,
    ratings_count integer DEFAULT 0,
    average_rating numeric(3,1),
    guessing_accuracy numeric(3,1),
    guessing_points numeric(5,1) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    correct_guesses integer DEFAULT 0
);


--
-- Name: TABLE festival_standings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.festival_standings IS 'User standings/rankings within a festival';


--
-- Name: festivals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.festivals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    season_id uuid,
    theme text,
    status text NOT NULL,
    phase text NOT NULL,
    member_count_at_creation integer NOT NULL,
    start_date timestamp with time zone NOT NULL,
    nomination_deadline timestamp with time zone,
    watch_deadline timestamp with time zone,
    rating_deadline timestamp with time zone,
    results_date timestamp with time zone,
    auto_advance boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    slug text,
    background_type text,
    background_value text,
    keywords text[] DEFAULT '{}'::text[],
    picture_url text,
    poster_url text,
    theme_selected_by uuid,
    theme_source text,
    CONSTRAINT festivals_phase_check CHECK ((phase = ANY (ARRAY['theme_selection'::text, 'nomination'::text, 'watch_rate'::text, 'results'::text]))),
    CONSTRAINT festivals_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'nominating'::text, 'watching'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT festivals_theme_source_check CHECK (((theme_source IS NULL) OR (theme_source = ANY (ARRAY['pool'::text, 'custom'::text, 'random'::text])))),
    CONSTRAINT theme_required_after_selection CHECK (((phase = 'theme_selection'::text) OR (theme IS NOT NULL)))
);


--
-- Name: TABLE festivals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.festivals IS 'Movie festivals (themed events) within a club. Can be competitive or endless.';


--
-- Name: COLUMN festivals.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.status IS 'Festival status: draft, nominating, voting, watching, rating, completed';


--
-- Name: COLUMN festivals.phase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.phase IS 'Current festival phase: setup, nominating, voting, watch_rate, results';


--
-- Name: COLUMN festivals.background_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.background_type IS 'Type of background: gradient, preset_image, or custom_image';


--
-- Name: COLUMN festivals.background_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.background_value IS 'Background value: gradient name, preset image ID, or custom image URL';


--
-- Name: COLUMN festivals.keywords; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.keywords IS 'Array of festival keywords/tags for discovery (max 25 chars each, max 2 words per tag)';


--
-- Name: COLUMN festivals.picture_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.picture_url IS 'URL to festival picture in Supabase Storage';


--
-- Name: COLUMN festivals.poster_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.poster_url IS 'URL to custom festival poster image uploaded by admin';


--
-- Name: COLUMN festivals.theme_selected_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.theme_selected_by IS 'User ID of who selected/set the festival theme';


--
-- Name: COLUMN festivals.theme_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.festivals.theme_source IS 'Source of theme: pool (from theme_pool), custom (manually entered), or random';


--
-- Name: CONSTRAINT theme_required_after_selection ON festivals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT theme_required_after_selection ON public.festivals IS 'Theme can be NULL only during theme_selection phase. Must be set for all other phases.';


--
-- Name: filter_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filter_analytics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    filter_combination jsonb NOT NULL,
    result_count integer NOT NULL,
    has_results boolean GENERATED ALWAYS AS ((result_count > 0)) STORED,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE filter_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.filter_analytics IS 'Tracks filter usage for UX improvements - auto-pruned after 90 days';


--
-- Name: future_nomination_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.future_nomination_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    future_nomination_id uuid NOT NULL,
    club_id uuid NOT NULL,
    festival_id uuid,
    nominated boolean DEFAULT false,
    nominated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    theme_pool_id uuid
);


--
-- Name: TABLE future_nomination_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.future_nomination_links IS 'Links between future nominations and clubs/festivals. Tracks which clubs a movie is planned for nomination. Movie only leaves future_nomination_list when all links are nominated.';


--
-- Name: COLUMN future_nomination_links.festival_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.future_nomination_links.festival_id IS 'References a scheduled festival. Either theme_pool_id OR festival_id should be set, not both.';


--
-- Name: COLUMN future_nomination_links.nominated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.future_nomination_links.nominated IS 'Whether this link has been used to create an actual nomination';


--
-- Name: COLUMN future_nomination_links.nominated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.future_nomination_links.nominated_at IS 'Timestamp when the nomination was created from this link';


--
-- Name: COLUMN future_nomination_links.theme_pool_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.future_nomination_links.theme_pool_id IS 'References a theme from the theme pool. Either theme_pool_id OR festival_id should be set, not both.';


--
-- Name: future_nomination_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.future_nomination_list (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    note text,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE future_nomination_list; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.future_nomination_list IS 'User watchlist for movies to nominate in future festivals';


--
-- Name: generic_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generic_ratings (
    user_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    rating numeric(3,1),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT generic_ratings_normalized_range_check CHECK (((rating >= (0)::numeric) AND (rating <= (10)::numeric))),
    CONSTRAINT generic_ratings_rating_check CHECK (((rating >= 0.1) AND (rating <= 10.0)))
);


--
-- Name: TABLE generic_ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.generic_ratings IS 'User ratings for movies outside of festival context. All ratings are stored on a normalized 0-10 scale as of migration 20260117000000.';


--
-- Name: hidden_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hidden_activities (
    user_id uuid NOT NULL,
    activity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hidden_watch_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hidden_watch_history (
    user_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movie_pool_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_pool_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nomination_id uuid,
    user_id uuid NOT NULL,
    vote_type text DEFAULT 'upvote'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    club_pool_item_id uuid,
    CONSTRAINT movie_pool_votes_item_check CHECK (((nomination_id IS NOT NULL) OR (club_pool_item_id IS NOT NULL))),
    CONSTRAINT movie_pool_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['upvote'::text, 'downvote'::text])))
);


--
-- Name: TABLE movie_pool_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.movie_pool_votes IS 'Tracks user votes for movies in the endless festival movie pool';


--
-- Name: COLUMN movie_pool_votes.vote_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movie_pool_votes.vote_type IS 'Type of vote: upvote or downvote';


--
-- Name: movies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movies (
    tmdb_id integer NOT NULL,
    title text NOT NULL,
    year integer,
    poster_url text,
    runtime integer,
    genres text[],
    director text,
    "cast" text[],
    cached_at timestamp with time zone DEFAULT now(),
    popularity_score integer DEFAULT 0,
    slug text,
    backdrop_url text,
    overview text,
    tagline text,
    certification text
);


--
-- Name: TABLE movies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.movies IS 'Cached movie data from TMDB API to reduce API calls';


--
-- Name: COLUMN movies.backdrop_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movies.backdrop_url IS 'TMDB backdrop image URL for movie backgrounds';


--
-- Name: COLUMN movies.overview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movies.overview IS 'Movie description/overview from TMDB';


--
-- Name: COLUMN movies.tagline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movies.tagline IS 'Marketing tagline from TMDB';


--
-- Name: COLUMN movies.certification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movies.certification IS 'MPAA content rating (e.g., G, PG, PG-13, R, NC-17)';


--
-- Name: nomination_guesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomination_guesses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    festival_id uuid,
    user_id uuid,
    guesses jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nominations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nominations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    festival_id uuid NOT NULL,
    user_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    pitch text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    endless_status text,
    display_slot text,
    completed_at timestamp with time zone,
    hidden_from_history boolean DEFAULT false,
    CONSTRAINT nominations_display_slot_check CHECK (((display_slot IS NULL) OR (display_slot = ANY (ARRAY['featured'::text, 'throwback'::text])))),
    CONSTRAINT nominations_pitch_check CHECK ((length(pitch) <= 500))
);


--
-- Name: TABLE nominations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nominations IS 'Movie nominations for festivals. In endless mode, tracks pool/playing/completed status.';


--
-- Name: COLUMN nominations.endless_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nominations.endless_status IS 'For endless festivals: pool (nominated), playing (current), completed (watched)';


--
-- Name: COLUMN nominations.display_slot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nominations.display_slot IS 'Homepage display designation: featured or throwback';


--
-- Name: notification_dead_letter_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_dead_letter_queue (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    notification_id uuid,
    failed_at timestamp with time zone NOT NULL,
    retry_count integer DEFAULT 0,
    last_error text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_delivery_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_delivery_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    notification_id uuid,
    delivery_method text NOT NULL,
    status text NOT NULL,
    error_message text,
    attempted_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_delivery_log_delivery_method_check CHECK ((delivery_method = ANY (ARRAY['email'::text, 'push'::text]))),
    CONSTRAINT notification_delivery_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    club_id uuid,
    festival_id uuid,
    related_user_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'User notifications with support for archiving and read status';


--
-- Name: persons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tmdb_id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    birthday date,
    deathday date,
    place_of_birth text,
    profile_url text,
    known_for_department text,
    biography text,
    cached_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE persons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.persons IS 'Cached person data from TMDB (actors, directors)';


--
-- Name: private_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.private_notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    tmdb_id integer,
    note text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    festival_id uuid
);


--
-- Name: TABLE private_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.private_notes IS 'Personal notes users can add to any movie';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    festival_id uuid NOT NULL,
    nomination_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating numeric(3,1),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT ratings_normalized_range_check CHECK (((rating >= (0)::numeric) AND (rating <= (10)::numeric))),
    CONSTRAINT ratings_rating_check CHECK (((rating >= 0.1) AND (rating <= 10.0)))
);


--
-- Name: TABLE ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ratings IS 'User ratings for movies within festival context. All ratings are stored on a normalized 0-10 scale as of migration 20260117000000.';


--
-- Name: COLUMN ratings.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ratings.deleted_at IS 'Soft delete timestamp - NULL means active';


--
-- Name: search_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_analytics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    query text NOT NULL,
    filters jsonb,
    result_counts jsonb,
    total_results integer NOT NULL,
    has_results boolean GENERATED ALWAYS AS ((total_results > 0)) STORED,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE search_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.search_analytics IS 'Tracks search queries for improving search - auto-pruned after 90 days';


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    name text NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    slug text,
    subtitle text,
    CONSTRAINT seasons_check CHECK ((end_date > start_date))
);


--
-- Name: TABLE seasons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.seasons IS 'Competitive seasons within a club for tracking points and rankings';


--
-- Name: site_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_admins (
    user_id uuid NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT site_admins_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
);


--
-- Name: TABLE site_admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.site_admins IS 'Site-wide administrators with super_admin role for elevated permissions';


--
-- Name: site_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    is_active boolean DEFAULT true,
    show_on_landing boolean DEFAULT true,
    show_on_dashboard boolean DEFAULT true,
    priority integer DEFAULT 0,
    starts_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT site_announcements_type_check CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'update'::text])))
);


--
-- Name: TABLE site_announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.site_announcements IS 'Site-wide announcements shown to all users';


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: TABLE site_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.site_settings IS 'Global site configuration settings';


--
-- Name: stack_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stack_rankings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    festival_id uuid,
    user_id uuid,
    ranked_order jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE stack_rankings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stack_rankings IS 'User movie stack rankings for tiebreaker scoring';


--
-- Name: stripe_event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_event_log (
    event_id text NOT NULL,
    type text NOT NULL,
    processed_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text NOT NULL,
    plan text NOT NULL,
    trial_ends_at timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscriptions_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'pro'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'cancelled'::text, 'past_due'::text])))
);


--
-- Name: TABLE subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscriptions IS 'User subscription status for premium features';


--
-- Name: theme_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theme_pool (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    club_id uuid,
    theme_name text NOT NULL,
    added_by uuid,
    is_used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE theme_pool; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.theme_pool IS 'Pool of suggested themes for future festivals';


--
-- Name: theme_pool_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theme_pool_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    theme_id uuid NOT NULL,
    user_id uuid,
    vote_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT theme_pool_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['upvote'::text, 'downvote'::text])))
);


--
-- Name: TABLE theme_pool_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.theme_pool_votes IS 'Votes on theme pool suggestions';


--
-- Name: theme_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theme_votes (
    festival_id uuid NOT NULL,
    user_id uuid NOT NULL,
    theme_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE theme_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.theme_votes IS 'Votes on active festival theme options';


--
-- Name: tmdb_search_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmdb_search_cache (
    query text NOT NULL,
    results jsonb NOT NULL,
    cached_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    user_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    club_id uuid,
    earned_at timestamp with time zone DEFAULT now(),
    progress_jsonb jsonb DEFAULT '{}'::jsonb,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE user_badges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_badges IS 'Badges earned by users';


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_blocks_no_self_block CHECK ((blocker_id <> blocked_id))
);


--
-- Name: TABLE user_blocks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_blocks IS 'User-level blocking - allows users to block other users across the platform';


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    item_type text NOT NULL,
    title text NOT NULL,
    image_path text,
    subtitle text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_favorites_item_type_check CHECK ((item_type = ANY (ARRAY['movie'::text, 'person'::text])))
);


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'pending'::text,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_reports_no_self_report CHECK ((reporter_id <> reported_id)),
    CONSTRAINT user_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'actioned'::text, 'dismissed'::text])))
);


--
-- Name: TABLE user_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_reports IS 'User reports for moderation - users can report other users for review';


--
-- Name: user_rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    categories jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_all_clubs_default boolean DEFAULT false
);


--
-- Name: TABLE user_rubrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_rubrics IS 'Personal rating rubric library for users';


--
-- Name: COLUMN user_rubrics.categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_rubrics.categories IS 'Array of category objects: {id, name, weight, required, order}';


--
-- Name: COLUMN user_rubrics.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_rubrics.is_default IS 'Whether this is the user''s default rubric';


--
-- Name: COLUMN user_rubrics.is_all_clubs_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_rubrics.is_all_clubs_default IS 'When true, this rubric will automatically be set as the default when the user joins any new club';


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    user_id uuid NOT NULL,
    total_points numeric(10,1) DEFAULT 0,
    festivals_played integer DEFAULT 0,
    festivals_won integer DEFAULT 0,
    nominations_total integer DEFAULT 0,
    ratings_total integer DEFAULT 0,
    average_rating_given numeric(3,1),
    highest_rated_movie_id integer,
    lowest_rated_movie_id integer,
    last_active timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    avatar_url text,
    bio text,
    social_links jsonb DEFAULT '{}'::jsonb,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    date_of_birth date,
    favorite_movie_tmdb_id integer,
    favorite_director_tmdb_id integer,
    favorite_composer_tmdb_id integer,
    sidebar_nav_preferences jsonb,
    mobile_nav_preferences jsonb,
    rating_preferences jsonb DEFAULT '{"rating_max": 10, "rating_min": 0, "rating_unit": "numbers", "allow_half_icons": false, "rating_increment": 0.5, "rating_visual_icon": "stars"}'::jsonb,
    favorite_actor_tmdb_id integer,
    accessibility_preferences jsonb DEFAULT '{}'::jsonb,
    avatar_icon text,
    avatar_color_index integer,
    avatar_border_color_index integer,
    watch_history_private boolean DEFAULT false,
    watch_provider_region text DEFAULT 'US'::text,
    show_watch_providers boolean DEFAULT true,
    hidden_providers integer[],
    favorite_genres text[],
    show_profile_popup boolean DEFAULT true,
    featured_badge_ids text[] DEFAULT '{}'::text[],
    id_card_settings jsonb DEFAULT '{}'::jsonb,
    clubs_count integer DEFAULT 0,
    movies_watched_count integer DEFAULT 0,
    discussion_preferences jsonb,
    last_display_name_change timestamp with time zone,
    dismissed_hints jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT check_age_13_plus CHECK (((date_of_birth IS NULL) OR (date_of_birth <= (CURRENT_DATE - '13 years'::interval)))),
    CONSTRAINT users_featured_badge_ids_max_5 CHECK (((array_length(featured_badge_ids, 1) IS NULL) OR (array_length(featured_badge_ids, 1) <= 5)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'User profiles linked to auth.users, contains display name, avatar, and preferences';


--
-- Name: COLUMN users.date_of_birth; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.date_of_birth IS 'User date of birth for age calculation (COPPA compliance - must be 13+)';


--
-- Name: COLUMN users.favorite_movie_tmdb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.favorite_movie_tmdb_id IS 'TMDB ID of user''s favorite movie';


--
-- Name: COLUMN users.favorite_director_tmdb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.favorite_director_tmdb_id IS 'TMDB ID of user''s favorite director';


--
-- Name: COLUMN users.favorite_composer_tmdb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.favorite_composer_tmdb_id IS 'TMDB ID of user''s favorite composer';


--
-- Name: COLUMN users.sidebar_nav_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.sidebar_nav_preferences IS 'JSON object containing user preferences for desktop sidebar item ordering. Structure: { itemOrder: string[] }';


--
-- Name: COLUMN users.mobile_nav_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.mobile_nav_preferences IS 'User customization for mobile bottom navigation bar. Structure: { "items": ["clubs", "search", "home", "discover", "activity"], "itemCount": 5, "favoriteClubId": "uuid-or-null" }. Items can include: home, clubs, search, discover, profile, activity, favorite_club, upcoming.';


--
-- Name: COLUMN users.rating_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.rating_preferences IS 'User preferences for personal rating scale: min/max values, increment, display type (numbers/visual), icon type, and half-icon support';


--
-- Name: COLUMN users.favorite_actor_tmdb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.favorite_actor_tmdb_id IS 'TMDB ID of the user''s favorite actor, used for profile display';


--
-- Name: COLUMN users.accessibility_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.accessibility_preferences IS 'User accessibility preferences including colorblind mode, dyslexia font, and high contrast settings';


--
-- Name: COLUMN users.avatar_icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.avatar_icon IS 'Custom avatar icon (emoji ID or "letter" or "photo")';


--
-- Name: COLUMN users.avatar_color_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.avatar_color_index IS 'Index into avatar color palette';


--
-- Name: COLUMN users.avatar_border_color_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.avatar_border_color_index IS 'Index into avatar border color palette';


--
-- Name: COLUMN users.watch_history_private; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.watch_history_private IS 'Whether watch history is private';


--
-- Name: COLUMN users.watch_provider_region; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.watch_provider_region IS 'Region code for streaming provider display';


--
-- Name: COLUMN users.show_watch_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.show_watch_providers IS 'Whether to show streaming providers';


--
-- Name: COLUMN users.hidden_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.hidden_providers IS 'Array of hidden streaming provider IDs';


--
-- Name: COLUMN users.favorite_genres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.favorite_genres IS 'Array of favorite genre names';


--
-- Name: COLUMN users.show_profile_popup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.show_profile_popup IS 'Whether to show profile popup on hover';


--
-- Name: COLUMN users.featured_badge_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.featured_badge_ids IS 'Array of badge IDs (max 5) to display on user ID card';


--
-- Name: COLUMN users.id_card_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id_card_settings IS 'JSON settings for ID card display including social link visibility';


--
-- Name: watch_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    first_watched_at timestamp with time zone NOT NULL,
    contexts jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    watch_count integer DEFAULT 1 NOT NULL,
    CONSTRAINT watch_count_positive CHECK ((watch_count >= 1))
);


--
-- Name: TABLE watch_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.watch_history IS 'User movie watch history across all clubs';


--
-- Name: COLUMN watch_history.watch_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.watch_history.watch_count IS 'Number of times the user has watched this movie (minimum 1)';


--
-- Name: activity_log_archive activity_log_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log_archive
    ADD CONSTRAINT activity_log_archive_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: background_images background_images_entity_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.background_images
    ADD CONSTRAINT background_images_entity_unique UNIQUE (entity_type, entity_id);


--
-- Name: background_images background_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.background_images
    ADD CONSTRAINT background_images_pkey PRIMARY KEY (id);


--
-- Name: backrow_matinee backrow_matinee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backrow_matinee
    ADD CONSTRAINT backrow_matinee_pkey PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: blocked_users blocked_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_pkey PRIMARY KEY (club_id, user_id);


--
-- Name: chat_messages_archive chat_messages_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages_archive
    ADD CONSTRAINT chat_messages_archive_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: club_announcements club_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_announcements
    ADD CONSTRAINT club_announcements_pkey PRIMARY KEY (id);


--
-- Name: club_badges club_badges_club_id_badge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_badges
    ADD CONSTRAINT club_badges_club_id_badge_id_key UNIQUE (club_id, badge_id);


--
-- Name: club_badges club_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_badges
    ADD CONSTRAINT club_badges_pkey PRIMARY KEY (id);


--
-- Name: club_event_rsvps club_event_rsvps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_event_rsvps
    ADD CONSTRAINT club_event_rsvps_pkey PRIMARY KEY (event_id, user_id);


--
-- Name: club_events club_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_events
    ADD CONSTRAINT club_events_pkey PRIMARY KEY (id);


--
-- Name: club_invites club_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_invites
    ADD CONSTRAINT club_invites_pkey PRIMARY KEY (id);


--
-- Name: club_invites club_invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_invites
    ADD CONSTRAINT club_invites_token_key UNIQUE (token);


--
-- Name: club_join_requests club_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_join_requests
    ADD CONSTRAINT club_join_requests_pkey PRIMARY KEY (id);


--
-- Name: club_members club_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_members
    ADD CONSTRAINT club_members_pkey PRIMARY KEY (club_id, user_id);


--
-- Name: club_movie_pool club_movie_pool_club_id_tmdb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_movie_pool
    ADD CONSTRAINT club_movie_pool_club_id_tmdb_id_key UNIQUE (club_id, tmdb_id);


--
-- Name: club_movie_pool club_movie_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_movie_pool
    ADD CONSTRAINT club_movie_pool_pkey PRIMARY KEY (id);


--
-- Name: club_notes club_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_notes
    ADD CONSTRAINT club_notes_pkey PRIMARY KEY (id);


--
-- Name: club_poll_votes club_poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_poll_votes
    ADD CONSTRAINT club_poll_votes_pkey PRIMARY KEY (id);


--
-- Name: club_poll_votes club_poll_votes_poll_user_option_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_poll_votes
    ADD CONSTRAINT club_poll_votes_poll_user_option_unique UNIQUE (poll_id, user_id, option_index);


--
-- Name: club_polls club_polls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_polls
    ADD CONSTRAINT club_polls_pkey PRIMARY KEY (id);


--
-- Name: club_resources club_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_resources
    ADD CONSTRAINT club_resources_pkey PRIMARY KEY (id);


--
-- Name: club_stats club_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_stats
    ADD CONSTRAINT club_stats_pkey PRIMARY KEY (club_id);


--
-- Name: club_word_blacklist club_word_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_word_blacklist
    ADD CONSTRAINT club_word_blacklist_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_name_key UNIQUE (name);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: contact_submissions contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_submissions
    ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: curated_collections curated_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_collections
    ADD CONSTRAINT curated_collections_pkey PRIMARY KEY (id);


--
-- Name: curated_collections curated_collections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_collections
    ADD CONSTRAINT curated_collections_slug_key UNIQUE (slug);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: discussion_comments discussion_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_pkey PRIMARY KEY (id);


--
-- Name: discussion_thread_tags discussion_thread_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT discussion_thread_tags_pkey PRIMARY KEY (id);


--
-- Name: discussion_thread_unlocks discussion_thread_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_unlocks
    ADD CONSTRAINT discussion_thread_unlocks_pkey PRIMARY KEY (id);


--
-- Name: discussion_threads discussion_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_threads
    ADD CONSTRAINT discussion_threads_pkey PRIMARY KEY (id);


--
-- Name: discussion_votes discussion_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_pkey PRIMARY KEY (id);


--
-- Name: email_digest_log email_digest_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_digest_log
    ADD CONSTRAINT email_digest_log_pkey PRIMARY KEY (id);


--
-- Name: favorite_clubs favorite_clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_clubs
    ADD CONSTRAINT favorite_clubs_pkey PRIMARY KEY (user_id, club_id);


--
-- Name: feedback_items feedback_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_items
    ADD CONSTRAINT feedback_items_pkey PRIMARY KEY (id);


--
-- Name: feedback_votes feedback_votes_feedback_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_feedback_id_user_id_key UNIQUE (feedback_id, user_id);


--
-- Name: feedback_votes feedback_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_pkey PRIMARY KEY (id);


--
-- Name: festival_results festival_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_results
    ADD CONSTRAINT festival_results_pkey PRIMARY KEY (festival_id);


--
-- Name: festival_rubric_locks festival_rubric_locks_festival_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_rubric_locks
    ADD CONSTRAINT festival_rubric_locks_festival_id_user_id_key UNIQUE (festival_id, user_id);


--
-- Name: festival_rubric_locks festival_rubric_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_rubric_locks
    ADD CONSTRAINT festival_rubric_locks_pkey PRIMARY KEY (id);


--
-- Name: festival_standings festival_standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_standings
    ADD CONSTRAINT festival_standings_pkey PRIMARY KEY (festival_id, user_id);


--
-- Name: festivals festivals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festivals
    ADD CONSTRAINT festivals_pkey PRIMARY KEY (id);


--
-- Name: filter_analytics filter_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filter_analytics
    ADD CONSTRAINT filter_analytics_pkey PRIMARY KEY (id);


--
-- Name: future_nomination_links future_nomination_links_future_nomination_id_festival_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_links
    ADD CONSTRAINT future_nomination_links_future_nomination_id_festival_id_key UNIQUE (future_nomination_id, festival_id);


--
-- Name: future_nomination_links future_nomination_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_links
    ADD CONSTRAINT future_nomination_links_pkey PRIMARY KEY (id);


--
-- Name: future_nomination_list future_nomination_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_list
    ADD CONSTRAINT future_nomination_list_pkey PRIMARY KEY (id);


--
-- Name: future_nomination_list future_nomination_list_user_id_tmdb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_list
    ADD CONSTRAINT future_nomination_list_user_id_tmdb_id_key UNIQUE (user_id, tmdb_id);


--
-- Name: generic_ratings generic_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generic_ratings
    ADD CONSTRAINT generic_ratings_pkey PRIMARY KEY (user_id, tmdb_id);


--
-- Name: hidden_activities hidden_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_activities
    ADD CONSTRAINT hidden_activities_pkey PRIMARY KEY (user_id, activity_id);


--
-- Name: hidden_watch_history hidden_watch_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_watch_history
    ADD CONSTRAINT hidden_watch_history_pkey PRIMARY KEY (user_id, tmdb_id);


--
-- Name: movie_pool_votes movie_pool_votes_nomination_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_pool_votes
    ADD CONSTRAINT movie_pool_votes_nomination_id_user_id_key UNIQUE (nomination_id, user_id);


--
-- Name: movie_pool_votes movie_pool_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_pool_votes
    ADD CONSTRAINT movie_pool_votes_pkey PRIMARY KEY (id);


--
-- Name: movies movies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_pkey PRIMARY KEY (tmdb_id);


--
-- Name: nomination_guesses nomination_guesses_festival_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomination_guesses
    ADD CONSTRAINT nomination_guesses_festival_id_user_id_key UNIQUE (festival_id, user_id);


--
-- Name: nomination_guesses nomination_guesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomination_guesses
    ADD CONSTRAINT nomination_guesses_pkey PRIMARY KEY (id);


--
-- Name: nominations nominations_festival_id_tmdb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_festival_id_tmdb_id_key UNIQUE (festival_id, tmdb_id);


--
-- Name: nominations nominations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_pkey PRIMARY KEY (id);


--
-- Name: notification_dead_letter_queue notification_dead_letter_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_dead_letter_queue
    ADD CONSTRAINT notification_dead_letter_queue_pkey PRIMARY KEY (id);


--
-- Name: notification_delivery_log notification_delivery_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_log
    ADD CONSTRAINT notification_delivery_log_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- Name: persons persons_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_slug_key UNIQUE (slug);


--
-- Name: persons persons_tmdb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_tmdb_id_key UNIQUE (tmdb_id);


--
-- Name: private_notes private_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_notes
    ADD CONSTRAINT private_notes_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: search_analytics search_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_club_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_club_id_name_key UNIQUE (club_id, name);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: site_admins site_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_admins
    ADD CONSTRAINT site_admins_pkey PRIMARY KEY (user_id);


--
-- Name: site_announcements site_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_announcements
    ADD CONSTRAINT site_announcements_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: stack_rankings stack_rankings_festival_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stack_rankings
    ADD CONSTRAINT stack_rankings_festival_id_user_id_key UNIQUE (festival_id, user_id);


--
-- Name: stack_rankings stack_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stack_rankings
    ADD CONSTRAINT stack_rankings_pkey PRIMARY KEY (id);


--
-- Name: stripe_event_log stripe_event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_event_log
    ADD CONSTRAINT stripe_event_log_pkey PRIMARY KEY (event_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: theme_pool theme_pool_club_id_theme_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool
    ADD CONSTRAINT theme_pool_club_id_theme_name_key UNIQUE (club_id, theme_name);


--
-- Name: theme_pool theme_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool
    ADD CONSTRAINT theme_pool_pkey PRIMARY KEY (id);


--
-- Name: theme_pool_votes theme_pool_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool_votes
    ADD CONSTRAINT theme_pool_votes_pkey PRIMARY KEY (id);


--
-- Name: theme_pool_votes theme_pool_votes_theme_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool_votes
    ADD CONSTRAINT theme_pool_votes_theme_id_user_id_key UNIQUE (theme_id, user_id);


--
-- Name: theme_votes theme_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_votes
    ADD CONSTRAINT theme_votes_pkey PRIMARY KEY (festival_id, user_id);


--
-- Name: tmdb_search_cache tmdb_search_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmdb_search_cache
    ADD CONSTRAINT tmdb_search_cache_pkey PRIMARY KEY (query);


--
-- Name: discussion_thread_tags unique_festival_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT unique_festival_tag UNIQUE (thread_id, tag_type, festival_id);


--
-- Name: discussion_thread_tags unique_movie_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT unique_movie_tag UNIQUE (thread_id, tag_type, tmdb_id);


--
-- Name: discussion_thread_tags unique_person_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT unique_person_tag UNIQUE (thread_id, tag_type, person_tmdb_id);


--
-- Name: club_poll_votes unique_poll_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_poll_votes
    ADD CONSTRAINT unique_poll_user UNIQUE (poll_id, user_id);


--
-- Name: discussion_thread_unlocks unique_thread_unlock; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_unlocks
    ADD CONSTRAINT unique_thread_unlock UNIQUE (thread_id, user_id);


--
-- Name: ratings unique_user_nomination_rating; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT unique_user_nomination_rating UNIQUE (nomination_id, user_id);


--
-- Name: discussion_votes unique_user_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT unique_user_vote UNIQUE (user_id, thread_id, comment_id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_user_badge_club_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_badge_club_unique UNIQUE NULLS NOT DISTINCT (user_id, badge_id, club_id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_user_id_tmdb_id_item_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_tmdb_id_item_type_key UNIQUE (user_id, tmdb_id, item_type);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);


--
-- Name: user_rubrics user_rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rubrics
    ADD CONSTRAINT user_rubrics_pkey PRIMARY KEY (id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: watch_history watch_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_pkey PRIMARY KEY (id);


--
-- Name: watch_history watch_history_user_id_tmdb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_user_id_tmdb_id_key UNIQUE (user_id, tmdb_id);


--
-- Name: idx_activity_log_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_club ON public.activity_log USING btree (club_id);


--
-- Name: idx_activity_log_club_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_club_created ON public.activity_log USING btree (club_id, created_at DESC) WHERE (club_id IS NOT NULL);


--
-- Name: INDEX idx_activity_log_club_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_activity_log_club_created IS 'Optimizes club-specific activity feed queries';


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);


--
-- Name: INDEX idx_activity_log_created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_activity_log_created_at IS 'Optimizes activity feed queries sorted by time';


--
-- Name: idx_activity_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user ON public.activity_log USING btree (user_id);


--
-- Name: idx_activity_log_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user_created ON public.activity_log USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);


--
-- Name: INDEX idx_activity_log_user_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_activity_log_user_created IS 'Optimizes user-specific activity feed queries';


--
-- Name: idx_background_images_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_background_images_active ON public.background_images USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_background_images_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_background_images_entity ON public.background_images USING btree (entity_type, entity_id);


--
-- Name: idx_backrow_matinee_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backrow_matinee_active ON public.backrow_matinee USING btree (featured_at DESC);


--
-- Name: idx_backrow_matinee_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backrow_matinee_club ON public.backrow_matinee USING btree (club_id);


--
-- Name: idx_backrow_matinee_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backrow_matinee_tmdb_id ON public.backrow_matinee USING btree (tmdb_id);


--
-- Name: idx_badges_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_badges_category ON public.badges USING btree (((requirements_jsonb ->> 'category'::text)));


--
-- Name: idx_badges_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_badges_club ON public.badges USING btree (club_id) WHERE (club_id IS NOT NULL);


--
-- Name: idx_badges_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_badges_type ON public.badges USING btree (badge_type);


--
-- Name: idx_blocked_users_blocked_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_users_blocked_by ON public.blocked_users USING btree (blocked_by);


--
-- Name: idx_blocked_users_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_users_club_id ON public.blocked_users USING btree (club_id);


--
-- Name: idx_blocked_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_users_user_id ON public.blocked_users USING btree (user_id);


--
-- Name: idx_chat_messages_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_club_id ON public.chat_messages USING btree (club_id);


--
-- Name: idx_chat_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages USING btree (user_id);


--
-- Name: idx_club_announcements_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_announcements_club_id ON public.club_announcements USING btree (club_id, created_at DESC);


--
-- Name: idx_club_announcements_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_announcements_type ON public.club_announcements USING btree (club_id, announcement_type);


--
-- Name: idx_club_announcements_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_announcements_user_id ON public.club_announcements USING btree (user_id);


--
-- Name: idx_club_badges_badge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_badges_badge_id ON public.club_badges USING btree (badge_id);


--
-- Name: idx_club_badges_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_badges_club_id ON public.club_badges USING btree (club_id);


--
-- Name: idx_club_badges_earned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_badges_earned ON public.club_badges USING btree (earned_at) WHERE (earned_at IS NOT NULL);


--
-- Name: idx_club_event_rsvps_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_event_rsvps_status ON public.club_event_rsvps USING btree (status);


--
-- Name: idx_club_event_rsvps_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_event_rsvps_user_id ON public.club_event_rsvps USING btree (user_id);


--
-- Name: idx_club_events_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_events_club_id ON public.club_events USING btree (club_id);


--
-- Name: idx_club_events_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_events_created_by ON public.club_events USING btree (created_by);


--
-- Name: idx_club_events_event_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_events_event_date ON public.club_events USING btree (event_date);


--
-- Name: idx_club_events_poll_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_events_poll_id ON public.club_events USING btree (poll_id);


--
-- Name: idx_club_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_events_status ON public.club_events USING btree (status);


--
-- Name: idx_club_events_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_events_tmdb_id ON public.club_events USING btree (tmdb_id);


--
-- Name: idx_club_invites_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_invites_club_id ON public.club_invites USING btree (club_id);


--
-- Name: idx_club_invites_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_invites_created_by ON public.club_invites USING btree (created_by);


--
-- Name: idx_club_invites_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_invites_token ON public.club_invites USING btree (token);


--
-- Name: idx_club_invites_used_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_invites_used_by ON public.club_invites USING btree (used_by);


--
-- Name: idx_club_join_requests_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_join_requests_reviewed_by ON public.club_join_requests USING btree (reviewed_by);


--
-- Name: idx_club_members_club_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_members_club_role ON public.club_members USING btree (club_id, role);


--
-- Name: idx_club_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_members_user ON public.club_members USING btree (user_id);


--
-- Name: idx_club_movie_pool_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_movie_pool_club_id ON public.club_movie_pool USING btree (club_id);


--
-- Name: idx_club_movie_pool_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_movie_pool_created_at ON public.club_movie_pool USING btree (created_at DESC);


--
-- Name: idx_club_movie_pool_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_movie_pool_tmdb_id ON public.club_movie_pool USING btree (tmdb_id);


--
-- Name: idx_club_movie_pool_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_movie_pool_user_id ON public.club_movie_pool USING btree (user_id);


--
-- Name: idx_club_notes_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_notes_club_id ON public.club_notes USING btree (club_id);


--
-- Name: idx_club_notes_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_notes_tmdb_id ON public.club_notes USING btree (tmdb_id);


--
-- Name: idx_club_notes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_notes_user_id ON public.club_notes USING btree (user_id);


--
-- Name: idx_club_poll_votes_poll_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_poll_votes_poll_id ON public.club_poll_votes USING btree (poll_id);


--
-- Name: idx_club_poll_votes_poll_option; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_poll_votes_poll_option ON public.club_poll_votes USING btree (poll_id, option_index);


--
-- Name: idx_club_poll_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_poll_votes_user_id ON public.club_poll_votes USING btree (user_id);


--
-- Name: idx_club_polls_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_polls_action_type ON public.club_polls USING btree (action_type) WHERE (action_type IS NOT NULL);


--
-- Name: idx_club_polls_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_polls_club_id ON public.club_polls USING btree (club_id, created_at DESC);


--
-- Name: idx_club_polls_is_anonymous; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_polls_is_anonymous ON public.club_polls USING btree (is_anonymous) WHERE (is_anonymous = true);


--
-- Name: idx_club_polls_unprocessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_polls_unprocessed ON public.club_polls USING btree (expires_at) WHERE ((processed_at IS NULL) AND (action_type IS NOT NULL));


--
-- Name: idx_club_polls_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_polls_user_id ON public.club_polls USING btree (user_id);


--
-- Name: idx_club_resources_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_resources_club_id ON public.club_resources USING btree (club_id);


--
-- Name: idx_club_resources_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_resources_created_by ON public.club_resources USING btree (created_by);


--
-- Name: idx_club_stats_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_stats_activity ON public.club_stats USING btree (last_activity DESC);


--
-- Name: idx_club_word_blacklist_added_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_word_blacklist_added_by ON public.club_word_blacklist USING btree (added_by);


--
-- Name: idx_club_word_blacklist_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_club_word_blacklist_club_id ON public.club_word_blacklist USING btree (club_id);


--
-- Name: idx_club_word_blacklist_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_club_word_blacklist_unique ON public.club_word_blacklist USING btree (club_id, lower(word));


--
-- Name: idx_clubs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_active ON public.clubs USING btree (privacy) WHERE (archived = false);


--
-- Name: idx_clubs_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_featured ON public.clubs USING btree (featured, featured_at DESC) WHERE (featured = true);


--
-- Name: idx_clubs_featured_badge_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_featured_badge_ids ON public.clubs USING gin (featured_badge_ids);


--
-- Name: idx_clubs_festival_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_festival_type ON public.clubs USING btree (festival_type);


--
-- Name: idx_clubs_genres; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_genres ON public.clubs USING gin (genres);


--
-- Name: idx_clubs_producer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_producer_id ON public.clubs USING btree (producer_id);


--
-- Name: idx_clubs_scoring_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_scoring_enabled ON public.clubs USING btree (scoring_enabled);


--
-- Name: idx_clubs_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_slug ON public.clubs USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_clubs_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_clubs_slug_unique ON public.clubs USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_curated_collections_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_collections_active ON public.curated_collections USING btree (is_active, display_order);


--
-- Name: idx_curated_collections_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_collections_slug ON public.curated_collections USING btree (slug);


--
-- Name: idx_direct_messages_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_club ON public.direct_messages USING btree (club_id);


--
-- Name: idx_direct_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_conversation ON public.direct_messages USING btree (sender_id, recipient_id, club_id, created_at DESC);


--
-- Name: idx_direct_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_created_at ON public.direct_messages USING btree (created_at DESC);


--
-- Name: idx_direct_messages_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_recipient ON public.direct_messages USING btree (recipient_id);


--
-- Name: idx_direct_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_sender ON public.direct_messages USING btree (sender_id);


--
-- Name: idx_discussion_comments_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_comments_active ON public.discussion_comments USING btree (thread_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_discussion_comments_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_comments_author ON public.discussion_comments USING btree (author_id);


--
-- Name: idx_discussion_comments_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_comments_created ON public.discussion_comments USING btree (created_at DESC);


--
-- Name: idx_discussion_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_comments_parent ON public.discussion_comments USING btree (parent_id) WHERE (parent_id IS NOT NULL);


--
-- Name: idx_discussion_comments_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_comments_thread ON public.discussion_comments USING btree (thread_id);


--
-- Name: idx_discussion_comments_thread_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_comments_thread_parent ON public.discussion_comments USING btree (thread_id, parent_id);


--
-- Name: idx_discussion_thread_tags_festival_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_thread_tags_festival_id ON public.discussion_thread_tags USING btree (festival_id) WHERE (festival_id IS NOT NULL);


--
-- Name: idx_discussion_thread_tags_person_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_thread_tags_person_tmdb_id ON public.discussion_thread_tags USING btree (person_tmdb_id) WHERE (person_tmdb_id IS NOT NULL);


--
-- Name: idx_discussion_thread_tags_tag_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_thread_tags_tag_type ON public.discussion_thread_tags USING btree (tag_type);


--
-- Name: idx_discussion_thread_tags_thread_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_thread_tags_thread_id ON public.discussion_thread_tags USING btree (thread_id);


--
-- Name: idx_discussion_thread_tags_thread_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_thread_tags_thread_type ON public.discussion_thread_tags USING btree (thread_id, tag_type);


--
-- Name: idx_discussion_thread_tags_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_thread_tags_tmdb_id ON public.discussion_thread_tags USING btree (tmdb_id) WHERE (tmdb_id IS NOT NULL);


--
-- Name: idx_discussion_threads_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_author_id ON public.discussion_threads USING btree (author_id);


--
-- Name: idx_discussion_threads_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_club ON public.discussion_threads USING btree (club_id);


--
-- Name: idx_discussion_threads_club_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_club_created ON public.discussion_threads USING btree (club_id, created_at DESC);


--
-- Name: INDEX idx_discussion_threads_club_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_discussion_threads_club_created IS 'Optimizes discussion listing by club';


--
-- Name: idx_discussion_threads_club_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_discussion_threads_club_slug ON public.discussion_threads USING btree (club_id, slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_discussion_threads_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_created ON public.discussion_threads USING btree (created_at DESC);


--
-- Name: idx_discussion_threads_festival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_festival ON public.discussion_threads USING btree (festival_id) WHERE (festival_id IS NOT NULL);


--
-- Name: idx_discussion_threads_person_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_person_tmdb_id ON public.discussion_threads USING btree (person_tmdb_id) WHERE (person_tmdb_id IS NOT NULL);


--
-- Name: idx_discussion_threads_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_pinned ON public.discussion_threads USING btree (club_id, is_pinned) WHERE (is_pinned = true);


--
-- Name: idx_discussion_threads_slug_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_slug_lookup ON public.discussion_threads USING btree (club_id, slug);


--
-- Name: idx_discussion_threads_tmdb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_tmdb ON public.discussion_threads USING btree (tmdb_id) WHERE (tmdb_id IS NOT NULL);


--
-- Name: idx_discussion_threads_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_type ON public.discussion_threads USING btree (thread_type);


--
-- Name: idx_discussion_threads_upvotes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_threads_upvotes ON public.discussion_threads USING btree (upvotes DESC);


--
-- Name: idx_discussion_unlocks_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_unlocks_thread ON public.discussion_thread_unlocks USING btree (thread_id);


--
-- Name: idx_discussion_unlocks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_unlocks_user ON public.discussion_thread_unlocks USING btree (user_id);


--
-- Name: idx_discussion_votes_comment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_votes_comment ON public.discussion_votes USING btree (comment_id) WHERE (comment_id IS NOT NULL);


--
-- Name: idx_discussion_votes_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_votes_thread ON public.discussion_votes USING btree (thread_id) WHERE (thread_id IS NOT NULL);


--
-- Name: idx_discussion_votes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_votes_user ON public.discussion_votes USING btree (user_id);


--
-- Name: idx_email_digest_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_digest_log_user_id ON public.email_digest_log USING btree (user_id);


--
-- Name: idx_favorite_clubs_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_clubs_club_id ON public.favorite_clubs USING btree (club_id);


--
-- Name: idx_favorite_clubs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_clubs_user_id ON public.favorite_clubs USING btree (user_id);


--
-- Name: idx_feedback_items_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_items_created_at ON public.feedback_items USING btree (created_at DESC);


--
-- Name: idx_feedback_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_items_status ON public.feedback_items USING btree (status);


--
-- Name: idx_feedback_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_items_type ON public.feedback_items USING btree (type);


--
-- Name: idx_feedback_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_items_user_id ON public.feedback_items USING btree (user_id);


--
-- Name: idx_feedback_votes_feedback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_votes_feedback_id ON public.feedback_votes USING btree (feedback_id);


--
-- Name: idx_feedback_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_votes_user_id ON public.feedback_votes USING btree (user_id);


--
-- Name: idx_festival_rubric_locks_festival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festival_rubric_locks_festival ON public.festival_rubric_locks USING btree (festival_id);


--
-- Name: idx_festival_rubric_locks_rubric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festival_rubric_locks_rubric ON public.festival_rubric_locks USING btree (rubric_id) WHERE (rubric_id IS NOT NULL);


--
-- Name: idx_festival_rubric_locks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festival_rubric_locks_user ON public.festival_rubric_locks USING btree (user_id);


--
-- Name: idx_festivals_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festivals_active ON public.festivals USING btree (club_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_festivals_club_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_festivals_club_slug_unique ON public.festivals USING btree (club_id, slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_festivals_club_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festivals_club_status ON public.festivals USING btree (club_id, status);


--
-- Name: idx_festivals_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festivals_dates ON public.festivals USING btree (rating_deadline, results_date);


--
-- Name: idx_festivals_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festivals_phase ON public.festivals USING btree (phase);


--
-- Name: idx_festivals_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festivals_season ON public.festivals USING btree (season_id);


--
-- Name: idx_festivals_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festivals_slug ON public.festivals USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_festivals_theme_selected_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_festivals_theme_selected_by ON public.festivals USING btree (theme_selected_by) WHERE (theme_selected_by IS NOT NULL);


--
-- Name: idx_filter_analytics_combination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_filter_analytics_combination ON public.filter_analytics USING gin (filter_combination);


--
-- Name: idx_filter_analytics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_filter_analytics_created ON public.filter_analytics USING btree (created_at DESC);


--
-- Name: idx_filter_analytics_has_results; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_filter_analytics_has_results ON public.filter_analytics USING btree (has_results, created_at DESC);


--
-- Name: idx_filter_analytics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_filter_analytics_user ON public.filter_analytics USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_future_nomination_links_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_links_club_id ON public.future_nomination_links USING btree (club_id);


--
-- Name: idx_future_nomination_links_festival_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_links_festival_id ON public.future_nomination_links USING btree (festival_id);


--
-- Name: idx_future_nomination_links_future_nom_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_links_future_nom_club ON public.future_nomination_links USING btree (future_nomination_id, club_id);


--
-- Name: idx_future_nomination_links_future_nomination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_links_future_nomination_id ON public.future_nomination_links USING btree (future_nomination_id);


--
-- Name: idx_future_nomination_links_nominated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_links_nominated ON public.future_nomination_links USING btree (nominated) WHERE (nominated = false);


--
-- Name: idx_future_nomination_links_theme_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_links_theme_pool_id ON public.future_nomination_links USING btree (theme_pool_id) WHERE (theme_pool_id IS NOT NULL);


--
-- Name: idx_future_nomination_list_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_list_created_at ON public.future_nomination_list USING btree (created_at DESC);


--
-- Name: idx_future_nomination_list_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_list_tmdb_id ON public.future_nomination_list USING btree (tmdb_id);


--
-- Name: idx_future_nomination_list_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_nomination_list_user_id ON public.future_nomination_list USING btree (user_id);


--
-- Name: idx_generic_ratings_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generic_ratings_tmdb_id ON public.generic_ratings USING btree (tmdb_id);


--
-- Name: idx_generic_ratings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generic_ratings_user_id ON public.generic_ratings USING btree (user_id);


--
-- Name: idx_hidden_activities_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hidden_activities_activity_id ON public.hidden_activities USING btree (activity_id);


--
-- Name: idx_hidden_activities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hidden_activities_user_id ON public.hidden_activities USING btree (user_id);


--
-- Name: idx_hidden_watch_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hidden_watch_history_user_id ON public.hidden_watch_history USING btree (user_id);


--
-- Name: idx_join_requests_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_join_requests_club_id ON public.club_join_requests USING btree (club_id);


--
-- Name: idx_join_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_join_requests_created_at ON public.club_join_requests USING btree (created_at DESC);


--
-- Name: idx_join_requests_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_join_requests_pending ON public.club_join_requests USING btree (club_id) WHERE (status = 'pending'::text);


--
-- Name: idx_join_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_join_requests_status ON public.club_join_requests USING btree (club_id, status);


--
-- Name: idx_join_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_join_requests_user_id ON public.club_join_requests USING btree (user_id);


--
-- Name: idx_movie_pool_votes_club_pool_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_pool_votes_club_pool_item_id ON public.movie_pool_votes USING btree (club_pool_item_id);


--
-- Name: idx_movie_pool_votes_club_pool_item_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_pool_votes_club_pool_item_user ON public.movie_pool_votes USING btree (club_pool_item_id, user_id);


--
-- Name: idx_movie_pool_votes_nomination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_pool_votes_nomination_id ON public.movie_pool_votes USING btree (nomination_id);


--
-- Name: idx_movie_pool_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_pool_votes_user_id ON public.movie_pool_votes USING btree (user_id);


--
-- Name: idx_movie_pool_votes_vote_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_pool_votes_vote_type ON public.movie_pool_votes USING btree (nomination_id, vote_type);


--
-- Name: idx_movies_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movies_slug ON public.movies USING btree (slug);


--
-- Name: idx_movies_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_movies_slug_unique ON public.movies USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_nomination_guesses_festival_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nomination_guesses_festival_id ON public.nomination_guesses USING btree (festival_id);


--
-- Name: idx_nomination_guesses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nomination_guesses_user_id ON public.nomination_guesses USING btree (user_id);


--
-- Name: idx_nominations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_active ON public.nominations USING btree (festival_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_nominations_display_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_display_slot ON public.nominations USING btree (display_slot) WHERE (display_slot IS NOT NULL);


--
-- Name: idx_nominations_endless_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_endless_status ON public.nominations USING btree (endless_status) WHERE (endless_status IS NOT NULL);


--
-- Name: idx_nominations_festival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_festival ON public.nominations USING btree (festival_id);


--
-- Name: idx_nominations_festival_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_festival_active ON public.nominations USING btree (festival_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_nominations_festival_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_nominations_festival_active IS 'Optimizes festival nomination queries excluding deleted';


--
-- Name: idx_nominations_festival_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_festival_user ON public.nominations USING btree (festival_id, user_id);


--
-- Name: idx_nominations_recently_watched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_recently_watched ON public.nominations USING btree (festival_id, endless_status, completed_at, hidden_from_history) WHERE ((endless_status = 'completed'::text) AND (deleted_at IS NULL));


--
-- Name: idx_nominations_tmdb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_tmdb ON public.nominations USING btree (tmdb_id);


--
-- Name: idx_nominations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominations_user ON public.nominations USING btree (user_id);


--
-- Name: idx_notification_dead_letter_queue_notification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_dead_letter_queue_notification_id ON public.notification_dead_letter_queue USING btree (notification_id);


--
-- Name: idx_notification_delivery_log_notification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_delivery_log_notification_id ON public.notification_delivery_log USING btree (notification_id);


--
-- Name: idx_notifications_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_archived ON public.notifications USING btree (user_id, archived, created_at) WHERE (archived = false);


--
-- Name: idx_notifications_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_club_id ON public.notifications USING btree (club_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_festival_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_festival_id ON public.notifications USING btree (festival_id);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (user_id, read);


--
-- Name: idx_notifications_related_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_related_user_id ON public.notifications USING btree (related_user_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_persons_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_name ON public.persons USING btree (name);


--
-- Name: idx_persons_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_slug ON public.persons USING btree (slug);


--
-- Name: idx_persons_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_tmdb_id ON public.persons USING btree (tmdb_id);


--
-- Name: idx_private_notes_festival_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_private_notes_festival_id ON public.private_notes USING btree (festival_id);


--
-- Name: idx_private_notes_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_private_notes_tmdb_id ON public.private_notes USING btree (tmdb_id);


--
-- Name: idx_private_notes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_private_notes_user_id ON public.private_notes USING btree (user_id);


--
-- Name: idx_private_notes_user_tmdb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_private_notes_user_tmdb ON public.private_notes USING btree (user_id, tmdb_id, created_at DESC);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_ratings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_active ON public.ratings USING btree (festival_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_ratings_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_created ON public.ratings USING btree (created_at DESC);


--
-- Name: idx_ratings_festival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_festival ON public.ratings USING btree (festival_id);


--
-- Name: idx_ratings_nomination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_nomination ON public.ratings USING btree (nomination_id);


--
-- Name: idx_ratings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_user ON public.ratings USING btree (user_id);


--
-- Name: INDEX idx_ratings_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_ratings_user IS 'Optimizes user rating history queries';


--
-- Name: idx_ratings_user_festival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_user_festival ON public.ratings USING btree (user_id, festival_id);


--
-- Name: idx_search_analytics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_created ON public.search_analytics USING btree (created_at DESC);


--
-- Name: idx_search_analytics_has_results; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_has_results ON public.search_analytics USING btree (has_results, created_at DESC);


--
-- Name: idx_search_analytics_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_query ON public.search_analytics USING btree (query);


--
-- Name: idx_search_analytics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_user ON public.search_analytics USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_site_admins_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_admins_created_by ON public.site_admins USING btree (created_by);


--
-- Name: idx_site_announcements_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_announcements_active ON public.site_announcements USING btree (is_active, starts_at, expires_at);


--
-- Name: idx_site_announcements_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_announcements_created_by ON public.site_announcements USING btree (created_by);


--
-- Name: idx_site_settings_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_settings_updated_by ON public.site_settings USING btree (updated_by);


--
-- Name: idx_stack_rankings_festival_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stack_rankings_festival_id ON public.stack_rankings USING btree (festival_id);


--
-- Name: idx_stack_rankings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stack_rankings_user_id ON public.stack_rankings USING btree (user_id);


--
-- Name: idx_standings_festival_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standings_festival_rank ON public.festival_standings USING btree (festival_id, rank);


--
-- Name: idx_standings_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standings_points ON public.festival_standings USING btree (points DESC);


--
-- Name: idx_standings_user_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standings_user_points ON public.festival_standings USING btree (user_id, points DESC);


--
-- Name: idx_theme_pool_added_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_pool_added_by ON public.theme_pool USING btree (added_by);


--
-- Name: idx_theme_pool_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_pool_club ON public.theme_pool USING btree (club_id);


--
-- Name: idx_theme_pool_votes_theme_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_pool_votes_theme_id ON public.theme_pool_votes USING btree (theme_id);


--
-- Name: idx_theme_pool_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_pool_votes_user_id ON public.theme_pool_votes USING btree (user_id);


--
-- Name: idx_theme_pool_votes_vote_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_pool_votes_vote_type ON public.theme_pool_votes USING btree (vote_type);


--
-- Name: idx_theme_votes_festival_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_votes_festival_id ON public.theme_votes USING btree (festival_id);


--
-- Name: idx_theme_votes_theme_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_votes_theme_id ON public.theme_votes USING btree (theme_id);


--
-- Name: idx_theme_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_votes_user_id ON public.theme_votes USING btree (user_id);


--
-- Name: idx_unique_auto_movie_thread_per_club; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_auto_movie_thread_per_club ON public.discussion_threads USING btree (club_id, tmdb_id) WHERE ((auto_created = true) AND (tmdb_id IS NOT NULL));


--
-- Name: INDEX idx_unique_auto_movie_thread_per_club; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_unique_auto_movie_thread_per_club IS 'Prevents race conditions from creating duplicate auto-created movie discussion threads. Only one auto-created thread per movie per club is allowed. Manual threads are not affected.';


--
-- Name: idx_user_badges_badge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_badge ON public.user_badges USING btree (badge_id);


--
-- Name: idx_user_badges_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_club ON public.user_badges USING btree (club_id) WHERE (club_id IS NOT NULL);


--
-- Name: idx_user_badges_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_user ON public.user_badges USING btree (user_id);


--
-- Name: idx_user_blocks_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_blocked ON public.user_blocks USING btree (blocked_id);


--
-- Name: idx_user_blocks_blocker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks USING btree (blocker_id);


--
-- Name: idx_user_favorites_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_featured ON public.user_favorites USING btree (user_id) WHERE (is_featured = true);


--
-- Name: idx_user_favorites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_user ON public.user_favorites USING btree (user_id, sort_order);


--
-- Name: idx_user_reports_reported; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_reported ON public.user_reports USING btree (reported_id);


--
-- Name: idx_user_reports_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_reporter ON public.user_reports USING btree (reporter_id);


--
-- Name: idx_user_reports_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_reviewed_by ON public.user_reports USING btree (reviewed_by);


--
-- Name: idx_user_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_status ON public.user_reports USING btree (status);


--
-- Name: idx_user_rubrics_all_clubs_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_rubrics_all_clubs_default ON public.user_rubrics USING btree (user_id) WHERE (is_all_clubs_default = true);


--
-- Name: idx_user_rubrics_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rubrics_is_default ON public.user_rubrics USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_user_rubrics_single_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_rubrics_single_default ON public.user_rubrics USING btree (user_id) WHERE (is_default = true);


--
-- Name: idx_user_rubrics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rubrics_user_id ON public.user_rubrics USING btree (user_id);


--
-- Name: idx_user_stats_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_stats_active ON public.user_stats USING btree (last_active DESC) WHERE (last_active IS NOT NULL);


--
-- Name: idx_user_stats_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_stats_points ON public.user_stats USING btree (total_points DESC);


--
-- Name: idx_users_favorite_actor_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_favorite_actor_tmdb_id ON public.users USING btree (favorite_actor_tmdb_id) WHERE (favorite_actor_tmdb_id IS NOT NULL);


--
-- Name: idx_users_featured_badge_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_featured_badge_ids ON public.users USING gin (featured_badge_ids);


--
-- Name: idx_users_mobile_nav_preferences; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_mobile_nav_preferences ON public.users USING btree (id) WHERE (mobile_nav_preferences IS NOT NULL);


--
-- Name: idx_watch_history_tmdb_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_history_tmdb_id ON public.watch_history USING btree (tmdb_id);


--
-- Name: idx_watch_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_history_user_id ON public.watch_history USING btree (user_id);


--
-- Name: idx_watch_history_user_tmdb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_history_user_tmdb ON public.watch_history USING btree (user_id, tmdb_id);


--
-- Name: INDEX idx_watch_history_user_tmdb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_watch_history_user_tmdb IS 'Optimizes watch status lookups';


--
-- Name: seasons_club_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX seasons_club_slug_unique ON public.seasons USING btree (club_id, slug) WHERE (slug IS NOT NULL);


--
-- Name: users auto_add_to_backrow; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_add_to_backrow AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.auto_add_user_to_backrow_club();


--
-- Name: festivals auto_create_festival_thread_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_create_festival_thread_trigger AFTER INSERT OR UPDATE ON public.festivals FOR EACH ROW EXECUTE FUNCTION public.auto_create_festival_thread();


--
-- Name: nominations auto_create_movie_thread_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_create_movie_thread_trigger AFTER INSERT OR UPDATE ON public.nominations FOR EACH ROW EXECUTE FUNCTION public.auto_create_movie_thread();


--
-- Name: watch_history auto_unlock_movie_thread_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_unlock_movie_thread_trigger AFTER INSERT ON public.watch_history FOR EACH ROW EXECUTE FUNCTION public.auto_unlock_movie_thread();


--
-- Name: festivals check_festival_dates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_festival_dates BEFORE INSERT OR UPDATE ON public.festivals FOR EACH ROW EXECUTE FUNCTION public.validate_festival_dates();


--
-- Name: club_notes club_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER club_notes_updated_at BEFORE UPDATE ON public.club_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: clubs clubs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: clubs enforce_festival_type_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_festival_type_lock BEFORE UPDATE ON public.clubs FOR EACH ROW WHEN ((old.settings IS DISTINCT FROM new.settings)) EXECUTE FUNCTION public.check_festival_type_change();


--
-- Name: user_rubrics ensure_single_default_rubric_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_default_rubric_trigger AFTER INSERT OR UPDATE OF is_default ON public.user_rubrics FOR EACH ROW WHEN ((new.is_default = true)) EXECUTE FUNCTION public.ensure_single_default_rubric();


--
-- Name: festivals festivals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER festivals_updated_at BEFORE UPDATE ON public.festivals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: future_nomination_list future_nomination_list_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER future_nomination_list_updated_at BEFORE UPDATE ON public.future_nomination_list FOR EACH ROW EXECUTE FUNCTION public.update_future_nomination_list_updated_at();


--
-- Name: generic_ratings generic_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generic_ratings_updated_at BEFORE UPDATE ON public.generic_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: private_notes private_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER private_notes_updated_at BEFORE UPDATE ON public.private_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: background_images set_background_images_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_background_images_updated_at BEFORE UPDATE ON public.background_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: club_event_rsvps set_club_event_rsvps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_club_event_rsvps_updated_at BEFORE UPDATE ON public.club_event_rsvps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: club_events set_club_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_club_events_updated_at BEFORE UPDATE ON public.club_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: club_resources set_club_resources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_club_resources_updated_at BEFORE UPDATE ON public.club_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: club_stats set_club_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_club_stats_updated_at BEFORE UPDATE ON public.club_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: curated_collections set_curated_collections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_curated_collections_updated_at BEFORE UPDATE ON public.curated_collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: discussion_comments set_discussion_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_discussion_comments_updated_at BEFORE UPDATE ON public.discussion_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: discussion_threads set_discussion_threads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_discussion_threads_updated_at BEFORE UPDATE ON public.discussion_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: feedback_items set_feedback_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_feedback_items_updated_at BEFORE UPDATE ON public.feedback_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: site_announcements set_site_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_site_announcements_updated_at BEFORE UPDATE ON public.site_announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: site_settings set_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_rubrics set_user_rubrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_user_rubrics_updated_at BEFORE UPDATE ON public.user_rubrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_stats set_user_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: festival_rubric_locks snapshot_rubric_on_lock_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER snapshot_rubric_on_lock_trigger BEFORE INSERT ON public.festival_rubric_locks FOR EACH ROW EXECUTE FUNCTION public.snapshot_rubric_on_lock();


--
-- Name: stack_rankings stack_rankings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stack_rankings_updated_at BEFORE UPDATE ON public.stack_rankings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: subscriptions subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: club_members trigger_update_user_clubs_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_clubs_count AFTER INSERT OR DELETE ON public.club_members FOR EACH ROW EXECUTE FUNCTION public.update_user_clubs_count();


--
-- Name: watch_history trigger_update_user_movies_watched_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_movies_watched_count AFTER INSERT OR DELETE ON public.watch_history FOR EACH ROW EXECUTE FUNCTION public.update_user_movies_watched_count();


--
-- Name: backrow_matinee update_backrow_matinee_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_backrow_matinee_updated_at BEFORE UPDATE ON public.backrow_matinee FOR EACH ROW EXECUTE FUNCTION public.update_backrow_matinee_updated_at();


--
-- Name: club_announcements update_club_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_club_announcements_updated_at BEFORE UPDATE ON public.club_announcements FOR EACH ROW EXECUTE FUNCTION public.update_club_admin_updated_at();


--
-- Name: club_polls update_club_polls_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_club_polls_updated_at BEFORE UPDATE ON public.club_polls FOR EACH ROW EXECUTE FUNCTION public.update_club_admin_updated_at();


--
-- Name: discussion_votes update_comment_upvote_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comment_upvote_count_trigger AFTER INSERT OR DELETE ON public.discussion_votes FOR EACH ROW EXECUTE FUNCTION public.update_comment_upvote_count();


--
-- Name: club_join_requests update_join_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON public.club_join_requests FOR EACH ROW EXECUTE FUNCTION public.update_join_request_updated_at();


--
-- Name: theme_pool_votes update_theme_pool_votes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_theme_pool_votes_updated_at BEFORE UPDATE ON public.theme_pool_votes FOR EACH ROW EXECUTE FUNCTION public.update_theme_pool_votes_updated_at();


--
-- Name: discussion_comments update_thread_comment_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_thread_comment_count_trigger AFTER INSERT OR DELETE ON public.discussion_comments FOR EACH ROW EXECUTE FUNCTION public.update_thread_comment_count();


--
-- Name: discussion_votes update_thread_upvote_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_thread_upvote_count_trigger AFTER INSERT OR DELETE ON public.discussion_votes FOR EACH ROW EXECUTE FUNCTION public.update_thread_upvote_count();


--
-- Name: festival_standings update_user_stats_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_stats_trigger AFTER INSERT ON public.festival_standings FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_from_standings();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: watch_history watch_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER watch_history_updated_at BEFORE UPDATE ON public.watch_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: activity_log activity_log_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: backrow_matinee backrow_matinee_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backrow_matinee
    ADD CONSTRAINT backrow_matinee_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: backrow_matinee backrow_matinee_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backrow_matinee
    ADD CONSTRAINT backrow_matinee_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id) ON DELETE CASCADE;


--
-- Name: badges badges_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: blocked_users blocked_users_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.users(id);


--
-- Name: blocked_users blocked_users_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: blocked_users blocked_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: club_announcements club_announcements_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_announcements
    ADD CONSTRAINT club_announcements_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_announcements club_announcements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_announcements
    ADD CONSTRAINT club_announcements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_badges club_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_badges
    ADD CONSTRAINT club_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;


--
-- Name: club_badges club_badges_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_badges
    ADD CONSTRAINT club_badges_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_event_rsvps club_event_rsvps_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_event_rsvps
    ADD CONSTRAINT club_event_rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.club_events(id) ON DELETE CASCADE;


--
-- Name: club_event_rsvps club_event_rsvps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_event_rsvps
    ADD CONSTRAINT club_event_rsvps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_events club_events_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_events
    ADD CONSTRAINT club_events_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_events club_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_events
    ADD CONSTRAINT club_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: club_events club_events_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_events
    ADD CONSTRAINT club_events_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.club_polls(id) ON DELETE SET NULL;


--
-- Name: club_events club_events_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_events
    ADD CONSTRAINT club_events_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id);


--
-- Name: club_invites club_invites_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_invites
    ADD CONSTRAINT club_invites_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_invites club_invites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_invites
    ADD CONSTRAINT club_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: club_invites club_invites_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_invites
    ADD CONSTRAINT club_invites_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id);


--
-- Name: club_join_requests club_join_requests_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_join_requests
    ADD CONSTRAINT club_join_requests_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_join_requests club_join_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_join_requests
    ADD CONSTRAINT club_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: club_join_requests club_join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_join_requests
    ADD CONSTRAINT club_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_members club_members_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_members
    ADD CONSTRAINT club_members_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_members club_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_members
    ADD CONSTRAINT club_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_movie_pool club_movie_pool_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_movie_pool
    ADD CONSTRAINT club_movie_pool_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_movie_pool club_movie_pool_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_movie_pool
    ADD CONSTRAINT club_movie_pool_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id) ON DELETE CASCADE;


--
-- Name: club_movie_pool club_movie_pool_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_movie_pool
    ADD CONSTRAINT club_movie_pool_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_notes club_notes_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_notes
    ADD CONSTRAINT club_notes_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_notes club_notes_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_notes
    ADD CONSTRAINT club_notes_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id);


--
-- Name: club_notes club_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_notes
    ADD CONSTRAINT club_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: club_poll_votes club_poll_votes_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_poll_votes
    ADD CONSTRAINT club_poll_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.club_polls(id) ON DELETE CASCADE;


--
-- Name: club_poll_votes club_poll_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_poll_votes
    ADD CONSTRAINT club_poll_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_polls club_polls_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_polls
    ADD CONSTRAINT club_polls_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_polls club_polls_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_polls
    ADD CONSTRAINT club_polls_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_resources club_resources_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_resources
    ADD CONSTRAINT club_resources_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_resources club_resources_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_resources
    ADD CONSTRAINT club_resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: club_stats club_stats_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_stats
    ADD CONSTRAINT club_stats_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_word_blacklist club_word_blacklist_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_word_blacklist
    ADD CONSTRAINT club_word_blacklist_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_word_blacklist club_word_blacklist_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_word_blacklist
    ADD CONSTRAINT club_word_blacklist_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: clubs clubs_producer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.users(id);


--
-- Name: direct_messages direct_messages_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: discussion_comments discussion_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: discussion_comments discussion_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.discussion_comments(id) ON DELETE CASCADE;


--
-- Name: discussion_comments discussion_comments_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.discussion_threads(id) ON DELETE CASCADE;


--
-- Name: discussion_thread_tags discussion_thread_tags_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT discussion_thread_tags_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: discussion_thread_tags discussion_thread_tags_person_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT discussion_thread_tags_person_tmdb_id_fkey FOREIGN KEY (person_tmdb_id) REFERENCES public.persons(tmdb_id) ON DELETE CASCADE;


--
-- Name: discussion_thread_tags discussion_thread_tags_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT discussion_thread_tags_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.discussion_threads(id) ON DELETE CASCADE;


--
-- Name: discussion_thread_tags discussion_thread_tags_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_tags
    ADD CONSTRAINT discussion_thread_tags_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id) ON DELETE CASCADE;


--
-- Name: discussion_thread_unlocks discussion_thread_unlocks_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_unlocks
    ADD CONSTRAINT discussion_thread_unlocks_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.discussion_threads(id) ON DELETE CASCADE;


--
-- Name: discussion_thread_unlocks discussion_thread_unlocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_thread_unlocks
    ADD CONSTRAINT discussion_thread_unlocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: discussion_threads discussion_threads_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_threads
    ADD CONSTRAINT discussion_threads_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: discussion_threads discussion_threads_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_threads
    ADD CONSTRAINT discussion_threads_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: discussion_threads discussion_threads_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_threads
    ADD CONSTRAINT discussion_threads_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id);


--
-- Name: discussion_threads discussion_threads_person_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_threads
    ADD CONSTRAINT discussion_threads_person_tmdb_id_fkey FOREIGN KEY (person_tmdb_id) REFERENCES public.persons(tmdb_id) ON DELETE SET NULL;


--
-- Name: discussion_threads discussion_threads_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_threads
    ADD CONSTRAINT discussion_threads_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id);


--
-- Name: discussion_votes discussion_votes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.discussion_comments(id) ON DELETE CASCADE;


--
-- Name: discussion_votes discussion_votes_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.discussion_threads(id) ON DELETE CASCADE;


--
-- Name: discussion_votes discussion_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_digest_log email_digest_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_digest_log
    ADD CONSTRAINT email_digest_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorite_clubs favorite_clubs_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_clubs
    ADD CONSTRAINT favorite_clubs_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: favorite_clubs favorite_clubs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_clubs
    ADD CONSTRAINT favorite_clubs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: feedback_items feedback_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_items
    ADD CONSTRAINT feedback_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: feedback_votes feedback_votes_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback_items(id) ON DELETE CASCADE;


--
-- Name: feedback_votes feedback_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: festival_results festival_results_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_results
    ADD CONSTRAINT festival_results_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: festival_rubric_locks festival_rubric_locks_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_rubric_locks
    ADD CONSTRAINT festival_rubric_locks_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: festival_rubric_locks festival_rubric_locks_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_rubric_locks
    ADD CONSTRAINT festival_rubric_locks_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.user_rubrics(id) ON DELETE SET NULL;


--
-- Name: festival_rubric_locks festival_rubric_locks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_rubric_locks
    ADD CONSTRAINT festival_rubric_locks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: festival_standings festival_standings_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_standings
    ADD CONSTRAINT festival_standings_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: festival_standings festival_standings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festival_standings
    ADD CONSTRAINT festival_standings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: festivals festivals_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festivals
    ADD CONSTRAINT festivals_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: festivals festivals_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festivals
    ADD CONSTRAINT festivals_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT;


--
-- Name: festivals festivals_theme_selected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.festivals
    ADD CONSTRAINT festivals_theme_selected_by_fkey FOREIGN KEY (theme_selected_by) REFERENCES auth.users(id);


--
-- Name: filter_analytics filter_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filter_analytics
    ADD CONSTRAINT filter_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: future_nomination_links future_nomination_links_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_links
    ADD CONSTRAINT future_nomination_links_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: future_nomination_links future_nomination_links_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_links
    ADD CONSTRAINT future_nomination_links_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE SET NULL;


--
-- Name: future_nomination_links future_nomination_links_future_nomination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_links
    ADD CONSTRAINT future_nomination_links_future_nomination_id_fkey FOREIGN KEY (future_nomination_id) REFERENCES public.future_nomination_list(id) ON DELETE CASCADE;


--
-- Name: future_nomination_links future_nomination_links_theme_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_links
    ADD CONSTRAINT future_nomination_links_theme_pool_id_fkey FOREIGN KEY (theme_pool_id) REFERENCES public.theme_pool(id) ON DELETE SET NULL;


--
-- Name: future_nomination_list future_nomination_list_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_list
    ADD CONSTRAINT future_nomination_list_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id) ON DELETE CASCADE;


--
-- Name: future_nomination_list future_nomination_list_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_nomination_list
    ADD CONSTRAINT future_nomination_list_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: generic_ratings generic_ratings_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generic_ratings
    ADD CONSTRAINT generic_ratings_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id);


--
-- Name: generic_ratings generic_ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generic_ratings
    ADD CONSTRAINT generic_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: hidden_activities hidden_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_activities
    ADD CONSTRAINT hidden_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activity_log(id) ON DELETE CASCADE;


--
-- Name: hidden_activities hidden_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_activities
    ADD CONSTRAINT hidden_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hidden_watch_history hidden_watch_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_watch_history
    ADD CONSTRAINT hidden_watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: movie_pool_votes movie_pool_votes_club_pool_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_pool_votes
    ADD CONSTRAINT movie_pool_votes_club_pool_item_id_fkey FOREIGN KEY (club_pool_item_id) REFERENCES public.club_movie_pool(id) ON DELETE CASCADE;


--
-- Name: movie_pool_votes movie_pool_votes_nomination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_pool_votes
    ADD CONSTRAINT movie_pool_votes_nomination_id_fkey FOREIGN KEY (nomination_id) REFERENCES public.nominations(id) ON DELETE CASCADE;


--
-- Name: movie_pool_votes movie_pool_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_pool_votes
    ADD CONSTRAINT movie_pool_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: nomination_guesses nomination_guesses_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomination_guesses
    ADD CONSTRAINT nomination_guesses_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: nomination_guesses nomination_guesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomination_guesses
    ADD CONSTRAINT nomination_guesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: nominations nominations_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: nominations nominations_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id);


--
-- Name: nominations nominations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notification_dead_letter_queue notification_dead_letter_queue_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_dead_letter_queue
    ADD CONSTRAINT notification_dead_letter_queue_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_delivery_log notification_delivery_log_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_log
    ADD CONSTRAINT notification_delivery_log_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_related_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: private_notes private_notes_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_notes
    ADD CONSTRAINT private_notes_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: private_notes private_notes_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_notes
    ADD CONSTRAINT private_notes_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id);


--
-- Name: private_notes private_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_notes
    ADD CONSTRAINT private_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_nomination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_nomination_id_fkey FOREIGN KEY (nomination_id) REFERENCES public.nominations(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: search_analytics search_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: seasons seasons_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: site_admins site_admins_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_admins
    ADD CONSTRAINT site_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: site_admins site_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_admins
    ADD CONSTRAINT site_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: site_announcements site_announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_announcements
    ADD CONSTRAINT site_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: site_settings site_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: stack_rankings stack_rankings_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stack_rankings
    ADD CONSTRAINT stack_rankings_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: stack_rankings stack_rankings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stack_rankings
    ADD CONSTRAINT stack_rankings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: theme_pool theme_pool_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool
    ADD CONSTRAINT theme_pool_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: theme_pool theme_pool_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool
    ADD CONSTRAINT theme_pool_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: theme_pool_votes theme_pool_votes_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool_votes
    ADD CONSTRAINT theme_pool_votes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.theme_pool(id) ON DELETE CASCADE;


--
-- Name: theme_pool_votes theme_pool_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_pool_votes
    ADD CONSTRAINT theme_pool_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: theme_votes theme_votes_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_votes
    ADD CONSTRAINT theme_votes_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;


--
-- Name: theme_votes theme_votes_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_votes
    ADD CONSTRAINT theme_votes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.theme_pool(id) ON DELETE CASCADE;


--
-- Name: theme_votes theme_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_votes
    ADD CONSTRAINT theme_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reported_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_rubrics user_rubrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rubrics
    ADD CONSTRAINT user_rubrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: watch_history watch_history_tmdb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_tmdb_id_fkey FOREIGN KEY (tmdb_id) REFERENCES public.movies(tmdb_id);


--
-- Name: watch_history watch_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_word_blacklist Admins can add words to blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can add words to blacklist" ON public.club_word_blacklist FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_word_blacklist.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_announcements Admins can create announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create announcements" ON public.club_announcements FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_announcements.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_resources Admins can create club resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create club resources" ON public.club_resources FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_resources.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_polls Admins can create polls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create polls" ON public.club_polls FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_polls.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_announcements Admins can delete announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete announcements" ON public.club_announcements FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_announcements.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_resources Admins can delete club resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete club resources" ON public.club_resources FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_resources.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_polls Admins can delete polls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete polls" ON public.club_polls FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_polls.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_word_blacklist Admins can delete words from blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete words from blacklist" ON public.club_word_blacklist FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_word_blacklist.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: festival_standings Admins can insert festival standings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert festival standings" ON public.festival_standings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = festival_standings.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_announcements Admins can update announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update announcements" ON public.club_announcements FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_announcements.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_resources Admins can update club resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update club resources" ON public.club_resources FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_resources.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_join_requests Admins can update join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update join requests" ON public.club_join_requests FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_join_requests.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_polls Admins can update polls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update polls" ON public.club_polls FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_polls.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: contact_submissions Allow anonymous contact form submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous contact form submissions" ON public.contact_submissions FOR INSERT TO anon WITH CHECK (true);


--
-- Name: filter_analytics Anyone can insert filter analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert filter analytics" ON public.filter_analytics FOR INSERT WITH CHECK (true);


--
-- Name: search_analytics Anyone can insert search analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert search analytics" ON public.search_analytics FOR INSERT WITH CHECK (true);


--
-- Name: background_images Anyone can read active backgrounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active backgrounds" ON public.background_images FOR SELECT USING ((is_active = true));


--
-- Name: curated_collections Anyone can read active curated collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active curated collections" ON public.curated_collections FOR SELECT USING ((is_active = true));


--
-- Name: club_invites Anyone can read invites by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read invites by token" ON public.club_invites FOR SELECT USING (true);


--
-- Name: movies Anyone can read movies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read movies" ON public.movies FOR SELECT USING (true);


--
-- Name: tmdb_search_cache Anyone can read tmdb cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read tmdb cache" ON public.tmdb_search_cache FOR SELECT USING (true);


--
-- Name: site_announcements Anyone can view active site_announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active site_announcements" ON public.site_announcements FOR SELECT USING ((((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))) OR (EXISTS ( SELECT 1
   FROM public.site_admins sa
  WHERE (sa.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: user_favorites Anyone can view favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view favorites" ON public.user_favorites FOR SELECT USING (true);


--
-- Name: persons Anyone can view persons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view persons" ON public.persons FOR SELECT USING (true);


--
-- Name: feedback_items Authenticated users can create feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create feedback" ON public.feedback_items FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notifications Authenticated users can create notifications for others; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create notifications for others" ON public.notifications FOR INSERT TO authenticated WITH CHECK (((user_id <> ( SELECT auth.uid() AS uid)) AND ((club_id IS NULL) OR ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = notifications.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = notifications.club_id) AND (club_members.user_id = notifications.user_id))))))));


--
-- Name: movies Authenticated users can insert movies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert movies" ON public.movies FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: persons Authenticated users can insert persons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert persons" ON public.persons FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: movies Authenticated users can update movies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update movies" ON public.movies FOR UPDATE USING ((( SELECT auth.uid() AS uid) IS NOT NULL)) WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: persons Authenticated users can update persons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update persons" ON public.persons FOR UPDATE USING ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: feedback_items Authenticated users can view feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view feedback" ON public.feedback_items FOR SELECT TO authenticated USING (true);


--
-- Name: feedback_votes Authenticated users can view votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view votes" ON public.feedback_votes FOR SELECT TO authenticated USING (true);


--
-- Name: feedback_votes Authenticated users can vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can vote" ON public.feedback_votes FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: club_invites Authorized members can create invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized members can create invites" ON public.club_invites FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_invites.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text]))))) OR (EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.clubs c ON ((c.id = cm.club_id)))
  WHERE ((cm.club_id = club_invites.club_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = 'critic'::text) AND (((c.settings ->> 'allow_critics_to_invite'::text))::boolean = true))))));


--
-- Name: discussion_comments Authors can update own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authors can update own comments" ON public.discussion_comments FOR UPDATE USING ((author_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((author_id = ( SELECT auth.uid() AS uid)));


--
-- Name: badges Badges are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);


--
-- Name: club_events Club admins can create events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club admins can create events" ON public.club_events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_events.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_events Club admins can delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club admins can delete events" ON public.club_events FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_events.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_events Club admins can update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club admins can update events" ON public.club_events FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_events.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: club_badges Club badges are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club badges are viewable by everyone" ON public.club_badges FOR SELECT USING (true);


--
-- Name: club_badges Club badges can be managed by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club badges can be managed by authenticated users" ON public.club_badges FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: club_badges Club badges can be updated by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club badges can be updated by authenticated users" ON public.club_badges FOR UPDATE USING ((( SELECT auth.uid() AS uid) IS NOT NULL)) WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: club_event_rsvps Club members can RSVP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club members can RSVP" ON public.club_event_rsvps FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.club_events ce ON ((ce.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (ce.id = club_event_rsvps.event_id))))));


--
-- Name: theme_pool Club members can insert themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club members can insert themes" ON public.theme_pool FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = theme_pool.club_id)))));


--
-- Name: club_event_rsvps Club members can view RSVPs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club members can view RSVPs" ON public.club_event_rsvps FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.club_events ce ON ((ce.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (ce.id = club_event_rsvps.event_id)))));


--
-- Name: club_events Club members can view events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club members can view events" ON public.club_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_events.club_id)))));


--
-- Name: club_movie_pool Club members can view movie pool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club members can view movie pool" ON public.club_movie_pool FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_movie_pool.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: club_members Club producers can update members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club producers can update members" ON public.club_members FOR UPDATE USING (public.is_club_producer(club_id, ( SELECT auth.uid() AS uid)));


--
-- Name: club_stats Club stats viewable by public or members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Club stats viewable by public or members" ON public.club_stats FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clubs c
  WHERE ((c.id = club_stats.club_id) AND ((c.privacy = 'public_open'::text) OR (EXISTS ( SELECT 1
           FROM public.club_members cm
          WHERE ((cm.club_id = c.id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))))))));


--
-- Name: festival_results Festival results viewable by festival members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Festival results viewable by festival members" ON public.festival_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((f.club_id = cm.club_id)))
  WHERE ((f.id = festival_results.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: festival_standings Festival standings viewable by festival members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Festival standings viewable by festival members" ON public.festival_standings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((f.club_id = cm.club_id)))
  WHERE ((f.id = festival_standings.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: club_invites Invite creators and admins can update invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invite creators and admins can update invites" ON public.club_invites FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_invites.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text]))))))) WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_invites.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text])))))));


--
-- Name: club_movie_pool Members can add to movie pool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can add to movie pool" ON public.club_movie_pool FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.clubs c ON ((c.id = cm.club_id)))
  WHERE ((cm.club_id = club_movie_pool.club_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND ((cm.role = ANY (ARRAY['producer'::text, 'director'::text])) OR (COALESCE(((c.settings ->> 'allow_non_admin_movie_pool'::text))::boolean, true) = true)))))));


--
-- Name: nominations Members can create nominations during nominating phase; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can create nominations during nominating phase" ON public.nominations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.festivals f ON ((f.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (f.id = nominations.festival_id)))));


--
-- Name: club_event_rsvps Members can delete own RSVP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can delete own RSVP" ON public.club_event_rsvps FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: club_event_rsvps Members can update own RSVP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update own RSVP" ON public.club_event_rsvps FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: club_announcements Members can view active announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view active announcements" ON public.club_announcements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_announcements.club_id)))));


--
-- Name: club_polls Members can view active polls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view active polls" ON public.club_polls FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_polls.club_id)))));


--
-- Name: club_word_blacklist Members can view blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view blacklist" ON public.club_word_blacklist FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = club_word_blacklist.club_id)))));


--
-- Name: club_resources Members can view club resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view club resources" ON public.club_resources FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_resources.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: discussion_comments Members can view comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view comments" ON public.discussion_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.discussion_threads dt
     JOIN public.club_members cm ON ((cm.club_id = dt.club_id)))
  WHERE ((dt.id = discussion_comments.thread_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: club_poll_votes Members can view votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view votes" ON public.club_poll_votes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.club_polls cp ON ((cp.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cp.id = club_poll_votes.poll_id)))));


--
-- Name: club_poll_votes Members can vote on polls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can vote on polls" ON public.club_poll_votes FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.club_polls cp ON ((cp.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cp.id = club_poll_votes.poll_id))))));


--
-- Name: site_admins Only site admins can view site_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only site admins can view site_admins" ON public.site_admins FOR SELECT USING (public.is_site_admin(( SELECT auth.uid() AS uid)));


--
-- Name: site_admins Only super admins can delete site_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only super admins can delete site_admins" ON public.site_admins FOR DELETE USING (public.is_super_admin(( SELECT auth.uid() AS uid)));


--
-- Name: site_admins Only super admins can insert site_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only super admins can insert site_admins" ON public.site_admins FOR INSERT WITH CHECK (public.is_super_admin(( SELECT auth.uid() AS uid)));


--
-- Name: festivals Producers and directors can create festivals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Producers and directors can create festivals" ON public.festivals FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = festivals.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: seasons Producers and directors can insert seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Producers and directors can insert seasons" ON public.seasons FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = seasons.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: festivals Producers and directors can update festivals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Producers and directors can update festivals" ON public.festivals FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = festivals.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: seasons Producers and directors can update seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Producers and directors can update seasons" ON public.seasons FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = seasons.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))));


--
-- Name: stripe_event_log Service role can read stripe event log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read stripe event log" ON public.stripe_event_log FOR SELECT USING (false);


--
-- Name: site_announcements Site admins can delete site_announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Site admins can delete site_announcements" ON public.site_announcements FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.site_admins sa
  WHERE (sa.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: site_announcements Site admins can insert site_announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Site admins can insert site_announcements" ON public.site_announcements FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.site_admins sa
  WHERE (sa.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: site_settings Site admins can manage site_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Site admins can manage site_settings" ON public.site_settings USING ((EXISTS ( SELECT 1
   FROM public.site_admins sa
  WHERE (sa.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: site_announcements Site admins can update site_announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Site admins can update site_announcements" ON public.site_announcements FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.site_admins sa
  WHERE (sa.user_id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.site_admins sa
  WHERE (sa.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: discussion_thread_tags Thread author or admin can remove tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Thread author or admin can remove tags" ON public.discussion_thread_tags FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.discussion_threads dt
  WHERE ((dt.id = discussion_thread_tags.thread_id) AND ((dt.author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM public.club_members cm
          WHERE ((cm.club_id = dt.club_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = 'admin'::text)))))))));


--
-- Name: user_badges User badges are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);


--
-- Name: user_badges User badges can be created by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User badges can be created by authenticated users" ON public.user_badges FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_stats User stats are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User stats are public" ON public.user_stats FOR SELECT USING (true);


--
-- Name: nominations Users and admins can update nominations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and admins can update nominations" ON public.nominations FOR UPDATE USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = nominations.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text]))))))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = nominations.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text])))))));


--
-- Name: discussion_thread_tags Users can add tags to threads in their clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add tags to threads in their clubs" ON public.discussion_thread_tags FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.discussion_threads dt
     JOIN public.club_members cm ON ((cm.club_id = dt.club_id)))
  WHERE ((dt.id = discussion_thread_tags.thread_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: clubs Users can create clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create clubs" ON public.clubs FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (producer_id = ( SELECT auth.uid() AS uid))));


--
-- Name: discussion_comments Users can create comments in clubs they're members of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments in clubs they're members of" ON public.discussion_comments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.discussion_threads dt ON ((dt.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (dt.id = discussion_comments.thread_id)))));


--
-- Name: club_join_requests Users can create join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create join requests" ON public.club_join_requests FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (NOT (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_join_requests.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: discussion_thread_unlocks Users can create own unlocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own unlocks" ON public.discussion_thread_unlocks FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: discussion_votes Users can create own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own votes" ON public.discussion_votes FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: discussion_threads Users can create threads in clubs they're members of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create threads in clubs they're members of" ON public.discussion_threads FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = discussion_threads.club_id)))));


--
-- Name: club_members Users can delete club members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete club members" ON public.club_members FOR DELETE USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_club_producer(club_id, ( SELECT auth.uid() AS uid))));


--
-- Name: background_images Users can delete entity backgrounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete entity backgrounds" ON public.background_images FOR DELETE USING (((entity_type = 'site_page'::text) OR ((entity_type = 'club'::text) AND (EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.club_id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text])))))) OR ((entity_type = 'profile'::text) AND ((entity_id)::uuid = ( SELECT auth.uid() AS uid))) OR ((entity_type = 'festival'::text) AND (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text]))))))));


--
-- Name: future_nomination_list Users can delete from own future nomination list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete from own future nomination list" ON public.future_nomination_list FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: activity_log Users can delete own activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own activity log" ON public.activity_log FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: discussion_comments Users can delete own comments or admins can delete any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own comments or admins can delete any" ON public.discussion_comments FOR DELETE USING (((author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.discussion_threads dt ON ((dt.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (dt.id = discussion_comments.thread_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text])))))));


--
-- Name: favorite_clubs Users can delete own favorite clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own favorite clubs" ON public.favorite_clubs FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_favorites Users can delete own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own favorites" ON public.user_favorites FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: feedback_items Users can delete own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own feedback" ON public.feedback_items FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: future_nomination_links Users can delete own future nomination links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own future nomination links" ON public.future_nomination_links FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.future_nomination_list fnl
  WHERE ((fnl.id = future_nomination_links.future_nomination_id) AND (fnl.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: generic_ratings Users can delete own generic ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own generic ratings" ON public.generic_ratings FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: private_notes Users can delete own private notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own private notes" ON public.private_notes FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: ratings Users can delete own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own ratings" ON public.ratings FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_rubrics Users can delete own rubrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own rubrics" ON public.user_rubrics FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: direct_messages Users can delete own sent messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own sent messages" ON public.direct_messages FOR DELETE USING ((sender_id = ( SELECT auth.uid() AS uid)));


--
-- Name: theme_pool_votes Users can delete own theme pool votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own theme pool votes" ON public.theme_pool_votes FOR DELETE USING (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.club_members
     JOIN public.theme_pool ON ((theme_pool.club_id = club_members.club_id)))
  WHERE ((club_members.user_id = ( SELECT auth.uid() AS uid)) AND (theme_pool.id = theme_pool_votes.theme_id))))));


--
-- Name: theme_votes Users can delete own theme votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own theme votes" ON public.theme_votes FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: discussion_threads Users can delete own threads or admins can delete any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own threads or admins can delete any" ON public.discussion_threads FOR DELETE USING (((author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = discussion_threads.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text])))))));


--
-- Name: discussion_votes Users can delete own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own votes" ON public.discussion_votes FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: watch_history Users can delete own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own watch history" ON public.watch_history FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: clubs Users can delete their clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their clubs" ON public.clubs FOR DELETE USING ((producer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: nominations Users can delete their own nominations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own nominations" ON public.nominations FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: push_subscriptions Users can delete their own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: movie_pool_votes Users can delete their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own votes" ON public.movie_pool_votes FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: club_poll_votes Users can delete their votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their votes" ON public.club_poll_votes FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: theme_pool Users can delete themes they added; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete themes they added" ON public.theme_pool FOR DELETE USING ((added_by = ( SELECT auth.uid() AS uid)));


--
-- Name: hidden_activities Users can hide activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can hide activities" ON public.hidden_activities FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: hidden_watch_history Users can hide watch history items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can hide watch history items" ON public.hidden_watch_history FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: activity_log Users can insert activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert activity log" ON public.activity_log FOR INSERT WITH CHECK ((((club_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = activity_log.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)))))) OR ((club_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.clubs
  WHERE ((clubs.id = activity_log.club_id) AND (clubs.producer_id = ( SELECT auth.uid() AS uid)))))) OR ((club_id IS NULL) AND (user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: club_members Users can insert club members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert club members" ON public.club_members FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_club_producer(club_id, ( SELECT auth.uid() AS uid))));


--
-- Name: background_images Users can insert entity backgrounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert entity backgrounds" ON public.background_images FOR INSERT WITH CHECK (((entity_type = 'site_page'::text) OR ((entity_type = 'club'::text) AND (EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.club_id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text])))))) OR ((entity_type = 'profile'::text) AND ((entity_id)::uuid = ( SELECT auth.uid() AS uid))) OR ((entity_type = 'festival'::text) AND (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text]))))))));


--
-- Name: future_nomination_list Users can insert into own future nomination list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert into own future nomination list" ON public.future_nomination_list FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: favorite_clubs Users can insert own favorite clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own favorite clubs" ON public.favorite_clubs FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_favorites Users can insert own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own favorites" ON public.user_favorites FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: future_nomination_links Users can insert own future nomination links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own future nomination links" ON public.future_nomination_links FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.future_nomination_list fnl
  WHERE ((fnl.id = future_nomination_links.future_nomination_id) AND (fnl.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: generic_ratings Users can insert own generic ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own generic ratings" ON public.generic_ratings FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: private_notes Users can insert own private notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own private notes" ON public.private_notes FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: users Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: festival_rubric_locks Users can insert own rubric locks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own rubric locks" ON public.festival_rubric_locks FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_rubrics Users can insert own rubrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own rubrics" ON public.user_rubrics FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: theme_pool_votes Users can insert own theme pool votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own theme pool votes" ON public.theme_pool_votes FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.club_members
     JOIN public.theme_pool ON ((theme_pool.club_id = club_members.club_id)))
  WHERE ((club_members.user_id = ( SELECT auth.uid() AS uid)) AND (theme_pool.id = theme_pool_votes.theme_id))))));


--
-- Name: theme_votes Users can insert own theme votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own theme votes" ON public.theme_votes FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = theme_votes.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: watch_history Users can insert own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own watch history" ON public.watch_history FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: ratings Users can insert ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert ratings" ON public.ratings FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ((public.nominations n
     JOIN public.festivals f ON ((f.id = n.festival_id)))
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((n.id = ratings.nomination_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: push_subscriptions Users can insert their own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: direct_messages Users can mark own messages as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark own messages as read" ON public.direct_messages FOR UPDATE USING ((recipient_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((recipient_id = ( SELECT auth.uid() AS uid)));


--
-- Name: activity_log Users can read activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read activity log" ON public.activity_log FOR SELECT USING ((((club_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = activity_log.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)))))) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: activity_log_archive Users can read activity log archive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read activity log archive" ON public.activity_log_archive FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = activity_log_archive.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: users Users can read all user profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read all user profiles" ON public.users FOR SELECT USING (true);


--
-- Name: blocked_users Users can read blocked users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read blocked users" ON public.blocked_users FOR SELECT USING (((( SELECT auth.uid() AS uid) = blocked_by) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: chat_messages Users can read chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read chat messages" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = chat_messages.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: chat_messages_archive Users can read chat messages archive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read chat messages archive" ON public.chat_messages_archive FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = chat_messages_archive.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: club_members Users can read club members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read club members" ON public.club_members FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_club_public(club_id) OR public.is_club_member(club_id, ( SELECT auth.uid() AS uid))));


--
-- Name: club_notes Users can read club notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read club notes" ON public.club_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_notes.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: clubs Users can read clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read clubs" ON public.clubs FOR SELECT USING (((privacy ~~ 'public_%'::text) OR (producer_id = ( SELECT auth.uid() AS uid)) OR public.is_club_member(id, ( SELECT auth.uid() AS uid))));


--
-- Name: email_digest_log Users can read email digest log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read email digest log" ON public.email_digest_log FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: favorite_clubs Users can read favorite clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read favorite clubs" ON public.favorite_clubs FOR SELECT USING (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.clubs
  WHERE ((clubs.id = favorite_clubs.club_id) AND (clubs.privacy = ANY (ARRAY['public_open'::text, 'public_password'::text, 'public_invite'::text, 'public_request'::text])) AND (clubs.archived = false))))));


--
-- Name: festivals Users can read festivals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read festivals" ON public.festivals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clubs c
  WHERE ((c.id = festivals.club_id) AND ((c.privacy ~~ 'public_%'::text) OR (c.producer_id = ( SELECT auth.uid() AS uid)) OR public.is_club_member(c.id, ( SELECT auth.uid() AS uid)))))));


--
-- Name: nomination_guesses Users can read nomination guesses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read nomination guesses" ON public.nomination_guesses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = nomination_guesses.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: nominations Users can read nominations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read nominations" ON public.nominations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.clubs c ON ((c.id = f.club_id)))
  WHERE ((f.id = nominations.festival_id) AND ((c.privacy ~~ 'public_%'::text) OR (c.producer_id = ( SELECT auth.uid() AS uid)) OR public.is_club_member(c.id, ( SELECT auth.uid() AS uid)))))));


--
-- Name: notification_dead_letter_queue Users can read notification dead letter queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read notification dead letter queue" ON public.notification_dead_letter_queue FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.notifications n
  WHERE ((n.id = notification_dead_letter_queue.notification_id) AND (n.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: notification_delivery_log Users can read notification delivery log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read notification delivery log" ON public.notification_delivery_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.notifications n
  WHERE ((n.id = notification_delivery_log.notification_id) AND (n.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: generic_ratings Users can read own generic ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own generic ratings" ON public.generic_ratings FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: hidden_activities Users can read own hidden activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own hidden activities" ON public.hidden_activities FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: hidden_watch_history Users can read own hidden watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own hidden watch history" ON public.hidden_watch_history FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: direct_messages Users can read own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own messages" ON public.direct_messages FOR SELECT USING ((((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))) AND (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = direct_messages.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: private_notes Users can read own private notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own private notes" ON public.private_notes FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: watch_history Users can read own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own watch history" ON public.watch_history FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: ratings Users can read ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read ratings" ON public.ratings FOR SELECT USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = ratings.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: seasons Users can read seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read seasons" ON public.seasons FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = seasons.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: stack_rankings Users can read stack rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read stack rankings" ON public.stack_rankings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = stack_rankings.festival_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: subscriptions Users can read subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read subscriptions" ON public.subscriptions FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: push_subscriptions Users can read their own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own push subscriptions" ON public.push_subscriptions FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: theme_pool Users can read theme pool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read theme pool" ON public.theme_pool FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = theme_pool.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: theme_pool_votes Users can read theme pool votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read theme pool votes" ON public.theme_pool_votes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.club_members
     JOIN public.theme_pool ON ((theme_pool.club_id = club_members.club_id)))
  WHERE ((club_members.user_id = ( SELECT auth.uid() AS uid)) AND (theme_pool.id = theme_pool_votes.theme_id)))));


--
-- Name: feedback_votes Users can remove own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove own votes" ON public.feedback_votes FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: club_movie_pool Users can remove their pool items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove their pool items" ON public.club_movie_pool FOR UPDATE USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_movie_pool.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text]))))))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_movie_pool.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text])))))));


--
-- Name: direct_messages Users can send messages to club members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages to club members" ON public.direct_messages FOR INSERT WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = direct_messages.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = direct_messages.club_id) AND (club_members.user_id = direct_messages.recipient_id))))));


--
-- Name: ratings Users can soft delete own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can soft delete own ratings" ON public.ratings FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: clubs Users can update clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update clubs" ON public.clubs FOR UPDATE USING ((public.is_site_admin(( SELECT auth.uid() AS uid)) OR public.can_update_club(id, ( SELECT auth.uid() AS uid))));


--
-- Name: background_images Users can update entity backgrounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update entity backgrounds" ON public.background_images FOR UPDATE USING (((entity_type = 'site_page'::text) OR ((entity_type = 'club'::text) AND (EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.club_id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text])))))) OR ((entity_type = 'profile'::text) AND ((entity_id)::uuid = ( SELECT auth.uid() AS uid))) OR ((entity_type = 'festival'::text) AND (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text])))))))) WITH CHECK (((entity_type = 'site_page'::text) OR ((entity_type = 'club'::text) AND (EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.club_id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text])))))) OR ((entity_type = 'profile'::text) AND ((entity_id)::uuid = ( SELECT auth.uid() AS uid))) OR ((entity_type = 'festival'::text) AND (EXISTS ( SELECT 1
   FROM (public.festivals f
     JOIN public.club_members cm ON ((cm.club_id = f.club_id)))
  WHERE ((f.id = (background_images.entity_id)::uuid) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.role = ANY (ARRAY['director'::text, 'producer'::text]))))))));


--
-- Name: feedback_items Users can update feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update feedback" ON public.feedback_items FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_site_admin(( SELECT auth.uid() AS uid)))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_site_admin(( SELECT auth.uid() AS uid))));


--
-- Name: favorite_clubs Users can update own favorite clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own favorite clubs" ON public.favorite_clubs FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_favorites Users can update own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own favorites" ON public.user_favorites FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: future_nomination_links Users can update own future nomination links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own future nomination links" ON public.future_nomination_links FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.future_nomination_list fnl
  WHERE ((fnl.id = future_nomination_links.future_nomination_id) AND (fnl.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.future_nomination_list fnl
  WHERE ((fnl.id = future_nomination_links.future_nomination_id) AND (fnl.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: future_nomination_list Users can update own future nomination list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own future nomination list" ON public.future_nomination_list FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: generic_ratings Users can update own generic ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own generic ratings" ON public.generic_ratings FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: private_notes Users can update own private notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own private notes" ON public.private_notes FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: users Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING ((( SELECT auth.uid() AS uid) = id));


--
-- Name: festival_rubric_locks Users can update own rubric locks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own rubric locks" ON public.festival_rubric_locks FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_rubrics Users can update own rubrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own rubrics" ON public.user_rubrics FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: theme_pool_votes Users can update own theme pool votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own theme pool votes" ON public.theme_pool_votes FOR UPDATE USING (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.club_members
     JOIN public.theme_pool ON ((theme_pool.club_id = club_members.club_id)))
  WHERE ((club_members.user_id = ( SELECT auth.uid() AS uid)) AND (theme_pool.id = theme_pool_votes.theme_id)))))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.club_members
     JOIN public.theme_pool ON ((theme_pool.club_id = club_members.club_id)))
  WHERE ((club_members.user_id = ( SELECT auth.uid() AS uid)) AND (theme_pool.id = theme_pool_votes.theme_id))))));


--
-- Name: theme_votes Users can update own theme votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own theme votes" ON public.theme_votes FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: discussion_threads Users can update own threads or admins can update any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own threads or admins can update any" ON public.discussion_threads FOR UPDATE USING (((author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = discussion_threads.club_id) AND (cm.role = ANY (ARRAY['producer'::text, 'director'::text])))))));


--
-- Name: watch_history Users can update own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own watch history" ON public.watch_history FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_badges Users can update their own badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own badges" ON public.user_badges FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: club_poll_votes Users can update their votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their votes" ON public.club_poll_votes FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: theme_pool Users can update themes they added; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update themes they added" ON public.theme_pool FOR UPDATE USING ((added_by = ( SELECT auth.uid() AS uid)));


--
-- Name: club_join_requests Users can view join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view join requests" ON public.club_join_requests FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.club_members
  WHERE ((club_members.club_id = club_join_requests.club_id) AND (club_members.user_id = ( SELECT auth.uid() AS uid)) AND (club_members.role = ANY (ARRAY['producer'::text, 'director'::text])))))));


--
-- Name: backrow_matinee Users can view matinees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view matinees" ON public.backrow_matinee FOR SELECT USING (((expires_at IS NULL) OR (expires_at > now()) OR (( SELECT auth.uid() AS uid) IS NOT NULL)));


--
-- Name: movie_pool_votes Users can view movie pool votes in their clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view movie pool votes in their clubs" ON public.movie_pool_votes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.nominations n
     JOIN public.festivals f ON ((n.festival_id = f.id)))
     JOIN public.club_members cm ON ((f.club_id = cm.club_id)))
  WHERE ((n.id = movie_pool_votes.nomination_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: filter_analytics Users can view own filter analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own filter analytics" ON public.filter_analytics FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: future_nomination_links Users can view own future nomination links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own future nomination links" ON public.future_nomination_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.future_nomination_list fnl
  WHERE ((fnl.id = future_nomination_links.future_nomination_id) AND (fnl.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: future_nomination_list Users can view own future nomination list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own future nomination list" ON public.future_nomination_list FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: festival_rubric_locks Users can view own rubric locks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own rubric locks" ON public.festival_rubric_locks FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_rubrics Users can view own rubrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own rubrics" ON public.user_rubrics FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: search_analytics Users can view own search analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own search analytics" ON public.search_analytics FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: discussion_thread_unlocks Users can view own unlocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own unlocks" ON public.discussion_thread_unlocks FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: discussion_thread_tags Users can view tags for threads in their clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tags for threads in their clubs" ON public.discussion_thread_tags FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.discussion_threads dt
     JOIN public.club_members cm ON ((cm.club_id = dt.club_id)))
  WHERE ((dt.id = discussion_thread_tags.thread_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: contact_submissions Users can view their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own submissions" ON public.contact_submissions FOR SELECT TO authenticated USING (true);


--
-- Name: theme_votes Users can view theme votes for their clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view theme votes for their clubs" ON public.theme_votes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.club_members cm
     JOIN public.festivals f ON ((f.club_id = cm.club_id)))
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (f.id = theme_votes.festival_id)))));


--
-- Name: discussion_threads Users can view threads in clubs they're members of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view threads in clubs they're members of" ON public.discussion_threads FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.club_members cm
  WHERE ((cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.club_id = discussion_threads.club_id)))));


--
-- Name: discussion_votes Users can view votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view votes" ON public.discussion_votes FOR SELECT USING (true);


--
-- Name: movie_pool_votes Users can vote for movies in their clubs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can vote for movies in their clubs" ON public.movie_pool_votes FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM ((public.nominations n
     JOIN public.festivals f ON ((n.festival_id = f.id)))
     JOIN public.club_members cm ON ((f.club_id = cm.club_id)))
  WHERE ((n.id = movie_pool_votes.nomination_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_log_archive; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log_archive ENABLE ROW LEVEL SECURITY;

--
-- Name: background_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.background_images ENABLE ROW LEVEL SECURITY;

--
-- Name: backrow_matinee; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backrow_matinee ENABLE ROW LEVEL SECURITY;

--
-- Name: badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages_archive; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages_archive ENABLE ROW LEVEL SECURITY;

--
-- Name: club_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: club_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: club_event_rsvps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_event_rsvps ENABLE ROW LEVEL SECURITY;

--
-- Name: club_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

--
-- Name: club_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: club_join_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_join_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: club_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

--
-- Name: club_movie_pool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_movie_pool ENABLE ROW LEVEL SECURITY;

--
-- Name: club_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: club_poll_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_poll_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: club_polls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_polls ENABLE ROW LEVEL SECURITY;

--
-- Name: club_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: club_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: club_word_blacklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_word_blacklist ENABLE ROW LEVEL SECURITY;

--
-- Name: clubs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: curated_collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.curated_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: direct_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_thread_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_thread_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_thread_unlocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_thread_unlocks ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: email_digest_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_digest_log ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_clubs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_clubs ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: festival_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.festival_results ENABLE ROW LEVEL SECURITY;

--
-- Name: festival_rubric_locks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.festival_rubric_locks ENABLE ROW LEVEL SECURITY;

--
-- Name: festival_standings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.festival_standings ENABLE ROW LEVEL SECURITY;

--
-- Name: festivals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;

--
-- Name: filter_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.filter_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: future_nomination_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.future_nomination_links ENABLE ROW LEVEL SECURITY;

--
-- Name: future_nomination_list; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.future_nomination_list ENABLE ROW LEVEL SECURITY;

--
-- Name: generic_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generic_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: hidden_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hidden_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: hidden_watch_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hidden_watch_history ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_pool_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_pool_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: movies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

--
-- Name: nomination_guesses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nomination_guesses ENABLE ROW LEVEL SECURITY;

--
-- Name: nominations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_dead_letter_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_dead_letter_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_delivery_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: persons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

--
-- Name: private_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: search_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: site_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: site_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: stack_rankings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stack_rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_event_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_event_log ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: theme_pool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.theme_pool ENABLE ROW LEVEL SECURITY;

--
-- Name: theme_pool_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.theme_pool_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: theme_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.theme_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: tmdb_search_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tmdb_search_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_blocks user_blocks_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_blocks_delete_own ON public.user_blocks FOR DELETE USING ((blocker_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_blocks user_blocks_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_blocks_insert_own ON public.user_blocks FOR INSERT WITH CHECK ((blocker_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_blocks user_blocks_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_blocks_select_own ON public.user_blocks FOR SELECT USING ((blocker_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: user_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: user_reports user_reports_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_reports_insert_own ON public.user_reports FOR INSERT WITH CHECK ((reporter_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_reports user_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_reports_select_own ON public.user_reports FOR SELECT USING ((reporter_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_rubrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_rubrics ENABLE ROW LEVEL SECURITY;

--
-- Name: user_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: watch_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

--
--



-- ----------------------------------------------------------------------------
-- Storage buckets
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('club-backgrounds',    'club-backgrounds',    true, 5242880,  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('club-pictures',       'club-pictures',       true, 15728640, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('festival-backgrounds','festival-backgrounds',true, 5242880,  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('festival-pictures',   'festival-pictures',   true, 15728640, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('announcement-images', 'announcement-images', true, 5242880,  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('backgrounds',         'backgrounds',         true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars',             'avatars',             true, 15728640, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/heic','image/heif']),
  ('badge-icons',         'badge-icons',         true, 2097152,  ARRAY['image/webp','image/png','image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Storage policies (on storage.objects)
-- ----------------------------------------------------------------------------

CREATE POLICY "Announcement images are publicly accessible" ON storage.objects FOR SELECT USING ((bucket_id = 'announcement-images'::text));

CREATE POLICY "Anyone can read background images" ON storage.objects FOR SELECT USING ((bucket_id = 'backgrounds'::text));

CREATE POLICY "Authenticated users can upload announcement images" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'announcement-images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Authenticated users can upload backgrounds" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'backgrounds'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Authenticated users can upload club backgrounds" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'club-backgrounds'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Authenticated users can upload club pictures" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'club-pictures'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Authenticated users can upload festival backgrounds" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'festival-backgrounds'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Authenticated users can upload festival pictures" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'festival-pictures'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Club backgrounds are publicly accessible" ON storage.objects FOR SELECT USING ((bucket_id = 'club-backgrounds'::text));

CREATE POLICY "Club pictures are publicly accessible" ON storage.objects FOR SELECT USING ((bucket_id = 'club-pictures'::text));

CREATE POLICY "Festival backgrounds are publicly accessible" ON storage.objects FOR SELECT USING ((bucket_id = 'festival-backgrounds'::text));

CREATE POLICY "Festival pictures are publicly accessible" ON storage.objects FOR SELECT USING ((bucket_id = 'festival-pictures'::text));

CREATE POLICY "Public read access for badge icons" ON storage.objects FOR SELECT USING ((bucket_id = 'badge-icons'::text));

CREATE POLICY "Site admins can delete badge icons" ON storage.objects FOR DELETE USING (((bucket_id = 'badge-icons'::text) AND (( SELECT auth.uid() AS uid) IN ( SELECT site_admins.user_id
   FROM public.site_admins))));

CREATE POLICY "Site admins can update badge icons" ON storage.objects FOR UPDATE USING (((bucket_id = 'badge-icons'::text) AND (( SELECT auth.uid() AS uid) IN ( SELECT site_admins.user_id
   FROM public.site_admins))));

CREATE POLICY "Site admins can upload badge icons" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'badge-icons'::text) AND (( SELECT auth.uid() AS uid) IN ( SELECT site_admins.user_id
   FROM public.site_admins))));

CREATE POLICY "Users can delete their announcement images" ON storage.objects FOR DELETE USING (((bucket_id = 'announcement-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users can delete their club backgrounds" ON storage.objects FOR DELETE USING (((bucket_id = 'club-backgrounds'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users can delete their club pictures" ON storage.objects FOR DELETE USING (((bucket_id = 'club-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users can delete their festival backgrounds" ON storage.objects FOR DELETE USING (((bucket_id = 'festival-backgrounds'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users can delete their festival pictures" ON storage.objects FOR DELETE USING (((bucket_id = 'festival-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users can delete their own background uploads" ON storage.objects FOR DELETE USING (((bucket_id = 'backgrounds'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Users can update their own background uploads" ON storage.objects FOR UPDATE USING (((bucket_id = 'backgrounds'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY avatars_authenticated_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'avatars'::text));

CREATE POLICY avatars_owner_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'avatars'::text) AND (( SELECT (auth.uid())::text AS uid) = split_part(name, '-'::text, 1))));

CREATE POLICY avatars_owner_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (( SELECT (auth.uid())::text AS uid) = split_part(name, '-'::text, 1))));

CREATE POLICY avatars_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'avatars'::text));


-- ----------------------------------------------------------------------------
-- Scheduled jobs (only installed if pg_cron is enabled)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'archive-old-notifications',
      '0 3 * * *',
      'SELECT public.archive_old_notifications()'
    );
    PERFORM cron.schedule(
      'delete-archived-notifications',
      '0 4 * * 0',
      'SELECT public.delete_old_archived_notifications()'
    );
    PERFORM cron.schedule(
      'cleanup-old-analytics',
      '0 5 1 * *',
      $cron$
        DELETE FROM public.search_analytics WHERE created_at < NOW() - INTERVAL '90 days';
        DELETE FROM public.filter_analytics WHERE created_at < NOW() - INTERVAL '90 days';
      $cron$
    );
  END IF;
END $$;
