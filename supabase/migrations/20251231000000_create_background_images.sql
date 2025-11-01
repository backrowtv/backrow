-- Create background_images table for reusable page/entity backgrounds
-- Used for site pages, clubs, festivals, and profiles

CREATE TABLE IF NOT EXISTS public.background_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('site_page', 'club', 'festival', 'profile')),
  entity_id TEXT NOT NULL, -- page path for site_page (e.g., "/", "/faq"), uuid for others
  image_url TEXT NOT NULL,
  height_preset TEXT NOT NULL DEFAULT 'default' CHECK (height_preset IN ('compact', 'default', 'tall', 'custom')),
  height_px INTEGER, -- only used when height_preset is 'custom'
  opacity DECIMAL(3,2) NOT NULL DEFAULT 0.80 CHECK (opacity >= 0.1 AND opacity <= 1.0),
  object_position TEXT NOT NULL DEFAULT 'center center',
  credit_title TEXT,
  credit_year INTEGER,
  credit_studio TEXT,
  credit_actor TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one background per entity
  CONSTRAINT background_images_entity_unique UNIQUE (entity_type, entity_id)
);

-- Add updated_at trigger
CREATE TRIGGER set_background_images_updated_at
  BEFORE UPDATE ON public.background_images
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create indexes for common queries
CREATE INDEX idx_background_images_entity ON public.background_images(entity_type, entity_id);
CREATE INDEX idx_background_images_active ON public.background_images(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.background_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can read active backgrounds (needed for rendering pages)
CREATE POLICY "Anyone can read active backgrounds"
  ON public.background_images
  FOR SELECT
  USING (is_active = true);

-- Site admins can manage site_page backgrounds (checked in server action)
-- For now, allow authenticated users to manage their own entity backgrounds
CREATE POLICY "Users can manage their own entity backgrounds"
  ON public.background_images
  FOR ALL
  USING (
    -- Site pages: only admin (enforced in server action)
    (entity_type = 'site_page') OR
    -- Clubs: club director can manage
    (entity_type = 'club' AND EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = entity_id::uuid
        AND cm.user_id = auth.uid()
        AND cm.role = 'director'
    )) OR
    -- Profiles: user can manage their own
    (entity_type = 'profile' AND entity_id::uuid = auth.uid()) OR
    -- Festivals: club director can manage
    (entity_type = 'festival' AND EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = entity_id::uuid
        AND cm.user_id = auth.uid()
        AND cm.role = 'director'
    ))
  );

-- Add comment
COMMENT ON TABLE public.background_images IS 'Stores background image settings for site pages, clubs, festivals, and profiles';

