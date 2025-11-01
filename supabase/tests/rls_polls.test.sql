-- =============================================================================
-- RLS Tests: club_polls and club_poll_votes tables
-- Tests: 4 assertions
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.test_rls_polls()
RETURNS SETOF text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_producer_id uuid;
  v_critic_id uuid;
  v_outsider_id uuid;
  v_club_id uuid;
  v_poll_id uuid;
  v_count int;
BEGIN
  RETURN NEXT plan(4);

  -- Setup: create test users
  v_producer_id := tests.create_test_user('rls_poll_p@test.backrow.tv', 'rls_poll_p', 'Producer');
  v_critic_id   := tests.create_test_user('rls_poll_c@test.backrow.tv', 'rls_poll_c', 'Critic');
  v_outsider_id := tests.create_test_user('rls_poll_o@test.backrow.tv', 'rls_poll_o', 'Outsider');

  -- Create a private club
  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Polls Test Club', 'Test', 'private', v_producer_id, '{}'::jsonb);
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_critic_id, 'critic');

  -- Create a poll by the producer
  v_poll_id := gen_random_uuid();
  INSERT INTO club_polls (id, club_id, user_id, question, options)
  VALUES (v_poll_id, v_club_id, v_producer_id, 'What genre next?', '["Horror", "Comedy", "Drama"]'::jsonb);

  -- Test 1: RLS is enabled on club_polls
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'club_polls' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on club_polls table'
  );

  -- Test 2: RLS is enabled on club_poll_votes
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'club_poll_votes' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on club_poll_votes table'
  );

  -- Test 3: Member can read polls in their club
  PERFORM tests.authenticate_as(v_critic_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM club_polls WHERE id = v_poll_id;
  RETURN NEXT ok(v_count > 0, 'Member can read polls in their club');
  PERFORM set_config('role', 'postgres', true);

  -- Test 4: Non-member cannot read polls in private club
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM club_polls WHERE id = v_poll_id;
  RETURN NEXT ok(v_count = 0, 'Non-member cannot read polls in private club');
  PERFORM set_config('role', 'postgres', true);

  -- Finish
  RETURN QUERY SELECT * FROM finish();

  -- Cleanup
  PERFORM tests.clear_authentication();
  DELETE FROM club_poll_votes WHERE poll_id = v_poll_id;
  DELETE FROM club_polls WHERE id = v_poll_id;
  DELETE FROM club_members WHERE club_id = v_club_id;
  DELETE FROM clubs WHERE id = v_club_id;
  PERFORM tests.delete_test_user(v_producer_id);
  PERFORM tests.delete_test_user(v_critic_id);
  PERFORM tests.delete_test_user(v_outsider_id);
END;
$$;

SELECT * FROM pg_temp.test_rls_polls();
