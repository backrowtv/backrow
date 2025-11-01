-- =============================================================================
-- RLS Tests: nominations table
-- Tests: 4 assertions
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.test_rls_nominations()
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
  v_nomination_id uuid;
  v_tmdb_id integer := 88801;
  v_count int;
BEGIN
  RETURN NEXT plan(4);

  -- Setup: create test users
  v_producer_id := tests.create_test_user('rls_nom_p@test.backrow.tv', 'rls_nom_p', 'Producer');
  v_member_id   := tests.create_test_user('rls_nom_m@test.backrow.tv', 'rls_nom_m', 'Member');
  v_outsider_id := tests.create_test_user('rls_nom_o@test.backrow.tv', 'rls_nom_o', 'Outsider');

  -- Create a private club
  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Nominations Test Club', 'Test', 'private', v_producer_id, '{}'::jsonb);
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_member_id, 'critic');

  -- Create season
  v_season_id := gen_random_uuid();
  INSERT INTO seasons (id, club_id, name, start_date, end_date)
  VALUES (v_season_id, v_club_id, 'Test Season', now(), now() + interval '90 days');

  -- Create festival in nomination phase
  v_festival_id := gen_random_uuid();
  INSERT INTO festivals (id, club_id, season_id, theme, status, phase, member_count_at_creation, start_date)
  VALUES (v_festival_id, v_club_id, v_season_id, 'Test Theme', 'nominating', 'nomination', 2, now());

  -- Create movie
  INSERT INTO movies (tmdb_id, title, year)
  VALUES (v_tmdb_id, 'RLS Nominations Test Movie', 2024)
  ON CONFLICT (tmdb_id) DO NOTHING;

  -- Create a nomination by the producer
  v_nomination_id := gen_random_uuid();
  INSERT INTO nominations (id, festival_id, user_id, tmdb_id)
  VALUES (v_nomination_id, v_festival_id, v_producer_id, v_tmdb_id);

  -- Test 1: RLS is enabled on nominations
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'nominations' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on nominations table'
  );

  -- Test 2: Member can read nominations in their club's festival
  PERFORM tests.authenticate_as(v_member_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM nominations WHERE festival_id = v_festival_id;
  RETURN NEXT ok(v_count > 0, 'Member can read nominations in their club festival');
  PERFORM set_config('role', 'postgres', true);

  -- Test 3: Non-member cannot read nominations in private club's festival
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM nominations WHERE festival_id = v_festival_id;
  RETURN NEXT ok(v_count = 0, 'Non-member cannot read nominations in private club festival');
  PERFORM set_config('role', 'postgres', true);

  -- Test 4: Member cannot delete another member's nomination
  PERFORM tests.authenticate_as(v_member_id);
  PERFORM set_config('role', 'authenticated', true);
  DELETE FROM nominations WHERE id = v_nomination_id;
  PERFORM set_config('role', 'postgres', true);
  -- Check it still exists (as superuser)
  SELECT count(*) INTO v_count FROM nominations WHERE id = v_nomination_id;
  RETURN NEXT ok(v_count = 1, 'Member cannot delete another member''s nomination');

  -- Finish
  RETURN QUERY SELECT * FROM finish();

  -- Cleanup
  PERFORM tests.clear_authentication();
  DELETE FROM nominations WHERE festival_id = v_festival_id;
  DELETE FROM discussion_threads WHERE festival_id = v_festival_id;
  DELETE FROM festivals WHERE id = v_festival_id;
  DELETE FROM seasons WHERE id = v_season_id;
  DELETE FROM club_members WHERE club_id = v_club_id;
  DELETE FROM clubs WHERE id = v_club_id;
  DELETE FROM movies WHERE tmdb_id = v_tmdb_id;
  PERFORM tests.delete_test_user(v_producer_id);
  PERFORM tests.delete_test_user(v_member_id);
  PERFORM tests.delete_test_user(v_outsider_id);
END;
$$;

SELECT * FROM pg_temp.test_rls_nominations();
