-- ============================================================================
-- Migration 0004: Cascade delete audit + GDPR plumbing
-- ============================================================================
-- Adds public.users.deleted_at soft-delete column.
-- Adds public.users.id FK to auth.users(id) ON DELETE CASCADE so any auth
-- deletion (dashboard, admin API, queue worker) cleans the profile mirror.
-- Fixes ten FK constraints that currently have no ON DELETE clause (default
-- NO ACTION) and would block user deletion or leave orphaned PII.
-- Provisions the private `account-exports` storage bucket + RLS policies
-- used by the async data-export flow.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Soft-delete column on public.users
-- ----------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS users_deleted_at_idx
  ON public.users (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. FK: public.users.id -> auth.users(id) ON DELETE CASCADE
--    Closes the orphan-PII hole when an auth user is deleted outside the app.
-- ----------------------------------------------------------------------------

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 3. Rewrite ten FKs that today have no ON DELETE clause.
--    All become ON DELETE SET NULL — row persists for audit/history,
--    the user reference is cleared on deletion.
-- ----------------------------------------------------------------------------

-- blocked_users.blocked_by
ALTER TABLE public.blocked_users
  DROP CONSTRAINT IF EXISTS blocked_users_blocked_by_fkey;
ALTER TABLE public.blocked_users
  ADD CONSTRAINT blocked_users_blocked_by_fkey
  FOREIGN KEY (blocked_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- club_events.created_by
ALTER TABLE public.club_events
  DROP CONSTRAINT IF EXISTS club_events_created_by_fkey;
ALTER TABLE public.club_events
  ADD CONSTRAINT club_events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- club_invites.created_by
ALTER TABLE public.club_invites
  DROP CONSTRAINT IF EXISTS club_invites_created_by_fkey;
ALTER TABLE public.club_invites
  ADD CONSTRAINT club_invites_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- club_invites.used_by
ALTER TABLE public.club_invites
  DROP CONSTRAINT IF EXISTS club_invites_used_by_fkey;
ALTER TABLE public.club_invites
  ADD CONSTRAINT club_invites_used_by_fkey
  FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- club_resources.created_by
ALTER TABLE public.club_resources
  DROP CONSTRAINT IF EXISTS club_resources_created_by_fkey;
ALTER TABLE public.club_resources
  ADD CONSTRAINT club_resources_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- festivals.theme_selected_by (-> auth.users)
ALTER TABLE public.festivals
  DROP CONSTRAINT IF EXISTS festivals_theme_selected_by_fkey;
ALTER TABLE public.festivals
  ADD CONSTRAINT festivals_theme_selected_by_fkey
  FOREIGN KEY (theme_selected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- site_admins.created_by
ALTER TABLE public.site_admins
  DROP CONSTRAINT IF EXISTS site_admins_created_by_fkey;
ALTER TABLE public.site_admins
  ADD CONSTRAINT site_admins_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- site_announcements.created_by
ALTER TABLE public.site_announcements
  DROP CONSTRAINT IF EXISTS site_announcements_created_by_fkey;
ALTER TABLE public.site_announcements
  ADD CONSTRAINT site_announcements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- site_settings.updated_by
ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_updated_by_fkey;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- clubs.producer_id stays at RESTRICT (default NO ACTION). The business
-- layer (POST /api/account/delete) blocks soft-delete when the user is the
-- sole producer of any active club; hard-delete cannot then run.

-- ----------------------------------------------------------------------------
-- 4. Private `account-exports` storage bucket
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'account-exports',
  'account-exports',
  false,
  104857600, -- 100 MB
  ARRAY['application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- RLS on storage.objects is already enabled by the Supabase storage extension.
-- Service role bypasses RLS, so the queue worker can always upload / delete.
-- Users can only SELECT their own exports (path prefix = their auth uid).

DROP POLICY IF EXISTS "Users read own account exports" ON storage.objects;
CREATE POLICY "Users read own account exports"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'account-exports'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

COMMIT;
