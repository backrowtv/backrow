-- Allow voting on movies inserted via `club_pool_item_id` (the club-level pool),
-- not just legacy `nomination_id` rows.
--
-- The existing INSERT and SELECT policies only joined `movie_pool_votes` →
-- `nominations` → `festivals` → `club_members`. That join can't fire when the
-- vote row has `nomination_id IS NULL` and `club_pool_item_id` populated, which
-- is what `togglePoolMovieVote` writes today. Result: the database denied
-- every pool upvote with an RLS error, regardless of who was voting.
--
-- Both policies are widened to handle either reference: a vote is allowed
-- when the user is a club member of EITHER the festival the nomination
-- belongs to, OR the club_movie_pool row's club. DELETE still only checks
-- ownership of the vote row, which is correct.

DROP POLICY IF EXISTS "Users can vote for movies in their clubs" ON public.movie_pool_votes;

CREATE POLICY "Users can vote for movies in their clubs"
  ON public.movie_pool_votes
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      -- Legacy path: vote attached to a nomination row.
      EXISTS (
        SELECT 1
        FROM public.nominations n
        JOIN public.festivals f ON n.festival_id = f.id
        JOIN public.club_members cm ON f.club_id = cm.club_id
        WHERE n.id = movie_pool_votes.nomination_id
          AND cm.user_id = (SELECT auth.uid())
      )
      OR
      -- Current path: vote attached to a club movie pool item.
      EXISTS (
        SELECT 1
        FROM public.club_movie_pool cmp
        JOIN public.club_members cm ON cmp.club_id = cm.club_id
        WHERE cmp.id = movie_pool_votes.club_pool_item_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can view movie pool votes in their clubs" ON public.movie_pool_votes;

CREATE POLICY "Users can view movie pool votes in their clubs"
  ON public.movie_pool_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.nominations n
      JOIN public.festivals f ON n.festival_id = f.id
      JOIN public.club_members cm ON f.club_id = cm.club_id
      WHERE n.id = movie_pool_votes.nomination_id
        AND cm.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.club_movie_pool cmp
      JOIN public.club_members cm ON cmp.club_id = cm.club_id
      WHERE cmp.id = movie_pool_votes.club_pool_item_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );
