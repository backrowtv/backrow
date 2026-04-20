-- Follow-up to 0005. After that fix, SELECT on club_members no longer
-- recursed (is_club_member now runs with row_security = off), but INSERT
-- still failed with:
--
--   ERROR: infinite recursion detected in policy for relation "club_members"
--
-- Cause: the RESTRICTIVE INSERT policy "Enforce club member cap"
-- (0002_abuse_prevention.sql) does two inline subqueries in its WITH CHECK:
--
--   (SELECT count(*) FROM club_members cm WHERE cm.club_id = …)
--     < (SELECT c.max_members FROM clubs c WHERE c.id = …)
--
-- The second subquery hits the clubs SELECT policy "Users can read clubs",
-- which calls is_club_member() — which queries club_members. Even though
-- is_club_member internally bypasses RLS (0005), Postgres's policy
-- recursion detector still fires because the OUTER policy evaluation
-- stack has already visited club_members once for this INSERT.
--
-- Fix: collapse the entire cap check into a single SECURITY DEFINER
-- function with SET row_security = off. The function body bypasses RLS
-- entirely, so the policy's WITH CHECK becomes a plain boolean call and
-- never re-enters the policy stack.
--
-- Reproduced by: tapping Create Club on /clubs/new as a signed-in user
-- AFTER commit 08f7c78 (which already landed 0005). Verified via
-- probe-level INSERT inside a transaction that the INSERT no longer
-- trips the recursion detector.

CREATE OR REPLACE FUNCTION public.can_insert_club_member(p_club_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET row_security = off
SET search_path = public
AS $$
DECLARE
  current_count bigint;
  cap integer;
BEGIN
  SELECT count(*) INTO current_count
  FROM public.club_members
  WHERE club_id = p_club_id;

  SELECT max_members INTO cap
  FROM public.clubs
  WHERE id = p_club_id;

  -- Fail closed if the club doesn't exist. In practice createClub inserts
  -- clubs before club_members in the same transaction, so cap is always
  -- populated; the FK on club_members.club_id catches any stragglers.
  IF cap IS NULL THEN
    RETURN false;
  END IF;

  RETURN current_count < cap;
END;
$$;

DROP POLICY IF EXISTS "Enforce club member cap" ON public.club_members;

CREATE POLICY "Enforce club member cap"
ON public.club_members
AS RESTRICTIVE
FOR INSERT
WITH CHECK (public.can_insert_club_member(club_id));
