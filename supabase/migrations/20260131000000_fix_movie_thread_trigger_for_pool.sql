-- Fix: Don't create discussion threads for movies added to the pool
-- The trigger was firing for endless festivals because they're always in watch_rate phase
-- Movies should only get discussion threads when they're actively "playing", not in the pool

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
  -- Skip if movie is in the pool (endless festivals only)
  -- Pool movies should NOT have discussion threads until they're playing
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

COMMENT ON FUNCTION public.auto_create_movie_thread() IS
'Auto-creates discussion threads for movies when they enter the watch phase.
For endless festivals, movies in the pool (endless_status = ''pool'') are skipped.
Threads are only created when movies are playing.';
