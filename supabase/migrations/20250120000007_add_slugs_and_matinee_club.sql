-- ============================================
-- ADD SLUGS AND BACKROW MATINEE CLUB
-- ============================================
-- Purpose: 
-- 1. Add slug support to clubs and festivals (NO dates in slugs)
-- 2. Create permanent BackRow Matinee club/system
-- Date: 2025-01-20
-- ============================================

BEGIN;

-- ============================================
-- 1. ADD SLUG COLUMNS AND FESTIVAL_MODE
-- ============================================

-- Add slug column to clubs table
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add slug column to festivals table
ALTER TABLE festivals 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add festival_mode column to clubs table (if it doesn't exist)
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS festival_mode TEXT;

-- Create indexes for slug lookups
CREATE INDEX IF NOT EXISTS idx_clubs_slug ON clubs(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_festivals_slug ON festivals(slug) WHERE slug IS NOT NULL;

-- Create unique constraint on club slugs (only for non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_slug_unique ON clubs(slug) WHERE slug IS NOT NULL;

-- Create unique constraint on festival slugs per club (only for non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_festivals_slug_club_unique ON festivals(club_id, slug) WHERE slug IS NOT NULL;

-- ============================================
-- 2. CREATE SLUG GENERATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase
  -- Replace spaces and special chars with hyphens
  -- Remove multiple consecutive hyphens
  -- Remove leading/trailing hyphens
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3. CREATE BACKROW MATINEE CLUB
-- ============================================

-- Insert BackRow Matinee club if it doesn't exist
-- This is a special system club that runs permanent festivals
-- Note: producer_id should be set to an actual admin user ID after migration
-- For now, we'll use a placeholder that can be updated later
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Try to find an existing admin user (producer of any club)
  SELECT producer_id INTO admin_user_id
  FROM clubs
  WHERE producer_id IS NOT NULL
  LIMIT 1;
  
  -- If no admin found, we'll need to set this manually after migration
  -- For now, use a placeholder UUID that will need to be updated
  IF admin_user_id IS NULL THEN
    admin_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  -- Insert BackRow Matinee club if it doesn't exist (without festival_mode first)
  INSERT INTO clubs (
    id,
    name,
    description,
    privacy,
    producer_id,
    archived,
    slug
  )
  SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    'BackRow Matinee',
    'The official BackRow Matinee club. Join us for our weekly Film of the Week, curated by the BackRow team. Low-pressure, community-driven film discovery.',
    'public_open',
    admin_user_id,
    false,
    'backrow-matinee'
  WHERE NOT EXISTS (
    SELECT 1 FROM clubs WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
  );
  
  -- Update festival_mode after insert (column should exist by now)
  UPDATE clubs
  SET festival_mode = 'matinee'
  WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
    AND (festival_mode IS NULL OR festival_mode != 'matinee');
END $$;

-- ============================================
-- 4. ADD BACKROW MATINEE CLUB ID TO BACKROW_MATINEE TABLE
-- ============================================

-- Add club_id column to link matinee entries to the club
ALTER TABLE backrow_matinee 
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

-- Set default club_id for existing entries
UPDATE backrow_matinee 
SET club_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE club_id IS NULL;

-- Create index for club_id lookups
CREATE INDEX IF NOT EXISTS idx_backrow_matinee_club ON backrow_matinee(club_id);

-- ============================================
-- 5. CREATE FUNCTION TO GET BACKROW MATINEE CLUB ID
-- ============================================

CREATE OR REPLACE FUNCTION get_backrow_matinee_club_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM clubs WHERE slug = 'backrow-matinee' LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

