-- Migration: Add missing UPDATE policy for users table
-- This allows users to update their own profile (including mobile_nav_preferences, sidebar_nav_preferences)

-- Add UPDATE policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Also ensure SELECT policy exists for users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING ((SELECT auth.uid()) = id);

