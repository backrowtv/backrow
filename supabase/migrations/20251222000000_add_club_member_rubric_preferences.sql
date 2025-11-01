-- Add rubric preferences to club_members table
-- This allows users to select which personal rubric to use for each club

ALTER TABLE public.club_members 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.club_members.preferences IS 'Per-club user preferences including default_rubric_id (references user personal rubrics)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_club_members_preferences ON public.club_members USING gin (preferences);








