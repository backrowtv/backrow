-- Migration: Abuse prevention — club member ceiling + invite-lookup index.
-- W1 launch posture: cap clubs at 1000 members (standard) / 100000 (endless),
-- enforce at the action layer AND via a restrictive RLS policy so even a
-- service-role INSERT honors the ceiling.

BEGIN;

-- 1. Per-club member ceiling. Default to standard-mode cap (1000).
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 1000;

-- 2. Backfill endless-mode clubs to 100000.
-- festival_mode lives in clubs.settings jsonb.
UPDATE public.clubs
  SET max_members = 100000
  WHERE settings->>'festival_mode' = 'endless';

-- 3. Sanity constraint: must be positive.
ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_max_members_positive CHECK (max_members > 0);

COMMENT ON COLUMN public.clubs.max_members IS
  'Hard ceiling on club_members rows per club. Default 1000 (standard), 100000 (endless). Enforced at action layer + restrictive RLS policy.';

-- 4. Restrictive RLS policy: deny INSERT when the club is already at its cap.
-- Restrictive policies AND with permissive ones, so this composes with the
-- existing "Users can insert club members" policy without replacing it.
CREATE POLICY "Enforce club member cap" ON public.club_members
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    (SELECT count(*) FROM public.club_members cm WHERE cm.club_id = club_members.club_id)
      < (SELECT c.max_members FROM public.clubs c WHERE c.id = club_members.club_id)
  );

-- 5. Supporting index for the daily per-user invite-generation cap.
-- Query shape: SELECT count(*) FROM club_invites WHERE created_by = $1 AND created_at > now() - interval '1 day'
CREATE INDEX IF NOT EXISTS idx_club_invites_created_by_created_at
  ON public.club_invites (created_by, created_at DESC);

COMMIT;
