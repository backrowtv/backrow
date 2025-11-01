-- Add scale column to background_images for zoom/crop functionality
-- Scale of 0.5 = 50%, 1.0 = 100% (default), 2.0 = 200%

ALTER TABLE public.background_images 
ADD COLUMN IF NOT EXISTS scale DECIMAL(3,2) NOT NULL DEFAULT 1.00 
CHECK (scale >= 0.5 AND scale <= 2.0);

-- Add comment
COMMENT ON COLUMN public.background_images.scale IS 'Image scale factor for zoom/crop (0.5 = 50%, 1.0 = 100%, max 2.0 = 200%)';

