-- ============================================
-- CREATE STORAGE BUCKETS FOR CLUBS AND FESTIVALS
-- ============================================
-- Purpose: Create storage buckets for club and festival customization
-- Date: 2025-12-20
-- ============================================

BEGIN;

-- ============================================
-- 1. CLUB STORAGE BUCKETS
-- ============================================

-- Club backgrounds bucket (for custom background images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-backgrounds',
  'club-backgrounds',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Club pictures bucket (if not already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-pictures',
  'club-pictures',
  true,
  15728640, -- 15MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. FESTIVAL STORAGE BUCKETS
-- ============================================

-- Festival backgrounds bucket (for custom background images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'festival-backgrounds',
  'festival-backgrounds',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Festival pictures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'festival-pictures',
  'festival-pictures',
  true,
  15728640, -- 15MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. CREATE STORAGE POLICIES FOR PUBLIC ACCESS
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Club backgrounds are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload club backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their club backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Club pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload club pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their club pictures" ON storage.objects;
DROP POLICY IF EXISTS "Festival backgrounds are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload festival backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their festival backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Festival pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload festival pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their festival pictures" ON storage.objects;

-- Club backgrounds: Public read access
CREATE POLICY "Club backgrounds are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-backgrounds');

-- Club backgrounds: Authenticated users can upload
CREATE POLICY "Authenticated users can upload club backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'club-backgrounds'
  AND auth.role() = 'authenticated'
);

-- Club backgrounds: Users can delete their own uploads
CREATE POLICY "Users can delete their club backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'club-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Club pictures: Public read access
CREATE POLICY "Club pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-pictures');

-- Club pictures: Authenticated users can upload
CREATE POLICY "Authenticated users can upload club pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'club-pictures'
  AND auth.role() = 'authenticated'
);

-- Club pictures: Users can delete their own uploads
CREATE POLICY "Users can delete their club pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'club-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Festival backgrounds: Public read access
CREATE POLICY "Festival backgrounds are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'festival-backgrounds');

-- Festival backgrounds: Authenticated users can upload
CREATE POLICY "Authenticated users can upload festival backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'festival-backgrounds'
  AND auth.role() = 'authenticated'
);

-- Festival backgrounds: Users can delete their own uploads
CREATE POLICY "Users can delete their festival backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'festival-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Festival pictures: Public read access
CREATE POLICY "Festival pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'festival-pictures');

-- Festival pictures: Authenticated users can upload
CREATE POLICY "Authenticated users can upload festival pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'festival-pictures'
  AND auth.role() = 'authenticated'
);

-- Festival pictures: Users can delete their own uploads
CREATE POLICY "Users can delete their festival pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'festival-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;

