-- Comprehensive cleanup and fix for clubs and club_members RLS policies
-- This migration cleans up all conflicting policies and functions, then recreates them properly
-- Date: 2024-11-18
-- Purpose: Fix private club creation issue and resolve RLS recursion problems

-- ============================================================================
-- STEP 1: Drop ALL existing policies on clubs and club_members tables
-- ============================================================================

-- Drop all clubs policies
DROP POLICY IF EXISTS "Users can read clubs" ON public.clubs;
DROP POLICY IF EXISTS "Users can read clubs they're members of" ON public.clubs;
DROP POLICY IF EXISTS "Users can read public clubs" ON public.clubs;
DROP POLICY IF EXISTS "Users can create clubs" ON public.clubs;
DROP POLICY IF EXISTS "Users can update their clubs" ON public.clubs;
DROP POLICY IF EXISTS "Users can delete their clubs" ON public.clubs;

-- Drop all club_members policies
DROP POLICY IF EXISTS "Users can read club members" ON public.club_members;
DROP POLICY IF EXISTS "Users can insert club members" ON public.club_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.club_members;
DROP POLICY IF EXISTS "Users can create club members" ON public.club_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.club_members;
DROP POLICY IF EXISTS "Club producers can update members" ON public.club_members;
DROP POLICY IF EXISTS "Users can delete club members" ON public.club_members;

-- ============================================================================
-- STEP 2: Drop the is_club_member function (handle all possible parameter variants)
-- ============================================================================

-- Drop function with all possible parameter name combinations
DROP FUNCTION IF EXISTS public.is_club_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_club_member(check_club_id uuid, check_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_club_member(p_club_id uuid, p_user_id uuid) CASCADE;

-- ============================================================================
-- STEP 3: Create the security definer function properly
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- This function bypasses RLS to check membership without recursion
  RETURN EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_id = p_club_id 
    AND user_id = p_user_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_club_member(uuid, uuid) IS 
'Helper function to check club membership without RLS recursion. Uses SECURITY DEFINER to bypass RLS when checking membership.';

-- ============================================================================
-- STEP 4: Create clubs table policies
-- ============================================================================

-- SELECT: Users can read clubs if:
-- 1. Club is public (any public privacy type), OR
-- 2. User is the producer, OR  
-- 3. User is a member (using security definer function to avoid recursion)
CREATE POLICY "Users can read clubs" ON public.clubs
  FOR SELECT 
  USING (
    privacy LIKE 'public_%'
    OR producer_id = (select auth.uid())
    OR public.is_club_member(id, (select auth.uid()))
  );

-- INSERT: Users can create clubs if:
-- 1. They are authenticated, AND
-- 2. They set themselves as the producer
CREATE POLICY "Users can create clubs" ON public.clubs
  FOR INSERT 
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND producer_id = (select auth.uid())
  );

-- UPDATE: Users can update clubs if they are the producer
CREATE POLICY "Users can update their clubs" ON public.clubs
  FOR UPDATE
  USING (producer_id = (select auth.uid()));

-- DELETE: Users can delete clubs if they are the producer
CREATE POLICY "Users can delete their clubs" ON public.clubs
  FOR DELETE
  USING (producer_id = (select auth.uid()));

-- ============================================================================
-- STEP 5: Create club_members table policies
-- ============================================================================

-- SELECT: Users can read club members if:
-- 1. They are reading their own membership, OR
-- 2. The club is public (any public privacy type), OR
-- 3. They are a member of the club (using security definer function to avoid recursion)
CREATE POLICY "Users can read club members" ON public.club_members
  FOR SELECT 
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.privacy LIKE 'public_%'
    )
    OR public.is_club_member(club_id, (select auth.uid()))
  );

-- INSERT: Users can insert club members if:
-- 1. They are adding themselves, OR
-- 2. They are the club producer (for adding others)
CREATE POLICY "Users can insert club members" ON public.club_members
  FOR INSERT 
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE clubs.id = club_members.club_id 
      AND clubs.producer_id = (select auth.uid())
    )
  );

-- UPDATE: Club producers can update memberships
CREATE POLICY "Club producers can update members" ON public.club_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.producer_id = (select auth.uid())
    )
  );

-- DELETE: Users can delete club members if:
-- 1. They are removing themselves, OR
-- 2. They are the club producer (for removing others)
CREATE POLICY "Users can delete club members" ON public.club_members
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.producer_id = (select auth.uid())
    )
  );

