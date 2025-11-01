-- Create club_movie_pool table for storing movie pool items independent of festivals
-- This allows the movie pool feature to work for both standard and endless festival clubs

CREATE TABLE IF NOT EXISTS public.club_movie_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL REFERENCES public.movies(tmdb_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pitch TEXT, -- Optional curator note
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete

  -- Prevent duplicate movies in the same club's pool
  UNIQUE(club_id, tmdb_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_club_movie_pool_club_id ON public.club_movie_pool(club_id);
CREATE INDEX IF NOT EXISTS idx_club_movie_pool_user_id ON public.club_movie_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_club_movie_pool_created_at ON public.club_movie_pool(created_at DESC);

-- Enable RLS
ALTER TABLE public.club_movie_pool ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Members can view pool items in their clubs
CREATE POLICY "Club members can view movie pool"
  ON public.club_movie_pool
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_movie_pool.club_id
      AND club_members.user_id = (SELECT auth.uid())
    )
  );

-- Members can add to pool if club allows non-admin adds, or if they're admin
CREATE POLICY "Members can add to movie pool"
  ON public.club_movie_pool
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.clubs c ON c.id = cm.club_id
      WHERE cm.club_id = club_movie_pool.club_id
      AND cm.user_id = (SELECT auth.uid())
      AND (
        cm.role IN ('producer', 'director')
        OR COALESCE((c.settings->>'allow_non_admin_movie_pool')::boolean, true) = true
      )
    )
  );

-- Users can soft-delete their own pool items, admins can delete any
CREATE POLICY "Users can remove their pool items"
  ON public.club_movie_pool
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_movie_pool.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role IN ('producer', 'director')
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_movie_pool.club_id
      AND club_members.user_id = (SELECT auth.uid())
      AND club_members.role IN ('producer', 'director')
    )
  );

-- Update movie_pool_votes to also reference club_movie_pool
-- Add a nullable club_movie_pool_id column
ALTER TABLE public.movie_pool_votes
  ADD COLUMN IF NOT EXISTS club_pool_item_id UUID REFERENCES public.club_movie_pool(id) ON DELETE CASCADE;

-- Make nomination_id nullable since votes can now be for club_movie_pool items
ALTER TABLE public.movie_pool_votes
  ALTER COLUMN nomination_id DROP NOT NULL;

-- Add check constraint to ensure either nomination_id or club_pool_item_id is set
ALTER TABLE public.movie_pool_votes
  ADD CONSTRAINT movie_pool_votes_item_check
  CHECK (nomination_id IS NOT NULL OR club_pool_item_id IS NOT NULL);

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_movie_pool_votes_club_pool_item_id
  ON public.movie_pool_votes(club_pool_item_id);

COMMENT ON TABLE public.club_movie_pool IS 'Stores movie pool items for clubs, independent of festivals. Works for both standard and endless festival clubs.';
