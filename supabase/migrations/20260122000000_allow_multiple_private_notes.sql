-- Allow multiple private notes per movie per user
-- Previously there was a unique constraint on (user_id, tmdb_id) that only allowed one note

-- Drop the unique constraint to allow multiple notes
ALTER TABLE private_notes
DROP CONSTRAINT IF EXISTS private_notes_user_tmdb_unique;

-- Add an index for efficient querying by user and movie
CREATE INDEX IF NOT EXISTS idx_private_notes_user_tmdb
ON private_notes (user_id, tmdb_id, created_at DESC);
