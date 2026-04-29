-- Collapse discussion thread `actor`, `director`, and `composer` tag types into
-- a single `person` type. The original three were UI-only — server logic and
-- TMDB person search hit the same endpoint with different `known_for_department`
-- filters. One `person` tag with no department filter lets users tag anyone in
-- TMDB (writers, cinematographers, etc.) without three near-identical chips in
-- the picker.
--
-- Steps:
-- 1. Drop the two check constraints that reference the old values.
-- 2. Backfill: rewrite existing rows from actor/director/composer → person.
-- 3. Re-add both constraints with the new allowed-value set.

ALTER TABLE public.discussion_thread_tags
  DROP CONSTRAINT discussion_thread_tags_tag_type_check;

ALTER TABLE public.discussion_thread_tags
  DROP CONSTRAINT valid_tag_reference;

UPDATE public.discussion_thread_tags
SET tag_type = 'person'
WHERE tag_type IN ('actor', 'director', 'composer');

ALTER TABLE public.discussion_thread_tags
  ADD CONSTRAINT discussion_thread_tags_tag_type_check
    CHECK (tag_type = ANY (ARRAY['movie'::text, 'person'::text, 'festival'::text]));

ALTER TABLE public.discussion_thread_tags
  ADD CONSTRAINT valid_tag_reference
    CHECK (
      (tag_type = 'movie'::text
        AND tmdb_id IS NOT NULL
        AND person_tmdb_id IS NULL
        AND festival_id IS NULL)
      OR
      (tag_type = 'person'::text
        AND person_tmdb_id IS NOT NULL
        AND tmdb_id IS NULL
        AND festival_id IS NULL)
      OR
      (tag_type = 'festival'::text
        AND festival_id IS NOT NULL
        AND tmdb_id IS NULL
        AND person_tmdb_id IS NULL)
    );
