-- Backfill existing auto-created movie discussion threads to use movie-page-style slugs and titles
-- Title format: "Discussion {movie_title} ({year})"
-- Slug format: "{lowercase-title-with-hyphens}-{year}" (matches /movies/{slug})

-- Update both title and slug in one pass for movies with a year
UPDATE discussion_threads dt
SET title = 'Discussion ' || m.title || ' (' || m.year || ')',
    slug = REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(LOWER(m.title)),
          '[^a-z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    ) || '-' || m.year,
    updated_at = NOW()
FROM movies m
WHERE dt.tmdb_id = m.tmdb_id
  AND dt.thread_type = 'movie'
  AND dt.auto_created = true
  AND m.year IS NOT NULL;

-- Update both title and slug for movies without a year
UPDATE discussion_threads dt
SET title = 'Discussion ' || m.title,
    slug = REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(LOWER(m.title)),
          '[^a-z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    ),
    updated_at = NOW()
FROM movies m
WHERE dt.tmdb_id = m.tmdb_id
  AND dt.thread_type = 'movie'
  AND dt.auto_created = true
  AND m.year IS NULL;

-- Handle potential slug conflicts within the same club by appending a suffix
-- This finds duplicates and appends -2, -3, etc.
WITH duplicates AS (
  SELECT id, club_id, slug,
    ROW_NUMBER() OVER (PARTITION BY club_id, slug ORDER BY created_at) AS rn
  FROM discussion_threads
  WHERE slug IS NOT NULL
)
UPDATE discussion_threads dt
SET slug = d.slug || '-' || d.rn
FROM duplicates d
WHERE dt.id = d.id
  AND d.rn > 1;
