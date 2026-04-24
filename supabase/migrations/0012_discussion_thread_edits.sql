-- Add edit tracking to discussion_threads
--
-- Authors can edit the body of their own threads (but not the title).
-- Each edit snapshots the prior body into edit_history so readers can expand
-- a "show edits" view on the thread. Mirrors the pattern on discussion_comments
-- (is_edited + edited_at), with an extra JSONB column to retain full history.

ALTER TABLE public.discussion_threads
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_history JSONB NOT NULL DEFAULT '[]'::jsonb;
