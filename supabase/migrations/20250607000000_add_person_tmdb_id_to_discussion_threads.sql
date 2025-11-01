-- Add person_tmdb_id column to discussion_threads for linking to persons table
-- This allows us to display profile pictures and link to person pages

ALTER TABLE discussion_threads
ADD COLUMN IF NOT EXISTS person_tmdb_id INTEGER;

-- Add foreign key constraint to persons table (optional - persons may not exist yet)
-- Using NO ACTION to allow flexibility since person may need to be cached first
ALTER TABLE discussion_threads
ADD CONSTRAINT discussion_threads_person_tmdb_id_fkey
FOREIGN KEY (person_tmdb_id) 
REFERENCES persons(tmdb_id) 
ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_discussion_threads_person_tmdb_id 
ON discussion_threads(person_tmdb_id) 
WHERE person_tmdb_id IS NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN discussion_threads.person_tmdb_id IS 'TMDB ID of the person for person-type discussions, references persons table';

