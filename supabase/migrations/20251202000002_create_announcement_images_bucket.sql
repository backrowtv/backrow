-- ============================================
-- CREATE STORAGE BUCKET FOR ANNOUNCEMENT IMAGES
-- ============================================
-- Purpose: Create storage bucket for announcement feature images
-- Date: 2025-12-02
-- ============================================

BEGIN;

-- ============================================
-- 1. CREATE ANNOUNCEMENT IMAGES BUCKET
-- ============================================

-- Announcement images bucket (for rich announcement header/featured images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-images',
  'announcement-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CREATE STORAGE POLICIES
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Announcement images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their announcement images" ON storage.objects;

-- Announcement images: Public read access
CREATE POLICY "Announcement images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-images');

-- Announcement images: Authenticated users can upload
CREATE POLICY "Authenticated users can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcement-images'
  AND auth.role() = 'authenticated'
);

-- Announcement images: Users can delete their own uploads
CREATE POLICY "Users can delete their announcement images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'announcement-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;

