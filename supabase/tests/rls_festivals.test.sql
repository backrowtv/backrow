-- =============================================================================
-- RLS Tests: festivals table
-- Tests: 4 assertions
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.test_rls_festivals()
RETURNS SETOF text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_producer_id uuid;
  v_critic_id uuid;
  v_outsider_id uuid;
  v_club_id uuid;
  v_season_id uuid;
  v_festival_id uuid;
  v_count int;
  v_updated_count int;
BEGIN
  RETURN NEXT plan(4);

  -- Setup: create test users
  v_producer_id := tests.create_test_user('rls_fest_p@test.backrow.tv', 'rls_fest_p', 'Producer');
  v_critic_id   := tests.create_test_user('rls_fest_c@test.backrow.tv', 'rls_fest_c', 'Critic');
  v_outsider_id := tests.create_test_user('rls_fest_o@test.backrow.tv', 'rls_fest_o', 'Outsider');

  -- Create a private club
  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Festivals Test Club', 'Test', 'private', v_producer_id, '{}'::jsonb);
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_critic_id, 'critic');

  -- Create season
  v_season_id := gen_random_uuid();
  INSERT INTO seasons (id, club_id, name, start_date, end_date)
  VALUES (v_season_id, v_club_id, 'Test Season', now(), now() + interval '90 days');

  -- Create festival
  v_festival_id := gen_random_uuid();
  INSERT INTO festivals (id, club_id, season_id, theme, status, phase, member_count_at_creation, start_date)
  VALUES (v_festival_id, v_club_id, v_season_id, 'Test Theme', 'nominating', 'nomination', 2, now());

  -- Test 1: RLS is enabled on festivals
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'festivals' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on festivals table'
  );

  -- Test 2: Member can read festivals in their club
  PERFORM tests.authenticate_as(v_critic_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM festivals WHERE id = v_festival_id;
  RETURN NEXT ok(v_count > 0, 'Member can read festivals in their club');
  PERFORM set_config('role', 'postgres', true);

  -- Test 3: Non-member cannot read festivals in private club
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM festivals WHERE id = v_festival_id;
  RETURN NEXT ok(v_count = 0, 'Non-member cannot read festivals in private club');
  PERFORM set_config('role', 'postgres', true);

  -- Test 4: Non-admin (critic) cannot update festival
  PERFORM tests.authenticate_as(v_critic_id);
  PERFORM set_config('role', 'authenticated', true);
  -- UPDATE should silently affect 0 rows (RLS filters it out for non-admins)
  WITH updated AS (
    UPDATE festivals SET theme = 'Hacked Theme' WHERE id = v_festival_id RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;
  RETURN NEXT ok(v_updated_count = 0, 'Non-admin (critic) cannot update festival');
  PERFORM set_config('role', 'postgres', true);

  -- Finish
  RETURN QUERY SELECT * FROM finish();

  -- Cleanup
  PERFORM tests.clear_authentication();
  DELETE FROM discussion_threads WHERE festival_id = v_festival_id;
  DELETE FROM festivals WHERE id = v_festival_id;
  DELETE FROM seasons WHERE id = v_season_id;
  DELETE FROM club_members WHERE club_id = v_club_id;
  DELETE FROM clubs WHERE id = v_club_id;
  PERFORM tests.delete_test_user(v_producer_id);
  PERFORM tests.delete_test_user(v_critic_id);
  PERFORM tests.delete_test_user(v_outsider_id);
END;
$$;

SELECT * FROM pg_temp.test_rls_festivals();
