-- ============================================
-- ALLOW NULL THEME FOR THEME_SELECTION PHASE
-- ============================================
-- Purpose: 
-- 1. Allow theme to be NULL when phase is 'theme_selection'
-- 2. Add check constraint to ensure theme is set for phases after theme_selection
-- 3. Update existing placeholder themes to NULL
-- Date: 2025-01-21
-- ============================================

BEGIN;

-- ============================================
-- 1. DROP NOT NULL CONSTRAINT
-- ============================================

ALTER TABLE festivals 
ALTER COLUMN theme DROP NOT NULL;

-- ============================================
-- 2. UPDATE EXISTING PLACEHOLDER THEMES
-- ============================================

-- Update existing placeholder themes to NULL for festivals in theme_selection phase
UPDATE festivals 
SET theme = NULL 
WHERE phase = 'theme_selection' AND theme = 'Theme Selection Pending';

-- ============================================
-- 3. ADD CHECK CONSTRAINT
-- ============================================

-- Add check constraint to ensure theme is set for phases after theme_selection
ALTER TABLE festivals
ADD CONSTRAINT theme_required_after_selection 
CHECK (phase = 'theme_selection' OR theme IS NOT NULL);

-- ============================================
-- 4. ADD CONSTRAINT COMMENT
-- ============================================

COMMENT ON CONSTRAINT theme_required_after_selection ON festivals IS 
'Theme can be NULL only during theme_selection phase. Must be set for all other phases.';

COMMIT;

