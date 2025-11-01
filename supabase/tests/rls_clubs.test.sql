-- =============================================================================
-- RLS Tests: clubs table
--
-- Tests:
--   1. RLS is enabled on clubs
--   2. Producer can read their own club
--   3. Non-member cannot read a private club
--   4. Member can read their club
-- =============================================================================
BEGIN;

SELECT extensions.plan(4);

DO $$
DECLARE
  v_producer_id uuid;
  v_member_id uuid;
  v_outsider_id uuid;
  v_club_id uuid;
BEGIN
  v_producer_id := tests.create_test_user('rls_clubs_producer@test.backrow.tv', 'rls_clubs_producer', 'Producer');
  v_member_id   := tests.create_test_user('rls_clubs_member@test.backrow.tv', 'rls_clubs_member', 'Member');
  v_outsider_id := tests.create_test_user('rls_clubs_outsider@test.backrow.tv', 'rls_clubs_outsider', 'Outsider');

  v_club_id := gen_random_uuid();
  INSERT INTO clubs (id, name, description, privacy, producer_id, settings)
  VALUES (v_club_id, 'RLS Test Club', 'A private test club', 'private', v_producer_id, '{}'::jsonb);

  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_producer_id, 'producer');
  INSERT INTO club_members (club_id, user_id, role) VALUES (v_club_id, v_member_id, 'critic');

  PERFORM set_config('test.producer_id', v_producer_id::text, true);
  PERFORM set_config('test.member_id', v_member_id::text, true);
  PERFORM set_config('test.outsider_id', v_outsider_id::text, true);
  PERFORM set_config('test.club_id', v_club_id::text, true);
END;
$$;

-- Test 1: RLS is enabled on the clubs table
SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'clubs' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on clubs table'
);

-- Test 2: Producer can read their own club
SELECT tests.authenticate_as(current_setting('test.producer_id')::uuid);
SET LOCAL ROLE authenticated;

SELECT extensions.isnt_empty(
  format('SELECT id FROM clubs WHERE id = %L', current_setting('test.club_id')::uuid),
  'Producer can read their own club'
);

RESET ROLE;

-- Test 3: Non-member cannot read a private club
SELECT tests.authenticate_as(current_setting('test.outsider_id')::uuid);
SET LOCAL ROLE authenticated;

SELECT extensions.is_empty(
  format('SELECT id FROM clubs WHERE id = %L', current_setting('test.club_id')::uuid),
  'Non-member cannot read a private club'
);

RESET ROLE;

-- Test 4: Member can read their club
SELECT tests.authenticate_as(current_setting('test.member_id')::uuid);
SET LOCAL ROLE authenticated;

SELECT extensions.isnt_empty(
  format('SELECT id FROM clubs WHERE id = %L', current_setting('test.club_id')::uuid),
  'Member can read their club'
);

RESET ROLE;

-- Cleanup auth state, then finish() MUST be last SELECT before ROLLBACK
DO $$ BEGIN PERFORM tests.clear_authentication(); END; $$;
SELECT * FROM extensions.finish();
ROLLBACK;
