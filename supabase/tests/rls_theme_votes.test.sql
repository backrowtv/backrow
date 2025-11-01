-- =============================================================================
-- RLS Tests: theme_votes table
-- Tests: 4 assertions
-- NOTE: theme_votes INSERT policy only checks user_id = auth.uid(), NOT club
--       membership. This is a known RLS gap -- the app layer enforces membership.
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.test_rls_theme_votes()
RETURNS SETOF text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_producer_id uuid;
  v_member_id uuid;
  v_outsider_id uuid;
  v_club_id uuid;
  v_season_id uuid;
  v_festival_id uuid;
  v_theme_id uuid;
  v_count int;
  v_insert_ok boolean;
BEGIN
  RETURN NEXT plan(4);

  -- Setup: create test users
  v_producer_id := tests.create_test_user('rls_tv_p@test.backrow.tv', 'rls_tv_p', 'Producer');
  v_member_id   := tests.create_test_user('rls_tv_m@test.backrow.tv', 'rls_tv_m', 'Member');
  v_outsider_id := tests.create_test_user('rls_tv_o@test.backrow.tv', 'rls_tv_o', 'Outsider');

  -- Create a private club
  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Theme Votes Test Club', 'Test', 'private', v_producer_id, '{}'::jsonb);
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_member_id, 'critic');

  -- Create season
  v_season_id := gen_random_uuid();
  INSERT INTO seasons (id, club_id, name, start_date, end_date)
  VALUES (v_season_id, v_club_id, 'Test Season', now(), now() + interval '90 days');

  -- Create festival in theme_selection phase
  v_festival_id := gen_random_uuid();
  INSERT INTO festivals (id, club_id, season_id, theme, status, phase, member_count_at_creation, start_date)
  VALUES (v_festival_id, v_club_id, v_season_id, NULL, 'idle', 'theme_selection', 2, now());

  -- Create a theme pool entry
  v_theme_id := gen_random_uuid();
  INSERT INTO theme_pool (id, club_id, theme_name, added_by)
  VALUES (v_theme_id, v_club_id, 'Film Noir', v_producer_id);

  -- Insert a vote by the producer (as superuser setup)
  INSERT INTO theme_votes (festival_id, user_id, theme_id)
  VALUES (v_festival_id, v_producer_id, v_theme_id);

  -- Test 1: RLS is enabled on theme_votes
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'theme_votes' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on theme_votes table'
  );

  -- Test 2: Member can read theme votes for their club's festival
  PERFORM tests.authenticate_as(v_member_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM theme_votes WHERE festival_id = v_festival_id;
  RETURN NEXT ok(v_count > 0, 'Member can read theme votes for their club festival');
  PERFORM set_config('role', 'postgres', true);

  -- Test 3: Non-member cannot read theme votes
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM theme_votes WHERE festival_id = v_festival_id;
  RETURN NEXT ok(v_count = 0, 'Non-member cannot read theme votes');
  PERFORM set_config('role', 'postgres', true);

  -- Test 4: Non-member CAN insert theme vote (known RLS gap)
  -- The INSERT policy only checks user_id = auth.uid(), not membership.
  -- App layer must enforce membership.
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    INSERT INTO theme_votes (festival_id, user_id, theme_id)
    VALUES (v_festival_id, v_outsider_id, v_theme_id);
    v_insert_ok := true;
  EXCEPTION WHEN OTHERS THEN
    v_insert_ok := false;
  END;
  RETURN NEXT ok(v_insert_ok, 'Non-member CAN insert theme vote (RLS gap - app layer must enforce membership)');
  PERFORM set_config('role', 'postgres', true);

  -- Finish
  RETURN QUERY SELECT * FROM finish();

  -- Cleanup
  PERFORM tests.clear_authentication();
  DELETE FROM theme_votes WHERE festival_id = v_festival_id;
  DELETE FROM theme_pool WHERE id = v_theme_id;
  DELETE FROM festivals WHERE id = v_festival_id;
  DELETE FROM seasons WHERE id = v_season_id;
  DELETE FROM club_members WHERE club_id = v_club_id;
  DELETE FROM clubs WHERE id = v_club_id;
  PERFORM tests.delete_test_user(v_producer_id);
  PERFORM tests.delete_test_user(v_member_id);
  PERFORM tests.delete_test_user(v_outsider_id);
END;
$$;

SELECT * FROM pg_temp.test_rls_theme_votes();
