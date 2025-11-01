-- Update existing movie discussion thread content to remove the old spoiler text
UPDATE discussion_threads
SET content = 'Discuss this movie here!'
WHERE content = 'Discuss this movie here! (Unlocks when you mark as watched)'
  AND auto_created = true;

-- Clear legacy spoiler/unlock flags on auto-created movie threads
-- (watch-gating is now automatic based on watch_history, not these flags)
UPDATE discussion_threads
SET is_spoiler = false,
    unlock_on_watch = false
WHERE auto_created = true
  AND thread_type = 'movie';

-- Replace the trigger function with updated content text
-- NOTE: This trigger fires on the nominations table, which uses endless_status (not status).
-- The previous version of this migration incorrectly referenced NEW.status, causing
-- "record 'new' has no field 'status'" errors when adding movies to endless festivals.
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
$function$;
