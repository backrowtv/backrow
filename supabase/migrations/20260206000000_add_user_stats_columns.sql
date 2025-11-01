-- Add denormalized stats columns to users table
-- These are public profile data, no RLS bypass needed
-- Maintained by triggers on club_members and watch_history

ALTER TABLE users
ADD COLUMN IF NOT EXISTS clubs_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS movies_watched_count integer DEFAULT 0;

-- Populate initial values
UPDATE users u SET
  clubs_count = (SELECT count(*) FROM club_members WHERE user_id = u.id),
  movies_watched_count = (SELECT count(*) FROM watch_history WHERE user_id = u.id);

-- Trigger to update clubs_count on club_members changes
CREATE OR REPLACE FUNCTION update_user_clubs_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET clubs_count = clubs_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET clubs_count = GREATEST(0, clubs_count - 1) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_clubs_count ON club_members;
CREATE TRIGGER trigger_update_user_clubs_count
AFTER INSERT OR DELETE ON club_members
FOR EACH ROW EXECUTE FUNCTION update_user_clubs_count();

-- Trigger to update movies_watched_count on watch_history changes
CREATE OR REPLACE FUNCTION update_user_movies_watched_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET movies_watched_count = movies_watched_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET movies_watched_count = GREATEST(0, movies_watched_count - 1) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_movies_watched_count ON watch_history;
CREATE TRIGGER trigger_update_user_movies_watched_count
AFTER INSERT OR DELETE ON watch_history
FOR EACH ROW EXECUTE FUNCTION update_user_movies_watched_count();
