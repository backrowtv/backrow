-- Add favorite_actor_tmdb_id column to users table
-- This allows users to set their favorite actor for display on their profile

ALTER TABLE users
ADD COLUMN IF NOT EXISTS favorite_actor_tmdb_id INTEGER;

-- Add index for efficient lookups when displaying user profiles
CREATE INDEX IF NOT EXISTS idx_users_favorite_actor_tmdb_id 
ON users(favorite_actor_tmdb_id) 
WHERE favorite_actor_tmdb_id IS NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN users.favorite_actor_tmdb_id IS 'TMDB ID of the user''s favorite actor, used for profile display';

