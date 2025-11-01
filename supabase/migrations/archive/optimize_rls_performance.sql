-- Migration: Optimize RLS Performance
-- Fixes 32 "Auth RLS Initialization Plan" warnings by wrapping auth.uid() in subqueries
-- Also combines multiple permissive policies on clubs table
-- 
-- The issue: auth.uid() gets re-evaluated for each row in RLS policies
-- The fix: Wrap it in a subquery: (select auth.uid()) which is evaluated once per query

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read clubs they're members of" ON public.clubs;
DROP POLICY IF EXISTS "Users can read public clubs" ON public.clubs;
DROP POLICY IF EXISTS "Users can read club members" ON public.club_members;
DROP POLICY IF EXISTS "Users can read seasons" ON public.seasons;
DROP POLICY IF EXISTS "Users can read festivals" ON public.festivals;
DROP POLICY IF EXISTS "Users can read nominations" ON public.nominations;
DROP POLICY IF EXISTS "Users can read ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can read own generic ratings" ON public.generic_ratings;
DROP POLICY IF EXISTS "Users can read stack rankings" ON public.stack_rankings;
DROP POLICY IF EXISTS "Users can read theme pool" ON public.theme_pool;
DROP POLICY IF EXISTS "Users can read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can read chat messages archive" ON public.chat_messages_archive;
DROP POLICY IF EXISTS "Users can read activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Users can read club notes" ON public.club_notes;
DROP POLICY IF EXISTS "Users can read own private notes" ON public.private_notes;
DROP POLICY IF EXISTS "Users can read own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can read blocked users" ON public.blocked_users;

-- Drop policies for tables that may have been created elsewhere
DROP POLICY IF EXISTS "Users can read activity log archive" ON public.activity_log_archive;
DROP POLICY IF EXISTS "Users can read recommendations" ON public.recommendation_list;
DROP POLICY IF EXISTS "Users can read nomination guesses" ON public.nomination_guesses;
DROP POLICY IF EXISTS "Users can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read email digest log" ON public.email_digest_log;
DROP POLICY IF EXISTS "Users can read notification delivery log" ON public.notification_delivery_log;
DROP POLICY IF EXISTS "Users can read notification dead letter queue" ON public.notification_dead_letter_queue;
DROP POLICY IF EXISTS "Users can read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read festival results" ON public.festival_results;
DROP POLICY IF EXISTS "Users can read favorite clubs" ON public.favorite_clubs;

-- Recreate optimized policies with (select auth.uid()) instead of auth.uid()

-- Users: Users can read their own profile and update it
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING ((select auth.uid()) = id);

-- Clubs: Combined policy for members and public clubs (fixes multiple permissive policies warning)
CREATE POLICY "Users can read clubs" ON public.clubs
  FOR SELECT USING (
    privacy IN ('public_open', 'public_password', 'public_invite', 'public_request')
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = clubs.id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Club Members: Users can read members of clubs they belong to
CREATE POLICY "Users can read club members" ON public.club_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_members.club_id
      AND cm.user_id = (select auth.uid())
    )
  );

-- Seasons: Users can read seasons of clubs they're members of
CREATE POLICY "Users can read seasons" ON public.seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = seasons.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Festivals: Users can read festivals of clubs they're members of
CREATE POLICY "Users can read festivals" ON public.festivals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = festivals.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Nominations: Users can read nominations for festivals they have access to
CREATE POLICY "Users can read nominations" ON public.nominations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = nominations.festival_id
      AND cm.user_id = (select auth.uid())
    )
  );

-- Ratings: Users can read ratings for festivals they have access to
CREATE POLICY "Users can read ratings" ON public.ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = (SELECT festival_id FROM public.nominations WHERE id = ratings.nomination_id)
      AND cm.user_id = (select auth.uid())
    )
  );

-- Generic Ratings: Users can read their own ratings
CREATE POLICY "Users can read own generic ratings" ON public.generic_ratings
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Stack Rankings: Users can read stack rankings for festivals they have access to
CREATE POLICY "Users can read stack rankings" ON public.stack_rankings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = stack_rankings.festival_id
      AND cm.user_id = (select auth.uid())
    )
  );

-- Theme Pool: Users can read themes for clubs they're members of
CREATE POLICY "Users can read theme pool" ON public.theme_pool
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = theme_pool.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Chat Messages: Users can read messages for clubs they're members of
CREATE POLICY "Users can read chat messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = chat_messages.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Chat Messages Archive: Same as chat_messages
CREATE POLICY "Users can read chat messages archive" ON public.chat_messages_archive
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = chat_messages_archive.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Activity Log: Users can read activity logs for clubs they're members of
CREATE POLICY "Users can read activity log" ON public.activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = activity_log.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Activity Log Archive: Users can read archived activity logs for clubs they're members of
CREATE POLICY "Users can read activity log archive" ON public.activity_log_archive
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = activity_log_archive.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Club Notes: Users can read notes for clubs they're members of
CREATE POLICY "Users can read club notes" ON public.club_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_notes.club_id
      AND club_members.user_id = (select auth.uid())
    )
  );

-- Private Notes: Users can read their own private notes
CREATE POLICY "Users can read own private notes" ON public.private_notes
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Watch History: Users can read their own watch history
CREATE POLICY "Users can read own watch history" ON public.watch_history
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Blocked Users: Users can read blocks they're involved in
CREATE POLICY "Users can read blocked users" ON public.blocked_users
  FOR SELECT USING ((select auth.uid()) = blocked_by OR (select auth.uid()) = user_id);

-- Recommendation List: Users can read their own recommendations
CREATE POLICY "Users can read recommendations" ON public.recommendation_list
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Nomination Guesses: Users can read nomination guesses for festivals they have access to
CREATE POLICY "Users can read nomination guesses" ON public.nomination_guesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = nomination_guesses.festival_id
      AND cm.user_id = (select auth.uid())
    )
  );

-- Notifications: Users can read their own notifications
CREATE POLICY "Users can read notifications" ON public.notifications
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Email Digest Log: Users can read their own email digest logs
CREATE POLICY "Users can read email digest log" ON public.email_digest_log
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Notification Delivery Log: Users can read delivery logs for their own notifications
CREATE POLICY "Users can read notification delivery log" ON public.notification_delivery_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_delivery_log.notification_id
      AND n.user_id = (select auth.uid())
    )
  );

-- Notification Dead Letter Queue: Users can read dead letter queue entries for their own notifications
CREATE POLICY "Users can read notification dead letter queue" ON public.notification_dead_letter_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_dead_letter_queue.notification_id
      AND n.user_id = (select auth.uid())
    )
  );

-- Subscriptions: Users can read their own subscriptions
CREATE POLICY "Users can read subscriptions" ON public.subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Festival Results: Users can read festival results for festivals they have access to
CREATE POLICY "Users can read festival results" ON public.festival_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = festival_results.festival_id
      AND cm.user_id = (select auth.uid())
    )
  );

-- Favorite Clubs: Users can read their own favorite clubs
CREATE POLICY "Users can read favorite clubs" ON public.favorite_clubs
  FOR SELECT USING ((select auth.uid()) = user_id);

