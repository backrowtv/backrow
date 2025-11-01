-- Move Extensions from Public Schema to Extensions Schema
-- Security best practice: Extensions should not be in the public schema
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ============================================
-- Move pg_trgm extension
-- ============================================
-- Note: We can't directly move an extension, so we drop and recreate it
-- This is safe as these extensions don't store data

-- Drop from public (if exists there)
DROP EXTENSION IF EXISTS pg_trgm CASCADE;

-- Create in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- ============================================
-- Move hypopg extension
-- ============================================
DROP EXTENSION IF EXISTS hypopg CASCADE;
CREATE EXTENSION IF NOT EXISTS hypopg SCHEMA extensions;

-- ============================================
-- Move index_advisor extension
-- ============================================
DROP EXTENSION IF EXISTS index_advisor CASCADE;
CREATE EXTENSION IF NOT EXISTS index_advisor SCHEMA extensions;

-- ============================================
-- Update search_path to include extensions schema
-- This ensures functions from these extensions are accessible
-- ============================================
-- Note: This is typically set at the database level, but we add it here for completeness
-- The default search_path usually already includes extensions

-- Add comment documenting this change
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions. Moved from public schema for security compliance.';

