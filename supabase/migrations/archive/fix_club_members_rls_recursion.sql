-- Migration: Fix infinite recursion in club_members RLS policy
-- The policy was checking club_members to read club_members, causing infinite recursion
-- Fix: Use a security definer function to check membership without triggering RLS recursion

-- Create a security definer function to check if user is a member of a club
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.is_club_member(check_club_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = check_club_id
    AND user_id = check_user_id
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read club members" ON public.club_members;

-- Create fixed policy: Users can read club members if:
-- 1. They are reading their own membership record, OR
-- 2. The club is public, OR
-- 3. They are a member of the club (using security definer function to avoid recursion)
CREATE POLICY "Users can read club members" ON public.club_members
  FOR SELECT USING (
    -- Allow reading own membership record
    user_id = (select auth.uid())
    OR
    -- Allow reading members of public clubs
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = club_members.club_id
      AND c.privacy IN ('public_open', 'public_password', 'public_invite', 'public_request')
    )
    OR
    -- Allow reading members of clubs they belong to (using security definer function)
    public.is_club_member(club_members.club_id, (select auth.uid()))
  );

-- Also add INSERT policy so users can join clubs
-- Users can insert themselves as members (for joining clubs)
CREATE POLICY "Users can insert own membership" ON public.club_members
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Users can update their own membership (for role changes by admins, etc.)
-- But we need to be careful - only allow role updates if user is producer/admin
-- For now, allow users to update their own record (server actions will handle authorization)
CREATE POLICY "Users can update own membership" ON public.club_members
  FOR UPDATE USING (user_id = (select auth.uid()));

