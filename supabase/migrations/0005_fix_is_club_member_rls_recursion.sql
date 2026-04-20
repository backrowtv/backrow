-- Fix "infinite recursion detected in policy for relation club_members"
--
-- The INSERT policy "Enforce club member cap" (from 0002_abuse_prevention.sql)
-- checks `SELECT count(*) FROM club_members WHERE club_id = …`. That SELECT
-- triggers the "Users can read club members" SELECT policy, which calls
-- is_club_member(club_id, auth.uid()), whose body is
-- `SELECT 1 FROM club_members …`, which triggers the same SELECT policy, which
-- calls is_club_member again → Postgres trips its recursion detector and the
-- INSERT fails with:
--
--   ERROR: infinite recursion detected in policy for relation "club_members"
--
-- SECURITY DEFINER + BYPASSRLS on the owner is NOT enough to sidestep this —
-- Postgres evaluates the outer policy before the function body runs. The
-- canonical fix is `SET row_security = off` on the function so its inner
-- SELECT bypasses RLS entirely. Applied to all three helpers for consistency
-- even though only is_club_member triggered the recursion today; the same
-- class of bug can easily be added later to the others.
--
-- Reproduced by: tapping Create Club on /clubs/new as a signed-in user
-- (commit ab75dad, 2026-04-20).
ALTER FUNCTION public.is_club_member(uuid, uuid) SET row_security = off;
ALTER FUNCTION public.is_club_producer(uuid, uuid) SET row_security = off;
ALTER FUNCTION public.is_club_public(uuid) SET row_security = off;
