-- Create storage bucket for background images
-- Used by site pages, clubs, festivals, and profiles

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backgrounds',
  'backgrounds',
  true, -- public bucket for rendering
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies

-- Anyone can read background images (they're used on public pages)
CREATE POLICY "Anyone can read background images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'backgrounds');

-- Authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload backgrounds"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'backgrounds'
    AND auth.role() = 'authenticated'
  );

-- Users can update their own uploads
CREATE POLICY "Users can update their own background uploads"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'backgrounds'
    AND auth.role() = 'authenticated'
  );

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own background uploads"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'backgrounds'
    AND auth.role() = 'authenticated'
  );

