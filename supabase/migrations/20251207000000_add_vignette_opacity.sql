-- Add vignette_opacity column to background_images table
-- Controls the opacity of the dark vignette at the bottom of hero backgrounds
-- 0 = no vignette (good for images with light bottoms)
-- 0.4 = default subtle vignette (works for most images)
-- 0.7+ = strong vignette (for dark images needing better blend)

ALTER TABLE public.background_images
ADD COLUMN IF NOT EXISTS vignette_opacity DECIMAL(3,2) NOT NULL DEFAULT 0.40
CHECK (vignette_opacity >= 0.0 AND vignette_opacity <= 1.0);

-- Add comment
COMMENT ON COLUMN public.background_images.vignette_opacity IS 'Opacity of the dark vignette overlay at bottom of image (0-1). Use 0 for images with light bottoms.';

