-- Add missing RLS policies for private_notes table
-- Users should be able to create, update, and delete their own private notes

-- Enable RLS (if not already enabled)
ALTER TABLE private_notes ENABLE ROW LEVEL SECURITY;

-- Add unique constraint for upsert to work (user can only have one note per movie)
ALTER TABLE private_notes
ADD CONSTRAINT private_notes_user_tmdb_unique UNIQUE (user_id, tmdb_id);

-- Insert policy - users can create their own notes
CREATE POLICY "Users can insert own private notes"
ON private_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update policy - users can update their own notes
CREATE POLICY "Users can update own private notes"
ON private_notes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete policy - users can delete their own notes
CREATE POLICY "Users can delete own private notes"
ON private_notes FOR DELETE
USING (auth.uid() = user_id);

