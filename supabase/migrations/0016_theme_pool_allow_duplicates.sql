-- Allow duplicate theme names within a club's theme_pool.
--
-- The original UNIQUE(club_id, theme_name) treated identical theme suggestions
-- from multiple members as a conflict. In practice, duplicates are signal —
-- two members independently submitting the same theme is a vote of confidence.
-- The product (addTheme / updateTheme actions) now lets duplicates through.

ALTER TABLE public.theme_pool
  DROP CONSTRAINT IF EXISTS theme_pool_club_id_theme_name_key;
