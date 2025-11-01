-- =============================================================================
-- pgTAP Test Infrastructure Bootstrap
--
-- Run this SQL in the Supabase SQL Editor to set up the test infrastructure.
-- This only needs to be done once per project.
--
-- What it creates:
--   - pgtap extension (in extensions schema)
--   - tests schema with helper functions
--   - _run_pgtap_test RPC function (used by the test runner)
--
-- After running this, you can run: bun run test:rls
-- =============================================================================

-- Enable pgTAP extension for database-level RLS testing
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Create tests schema for helper functions
CREATE SCHEMA IF NOT EXISTS tests;

-- =============================================================================
-- tests.authenticate_as(user_id)
-- Set JWT claims so auth.uid() returns the given user ID.
-- The caller must also run SET LOCAL ROLE authenticated; to activate RLS.
-- Use inside a transaction so config is automatically reverted on ROLLBACK.
-- =============================================================================
CREATE OR REPLACE FUNCTION tests.authenticate_as(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set JWT claims (do NOT set role here -- that must be done at statement level)
  PERFORM set_config('request.jwt.claims', json_build_object(
    'sub', user_id::text,
    'role', 'authenticated',
    'iss', 'supabase',
    'aud', 'authenticated'
  )::text, true);
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
END;
$$;

-- =============================================================================
-- tests.clear_authentication()
-- Clear JWT claims. Caller must also run RESET ROLE; separately.
-- =============================================================================
CREATE OR REPLACE FUNCTION tests.clear_authentication()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;

-- =============================================================================
-- tests.create_test_user(email, username, display_name)
-- Creates a user in both auth.users and public.users. Returns the user ID.
-- =============================================================================
CREATE OR REPLACE FUNCTION tests.create_test_user(
  p_email text,
  p_username text DEFAULT NULL,
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_username text := COALESCE(p_username, 'test_' || substr(v_user_id::text, 1, 8));
  v_display_name text := COALESCE(p_display_name, v_username);
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', p_email,
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('username', v_username, 'display_name', v_display_name)::jsonb,
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO public.users (id, email, username, display_name)
  VALUES (v_user_id, p_email, v_username, v_display_name);

  RETURN v_user_id;
END;
$$;

-- =============================================================================
-- tests.delete_test_user(user_id)
-- Clean up a test user from both auth and public schemas.
-- =============================================================================
CREATE OR REPLACE FUNCTION tests.delete_test_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.users WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- =============================================================================
-- _run_pgtap_test(test_sql)
-- Execute a pgTAP test SQL string and return the TAP output.
-- Called by the test runner (supabase/tests/run-rls-tests.ts) via RPC.
-- =============================================================================
CREATE OR REPLACE FUNCTION public._run_pgtap_test(test_sql text)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY EXECUTE test_sql;
END;
$$;

-- Verify: test the function
SELECT _run_pgtap_test('SELECT 1::text AS result');
