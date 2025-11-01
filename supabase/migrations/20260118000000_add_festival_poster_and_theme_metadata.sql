-- Add poster_url and theme metadata to festivals table
-- This supports the Festival Overview Panel feature

-- Add poster_url column for custom festival posters
ALTER TABLE public.festivals
ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- Add theme_selected_by to track who selected/set the theme
ALTER TABLE public.festivals
ADD COLUMN IF NOT EXISTS theme_selected_by UUID REFERENCES auth.users(id);

-- Add theme_source to track whether theme came from pool or was custom entered
-- Values: 'pool' (from theme_pool), 'custom' (manually entered), 'random' (randomly selected)
ALTER TABLE public.festivals
ADD COLUMN IF NOT EXISTS theme_source TEXT;

-- Add check constraint for theme_source values
ALTER TABLE public.festivals
ADD CONSTRAINT festivals_theme_source_check 
CHECK (theme_source IS NULL OR theme_source IN ('pool', 'custom', 'random'));

-- Add index for theme_selected_by for efficient lookups
CREATE INDEX IF NOT EXISTS idx_festivals_theme_selected_by 
ON public.festivals(theme_selected_by) 
WHERE theme_selected_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.festivals.poster_url IS 'URL to custom festival poster image uploaded by admin';
COMMENT ON COLUMN public.festivals.theme_selected_by IS 'User ID of who selected/set the festival theme';
COMMENT ON COLUMN public.festivals.theme_source IS 'Source of theme: pool (from theme_pool), custom (manually entered), or random';

