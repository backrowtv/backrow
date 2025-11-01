-- Add profile features to users table
-- Agent 1: Profile Page Features

-- Add date_of_birth field for age calculation (COPPA compliance - 13+)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add favorite movie/director/composer fields (storing TMDB IDs)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS favorite_movie_tmdb_id INTEGER,
ADD COLUMN IF NOT EXISTS favorite_director_tmdb_id INTEGER,
ADD COLUMN IF NOT EXISTS favorite_composer_tmdb_id INTEGER;

-- Add comment explaining the fields
COMMENT ON COLUMN public.users.date_of_birth IS 'User date of birth for age calculation (COPPA compliance - must be 13+)';
COMMENT ON COLUMN public.users.favorite_movie_tmdb_id IS 'TMDB ID of user''s favorite movie';
COMMENT ON COLUMN public.users.favorite_director_tmdb_id IS 'TMDB ID of user''s favorite director';
COMMENT ON COLUMN public.users.favorite_composer_tmdb_id IS 'TMDB ID of user''s favorite composer';

-- Add check constraint to ensure age is 13+ (COPPA compliance)
-- This ensures users must be at least 13 years old
ALTER TABLE public.users
ADD CONSTRAINT check_age_13_plus 
CHECK (
  date_of_birth IS NULL OR 
  date_of_birth <= CURRENT_DATE - INTERVAL '13 years'
);

-- Note: Social links are already stored in social_links JSONB field
-- Format: { "letterboxd": "username", "imdb": "username", "trakt": "username", "tmdb": "username" }

