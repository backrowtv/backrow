-- Migration: Enable Row Level Security (RLS) on all public tables
-- This addresses Security Advisor warnings about RLS being disabled
-- For dev environment: Uses permissive policies for authenticated users

-- Enable RLS on all tables that need it
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmdb_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generic_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stack_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users (dev environment)
-- These policies allow authenticated users to access data they need

-- Users: Users can read their own profile and update it
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Clubs: Authenticated users can read clubs they're members of
CREATE POLICY "Users can read clubs they're members of" ON public.clubs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = clubs.id
      AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read public clubs" ON public.clubs
  FOR SELECT USING (privacy IN ('public_open', 'public_password', 'public_invite', 'public_request'));

-- Club Members: Users can read members of clubs they belong to
CREATE POLICY "Users can read club members" ON public.club_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_members.club_id
      AND cm.user_id = auth.uid()
    )
  );

-- Seasons: Users can read seasons of clubs they're members of
CREATE POLICY "Users can read seasons" ON public.seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = seasons.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Festivals: Users can read festivals of clubs they're members of
CREATE POLICY "Users can read festivals" ON public.festivals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = festivals.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Nominations: Users can read nominations for festivals they have access to
CREATE POLICY "Users can read nominations" ON public.nominations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = nominations.festival_id
      AND cm.user_id = auth.uid()
    )
  );

-- Ratings: Users can read ratings for festivals they have access to
CREATE POLICY "Users can read ratings" ON public.ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = (SELECT festival_id FROM public.nominations WHERE id = ratings.nomination_id)
      AND cm.user_id = auth.uid()
    )
  );

-- Generic Ratings: Users can read their own ratings
CREATE POLICY "Users can read own generic ratings" ON public.generic_ratings
  FOR SELECT USING (auth.uid() = user_id);

-- Stack Rankings: Users can read stack rankings for festivals they have access to
CREATE POLICY "Users can read stack rankings" ON public.stack_rankings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      JOIN public.club_members cm ON cm.club_id = f.club_id
      WHERE f.id = stack_rankings.festival_id
      AND cm.user_id = auth.uid()
    )
  );

-- Theme Pool: Users can read themes for clubs they're members of
CREATE POLICY "Users can read theme pool" ON public.theme_pool
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = theme_pool.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Chat Messages: Users can read messages for clubs they're members of
CREATE POLICY "Users can read chat messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = chat_messages.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Chat Messages Archive: Same as chat_messages
CREATE POLICY "Users can read chat messages archive" ON public.chat_messages_archive
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = chat_messages_archive.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Activity Log: Users can read activity logs for clubs they're members of
CREATE POLICY "Users can read activity log" ON public.activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = activity_log.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Club Notes: Users can read notes for clubs they're members of
CREATE POLICY "Users can read club notes" ON public.club_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_notes.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Private Notes: Users can read their own private notes
CREATE POLICY "Users can read own private notes" ON public.private_notes
  FOR SELECT USING (auth.uid() = user_id);

-- Watch History: Users can read their own watch history
CREATE POLICY "Users can read own watch history" ON public.watch_history
  FOR SELECT USING (auth.uid() = user_id);

-- Blocked Users: Users can read blocks they're involved in
CREATE POLICY "Users can read blocked users" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocked_by OR auth.uid() = user_id);

-- Movies: Public read access (TMDB cache)
CREATE POLICY "Anyone can read movies" ON public.movies
  FOR SELECT USING (true);

-- TMDB Search Cache: Public read access
CREATE POLICY "Anyone can read tmdb cache" ON public.tmdb_search_cache
  FOR SELECT USING (true);

-- Note: Service role (used by server actions) bypasses RLS automatically
-- These policies only apply to authenticated users via PostgREST API

