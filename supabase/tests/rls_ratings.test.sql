-- =============================================================================
-- RLS Tests: ratings table
-- Tests: 3 assertions
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.test_rls_ratings()
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
  v_rating_id uuid;
  v_tmdb_id integer := 99999;
  v_count int;
BEGIN
  RETURN NEXT plan(3);

  -- Setup: create test users
  v_producer_id := tests.create_test_user('rls_rat_p@test.backrow.tv', 'rls_rat_p', 'Producer');
  v_member_id   := tests.create_test_user('rls_rat_m@test.backrow.tv', 'rls_rat_m', 'Member');
  v_outsider_id := tests.create_test_user('rls_rat_o@test.backrow.tv', 'rls_rat_o', 'Outsider');

  -- Create a private club
  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Ratings Test Club', 'Test', 'private', v_producer_id, '{}'::jsonb);
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_member_id, 'critic');

  -- Create season
  v_season_id := gen_random_uuid();
  INSERT INTO seasons (id, club_id, name, start_date, end_date)
  VALUES (v_season_id, v_club_id, 'Test Season', now(), now() + interval '90 days');

  -- Create festival in watch_rate phase
  v_festival_id := gen_random_uuid();
  INSERT INTO festivals (id, club_id, season_id, theme, status, phase, member_count_at_creation, start_date)
  VALUES (v_festival_id, v_club_id, v_season_id, 'Test Theme', 'watching', 'watch_rate', 2, now());

  -- Create movie
  INSERT INTO movies (tmdb_id, title, year)
  VALUES (v_tmdb_id, 'RLS Test Movie', 2024)
  ON CONFLICT (tmdb_id) DO NOTHING;

  -- Create nomination
  v_nomination_id := gen_random_uuid();
  INSERT INTO nominations (id, festival_id, user_id, tmdb_id)
  VALUES (v_nomination_id, v_festival_id, v_member_id, v_tmdb_id);

  -- Create a rating by the member (as superuser setup)
  v_rating_id := gen_random_uuid();
  INSERT INTO ratings (id, festival_id, nomination_id, user_id, rating)
  VALUES (v_rating_id, v_festival_id, v_nomination_id, v_member_id, 8.0);

  -- Test 1: RLS is enabled on ratings
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'ratings' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on ratings table'
  );

  -- Test 2: Member can read ratings in their club's festival
  PERFORM tests.authenticate_as(v_member_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM ratings WHERE festival_id = v_festival_id;
  RETURN NEXT ok(v_count > 0, 'Member can read ratings in their club festival');
  PERFORM set_config('role', 'postgres', true);

  -- Test 3: Non-member cannot read ratings in a private club's festival
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM ratings WHERE festival_id = v_festival_id;
  RETURN NEXT ok(v_count = 0, 'Non-member cannot read ratings in a private club festival');
  PERFORM set_config('role', 'postgres', true);

  -- Finish
  RETURN QUERY SELECT * FROM finish();

  -- Cleanup
  PERFORM tests.clear_authentication();
  DELETE FROM ratings WHERE festival_id = v_festival_id;
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

SELECT * FROM pg_temp.test_rls_ratings();
