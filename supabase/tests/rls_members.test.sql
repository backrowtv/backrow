-- =============================================================================
-- RLS Tests: club_members table
-- Tests: 3 assertions
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.test_rls_members()
RETURNS SETOF text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_producer_id uuid;
  v_member_id uuid;
  v_outsider_id uuid;
  v_club_id uuid;
  v_count int;
BEGIN
  RETURN NEXT plan(3);

  -- Setup: create test users
  v_producer_id := tests.create_test_user('rls_mem_p@test.backrow.tv', 'rls_mem_p', 'Producer');
  v_member_id   := tests.create_test_user('rls_mem_m@test.backrow.tv', 'rls_mem_m', 'Member');
  v_outsider_id := tests.create_test_user('rls_mem_o@test.backrow.tv', 'rls_mem_o', 'Outsider');

  -- Create a private club with producer + critic member
  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Members Test Club', 'Test', 'private', v_producer_id, '{}'::jsonb);
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_member_id, 'critic');

  -- Test 1: RLS is enabled on club_members
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'club_members' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on club_members table'
  );

  -- Test 2: Member can read members of their club
  PERFORM tests.authenticate_as(v_member_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM club_members WHERE club_id = v_club_id;
  RETURN NEXT ok(v_count = 2, 'Member can see all members in their club (producer + self)');
  PERFORM set_config('role', 'postgres', true);

  -- Test 3: Non-member cannot read members of a private club
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM club_members WHERE club_id = v_club_id;
  RETURN NEXT ok(v_count = 0, 'Non-member cannot see membership data for a private club');
  PERFORM set_config('role', 'postgres', true);

  -- Finish
  RETURN QUERY SELECT * FROM finish();

  -- Cleanup
  PERFORM tests.clear_authentication();
  DELETE FROM club_members WHERE club_id = v_club_id;
  DELETE FROM clubs WHERE id = v_club_id;
  PERFORM tests.delete_test_user(v_producer_id);
  PERFORM tests.delete_test_user(v_member_id);
  PERFORM tests.delete_test_user(v_outsider_id);
END;
$$;

SELECT * FROM pg_temp.test_rls_members();
