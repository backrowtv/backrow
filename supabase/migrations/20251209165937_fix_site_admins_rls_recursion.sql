-- Fix site_admins RLS infinite recursion
-- 
-- Problem: RLS policies on site_admins query the same table, causing infinite recursion
-- Solution: Create SECURITY DEFINER functions that bypass RLS for admin checks

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only site admins can view site_admins" ON site_admins;
DROP POLICY IF EXISTS "Only super admins can insert site_admins" ON site_admins;
DROP POLICY IF EXISTS "Only super admins can delete site_admins" ON site_admins;

-- Create helper function to check if user is a site admin
-- SECURITY DEFINER allows it to bypass RLS and break the circular dependency
CREATE OR REPLACE FUNCTION is_site_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM site_admins
    WHERE user_id = check_user_id
  );
END;
$$;

-- Create helper function to check if user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM site_admins
    WHERE user_id = check_user_id
    AND role = 'super_admin'
  );
END;
$$;

-- Create new RLS policies using the helper functions

-- Allow site admins to view site_admins table
CREATE POLICY "Only site admins can view site_admins"
ON site_admins
FOR SELECT
TO public
USING (is_site_admin(auth.uid()));

-- Only super admins can insert new site admins
CREATE POLICY "Only super admins can insert site_admins"
ON site_admins
FOR INSERT
TO public
WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can delete site admins
CREATE POLICY "Only super admins can delete site_admins"
ON site_admins
FOR DELETE
TO public
USING (is_super_admin(auth.uid()));

-- Grant execute permissions on the helper functions
GRANT EXECUTE ON FUNCTION is_site_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_site_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO service_role;










