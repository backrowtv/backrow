-- Migration: 0014_user_club_stats_rpc
-- Date: 2026-04-27
--
-- Replaces in-memory aggregation in `getUserClubs` (src/app/actions/clubs/queries.ts)
-- with a single Postgres RPC that returns one row per club with member_count,
-- festival_count, movies_watched, and the phase of any currently-active festival.
--
-- The previous implementation pulled all nominations for every club the user
-- belongs to, then aggregated in JS. With ~30 clubs × ~50 festivals × ~10
-- nominations the round-trip was thousands of rows; the RPC pushes the
-- aggregation server-side and returns a few-row result.
--
-- SECURITY DEFINER lets the function aggregate across club_members rows it
-- couldn't otherwise read in mixed-RLS contexts. Caller passes its own user_id;
-- the surrounding action verifies auth before invoking.
--
-- Semantics match the JS: counts skip soft-deleted festivals/nominations,
-- non-archived clubs only, active phase = first festival in nominating/watching.

CREATE OR REPLACE FUNCTION public.get_user_club_stats(p_user_id uuid)
RETURNS TABLE (
  club_id uuid,
  member_count integer,
  festival_count integer,
  movies_watched integer,
  active_festival_phase text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS club_id,
    (SELECT count(*)::int FROM club_members cm WHERE cm.club_id = c.id) AS member_count,
    (SELECT count(*)::int FROM festivals f
       WHERE f.club_id = c.id AND f.deleted_at IS NULL) AS festival_count,
    (SELECT count(*)::int FROM nominations n
       JOIN festivals f ON f.id = n.festival_id
       WHERE f.club_id = c.id AND n.deleted_at IS NULL) AS movies_watched,
    (SELECT f.phase FROM festivals f
       WHERE f.club_id = c.id
         AND f.deleted_at IS NULL
         AND f.status IN ('nominating', 'watching')
       ORDER BY f.start_date DESC
       LIMIT 1) AS active_festival_phase
  FROM clubs c
  WHERE c.archived = false
    AND c.id IN (
      SELECT cm.club_id FROM club_members cm WHERE cm.user_id = p_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_club_stats(uuid) TO authenticated;
