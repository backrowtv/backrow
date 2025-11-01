-- Migration: Fix infinite recursion in clubs RLS policy
-- The clubs policy checks club_members, which now checks clubs via the security definer function
-- This can cause recursion. Fix by using the security definer function for clubs too.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read clubs" ON public.clubs;

-- Create fixed policy: Users can read clubs if:
-- 1. The club is public, OR
-- 2. They are a member (using security definer function to avoid recursion)
CREATE POLICY "Users can read clubs" ON public.clubs
  FOR SELECT USING (
    privacy IN ('public_open', 'public_password', 'public_invite', 'public_request')
    OR
    -- Use security definer function to check membership without recursion
    public.is_club_member(clubs.id, (select auth.uid()))
  );

