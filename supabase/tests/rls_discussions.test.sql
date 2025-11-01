-- =============================================================================
-- RLS Tests: discussion_threads and discussion_comments tables
-- Tests: 5 assertions
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.test_rls_discussions()
RETURNS SETOF text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_producer_id uuid;
  v_member_id uuid;
  v_outsider_id uuid;
  v_club_id uuid;
  v_thread_id uuid;
  v_comment_id uuid;
  v_count int;
  v_deleted_count int;
BEGIN
  RETURN NEXT plan(5);

  -- Setup: create test users
  v_producer_id := tests.create_test_user('rls_disc_p@test.backrow.tv', 'rls_disc_p', 'Producer');
  v_member_id   := tests.create_test_user('rls_disc_m@test.backrow.tv', 'rls_disc_m', 'Member');
  v_outsider_id := tests.create_test_user('rls_disc_o@test.backrow.tv', 'rls_disc_o', 'Outsider');

  -- Create a private club
  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Discussions Test Club', 'Test', 'private', v_producer_id, '{}'::jsonb);
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_member_id, 'critic');

  -- Create a thread by the producer
  v_thread_id := gen_random_uuid();
  INSERT INTO discussion_threads (id, club_id, title, content, author_id, thread_type)
  VALUES (v_thread_id, v_club_id, 'RLS Test Thread', 'Test content', v_producer_id, 'custom');

  -- Create a comment by the producer
  v_comment_id := gen_random_uuid();
  INSERT INTO discussion_comments (id, thread_id, author_id, content)
  VALUES (v_comment_id, v_thread_id, v_producer_id, 'Producer comment');

  -- Test 1: RLS is enabled on discussion_threads
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'discussion_threads' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on discussion_threads table'
  );

  -- Test 2: RLS is enabled on discussion_comments
  RETURN NEXT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'discussion_comments' AND relnamespace = 'public'::regnamespace),
    'RLS is enabled on discussion_comments table'
  );

  -- Test 3: Member can read threads in their club
  PERFORM tests.authenticate_as(v_member_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM discussion_threads WHERE id = v_thread_id;
  RETURN NEXT ok(v_count > 0, 'Member can read threads in their club');
  PERFORM set_config('role', 'postgres', true);

  -- Test 4: Non-member cannot read threads in private club
  PERFORM tests.authenticate_as(v_outsider_id);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_count FROM discussion_threads WHERE id = v_thread_id;
  RETURN NEXT ok(v_count = 0, 'Non-member cannot read threads in private club');
  PERFORM set_config('role', 'postgres', true);

  -- Test 5: Member cannot delete another member's comment
  PERFORM tests.authenticate_as(v_member_id);
  PERFORM set_config('role', 'authenticated', true);
  WITH deleted AS (
    DELETE FROM discussion_comments WHERE id = v_comment_id RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;
  RETURN NEXT ok(v_deleted_count = 0, 'Member cannot delete another member''s comment');
  PERFORM set_config('role', 'postgres', true);

  -- Finish
  RETURN QUERY SELECT * FROM finish();

  -- Cleanup
  PERFORM tests.clear_authentication();
  DELETE FROM discussion_comments WHERE thread_id = v_thread_id;
  DELETE FROM discussion_threads WHERE id = v_thread_id;
  DELETE FROM club_members WHERE club_id = v_club_id;
  DELETE FROM clubs WHERE id = v_club_id;
  PERFORM tests.delete_test_user(v_producer_id);
  PERFORM tests.delete_test_user(v_member_id);
  PERFORM tests.delete_test_user(v_outsider_id);
END;
$$;

SELECT * FROM pg_temp.test_rls_discussions();
