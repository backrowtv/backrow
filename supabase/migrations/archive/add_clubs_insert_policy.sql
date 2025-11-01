-- Migration: Add INSERT policy for clubs table
-- Users need to be able to create clubs, but there's no INSERT policy

-- Add INSERT policy: Authenticated users can create clubs
-- They must set themselves as the producer_id
CREATE POLICY "Users can create clubs" ON public.clubs
  FOR INSERT 
  WITH CHECK (
    -- Only authenticated users can create clubs
    -- And they must be the producer
    (select auth.uid()) IS NOT NULL
    AND producer_id = (select auth.uid())
  );

