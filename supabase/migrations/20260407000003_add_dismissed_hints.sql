-- Add dismissed_hints JSONB column to users table
-- Stores UI hint/tooltip/banner dismissal state as { "hint-key": true }
-- Replaces localStorage-based dismissal tracking for cross-device persistence
ALTER TABLE users ADD COLUMN IF NOT EXISTS dismissed_hints JSONB DEFAULT '{}'::jsonb;
