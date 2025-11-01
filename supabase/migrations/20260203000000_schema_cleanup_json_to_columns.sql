-- ============================================================================
-- SCHEMA CLEANUP: JSON Junk Drawer Elimination
-- ============================================================================
-- This migration moves settings from JSON fields to proper database columns:
-- - users.social_links -> individual columns for avatar, preferences
-- - clubs.settings -> individual columns for all club configuration
-- ============================================================================

-- ============================================================================
-- PHASE 0: DROP EXISTING GENERATED COLUMNS
-- ============================================================================
-- The clubs table has generated columns that read from settings JSON.
-- We need to drop these before adding regular columns with the same names.

ALTER TABLE clubs DROP COLUMN IF EXISTS themes_enabled;
ALTER TABLE clubs DROP COLUMN IF EXISTS nomination_guessing_enabled;
ALTER TABLE clubs DROP COLUMN IF EXISTS theme_governance;
ALTER TABLE clubs DROP COLUMN IF EXISTS max_nominations_per_user;

-- ============================================================================
-- PHASE 1: USERS TABLE - Add New Columns
-- ============================================================================

-- Avatar settings (moving from social_links JSON)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_icon text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color_index integer;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_border_color_index integer;

-- Privacy/preferences (moving from social_links JSON)
ALTER TABLE users ADD COLUMN IF NOT EXISTS watch_history_private boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS watch_provider_region text DEFAULT 'US';
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_watch_providers boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_providers integer[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_genres text[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_festival_mode text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_profile_popup boolean DEFAULT true;

-- ============================================================================
-- PHASE 2: CLUBS TABLE - Add New Columns
-- ============================================================================

-- Avatar settings (moving from settings JSON)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS avatar_icon text;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS avatar_color_index integer;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS avatar_border_color_index integer;

-- Festival configuration (moving from settings JSON)
-- Note: themes_enabled, nomination_guessing_enabled, theme_governance, max_nominations_per_user
-- were dropped above as they were generated columns
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS festival_type text DEFAULT 'standard';
ALTER TABLE clubs ADD COLUMN themes_enabled boolean DEFAULT true;
ALTER TABLE clubs ADD COLUMN theme_governance text DEFAULT 'democracy';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS theme_voting_enabled boolean DEFAULT true;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS max_themes_per_user integer;
ALTER TABLE clubs ADD COLUMN max_nominations_per_user integer DEFAULT 3;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS blind_nominations_enabled boolean DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS allow_non_admin_nominations boolean DEFAULT true;

-- Rating configuration (moving from settings JSON)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating_min numeric DEFAULT 0;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating_max numeric DEFAULT 10;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating_increment numeric DEFAULT 0.5;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating_unit text DEFAULT 'numbers';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating_visual_icon text;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS club_ratings_enabled boolean DEFAULT true;

-- Scoring/competition (moving from settings JSON)
-- Note: nomination_guessing_enabled was dropped above as it was a generated column
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS scoring_enabled boolean DEFAULT true;
ALTER TABLE clubs ADD COLUMN nomination_guessing_enabled boolean DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS season_standings_enabled boolean DEFAULT true;

-- Automation (moving from settings JSON)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS auto_start_next_festival boolean DEFAULT false;

-- Results reveal (moving from settings JSON)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS results_reveal_type text DEFAULT 'manual';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS results_reveal_direction text DEFAULT 'backward';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS results_reveal_delay_seconds integer DEFAULT 5;

-- Rubrics (moving from settings JSON)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rubric_enforcement text;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating_rubric_name text;

-- Endless festival settings (moving from settings JSON)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS movie_pool_voting_enabled boolean DEFAULT true;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS movie_pool_governance text DEFAULT 'democracy';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS movie_pool_auto_promote_threshold integer DEFAULT 5;

-- Complex timing configs stay as JSONB (legitimately need nested structure)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS nomination_timing jsonb;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS watch_rate_timing jsonb;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS placement_points jsonb;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS recently_watched_retention jsonb;

-- ============================================================================
-- PHASE 3: MIGRATE DATA FROM JSON TO COLUMNS
-- ============================================================================

-- Migrate users.social_links data to new columns
UPDATE users
SET
  avatar_icon = COALESCE(avatar_icon, (social_links->>'avatar_icon')),
  avatar_color_index = COALESCE(avatar_color_index, (social_links->>'avatar_color_index')::integer),
  avatar_border_color_index = COALESCE(avatar_border_color_index, (social_links->>'avatar_border_color_index')::integer),
  watch_history_private = COALESCE(watch_history_private, (social_links->>'watch_history_private')::boolean, false),
  watch_provider_region = COALESCE(watch_provider_region, social_links->>'watch_provider_region', 'US'),
  show_watch_providers = COALESCE(show_watch_providers, (social_links->>'show_watch_providers')::boolean, true),
  default_festival_mode = COALESCE(default_festival_mode, social_links->>'default_festival_mode'),
  show_profile_popup = COALESCE(show_profile_popup, (social_links->>'show_profile_popup')::boolean, true)
WHERE social_links IS NOT NULL;

-- Migrate hidden_providers array (needs special handling)
UPDATE users
SET hidden_providers = (
  SELECT array_agg(x::integer)
  FROM jsonb_array_elements_text(social_links->'hidden_providers') AS x
)
WHERE social_links->'hidden_providers' IS NOT NULL
  AND jsonb_typeof(social_links->'hidden_providers') = 'array'
  AND hidden_providers IS NULL;

-- Migrate favorite_genres array
UPDATE users
SET favorite_genres = (
  SELECT array_agg(x::text)
  FROM jsonb_array_elements_text(social_links->'favorite_genres') AS x
)
WHERE social_links->'favorite_genres' IS NOT NULL
  AND jsonb_typeof(social_links->'favorite_genres') = 'array'
  AND favorite_genres IS NULL;

-- Migrate clubs.settings data to new columns
UPDATE clubs
SET
  -- Avatar
  avatar_icon = COALESCE(avatar_icon, (settings->>'avatar_icon')),
  avatar_color_index = COALESCE(avatar_color_index, (settings->>'avatar_color_index')::integer),
  avatar_border_color_index = COALESCE(avatar_border_color_index, (settings->>'avatar_border_color_index')::integer),
  -- Festival config
  festival_type = COALESCE(festival_type, settings->>'festival_type', 'standard'),
  themes_enabled = COALESCE(themes_enabled, (settings->>'themes_enabled')::boolean, true),
  theme_governance = COALESCE(theme_governance, settings->>'theme_governance', 'democracy'),
  theme_voting_enabled = COALESCE(theme_voting_enabled, (settings->>'theme_voting_enabled')::boolean, true),
  max_themes_per_user = COALESCE(max_themes_per_user, (settings->>'max_themes_per_user')::integer),
  max_nominations_per_user = COALESCE(max_nominations_per_user, (settings->>'max_nominations_per_user')::integer, 3),
  blind_nominations_enabled = COALESCE(blind_nominations_enabled, (settings->>'blind_nominations_enabled')::boolean, false),
  allow_non_admin_nominations = COALESCE(allow_non_admin_nominations, (settings->>'allow_non_admin_nominations')::boolean, true),
  -- Rating config
  rating_min = COALESCE(rating_min, (settings->>'rating_min')::numeric, 0),
  rating_max = COALESCE(rating_max, (settings->>'rating_max')::numeric, 10),
  rating_increment = COALESCE(rating_increment, (settings->>'rating_increment')::numeric, 0.5),
  rating_unit = COALESCE(rating_unit, settings->>'rating_unit', 'numbers'),
  rating_visual_icon = COALESCE(rating_visual_icon, settings->>'rating_visual_icon'),
  club_ratings_enabled = COALESCE(club_ratings_enabled, (settings->>'club_ratings_enabled')::boolean, true),
  -- Scoring
  scoring_enabled = COALESCE(scoring_enabled, (settings->>'scoring_enabled')::boolean, true),
  nomination_guessing_enabled = COALESCE(nomination_guessing_enabled, (settings->>'nomination_guessing_enabled')::boolean, false),
  season_standings_enabled = COALESCE(season_standings_enabled, (settings->>'season_standings_enabled')::boolean, true),
  -- Automation
  auto_start_next_festival = COALESCE(auto_start_next_festival, (settings->>'auto_start_next_festival')::boolean, false),
  -- Results reveal
  results_reveal_type = COALESCE(results_reveal_type, settings->>'results_reveal_type', 'manual'),
  results_reveal_direction = COALESCE(results_reveal_direction, settings->>'results_reveal_direction', 'backward'),
  results_reveal_delay_seconds = COALESCE(results_reveal_delay_seconds, (settings->>'results_reveal_delay_seconds')::integer, 5),
  -- Rubrics
  rubric_enforcement = COALESCE(rubric_enforcement, settings->>'rubric_enforcement'),
  rating_rubric_name = COALESCE(rating_rubric_name, settings->>'rating_rubric_name'),
  -- Endless festival
  movie_pool_voting_enabled = COALESCE(movie_pool_voting_enabled, (settings->>'movie_pool_voting_enabled')::boolean, true),
  movie_pool_governance = COALESCE(movie_pool_governance, settings->>'movie_pool_governance', 'democracy'),
  movie_pool_auto_promote_threshold = COALESCE(movie_pool_auto_promote_threshold, (settings->>'movie_pool_auto_promote_threshold')::integer, 5),
  -- Complex timing configs (JSONB to JSONB)
  nomination_timing = COALESCE(nomination_timing, settings->'nomination_timing'),
  watch_rate_timing = COALESCE(watch_rate_timing, settings->'watch_rate_timing'),
  placement_points = COALESCE(placement_points, settings->'placement_points'),
  recently_watched_retention = COALESCE(recently_watched_retention, settings->'recently_watched_retention')
WHERE settings IS NOT NULL;

-- ============================================================================
-- PHASE 4: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- User avatar columns (for consistent avatar display)
CREATE INDEX IF NOT EXISTS idx_users_avatar_icon ON users(avatar_icon) WHERE avatar_icon IS NOT NULL;

-- Club avatar columns
CREATE INDEX IF NOT EXISTS idx_clubs_avatar_icon ON clubs(avatar_icon) WHERE avatar_icon IS NOT NULL;

-- Festival type for filtering
CREATE INDEX IF NOT EXISTS idx_clubs_festival_type ON clubs(festival_type);

-- Scoring enabled for competition features
CREATE INDEX IF NOT EXISTS idx_clubs_scoring_enabled ON clubs(scoring_enabled);

-- ============================================================================
-- PHASE 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN users.avatar_icon IS 'Custom avatar icon (emoji ID or "letter" or "photo")';
COMMENT ON COLUMN users.avatar_color_index IS 'Index into avatar color palette';
COMMENT ON COLUMN users.avatar_border_color_index IS 'Index into avatar border color palette';
COMMENT ON COLUMN users.watch_history_private IS 'Whether watch history is private';
COMMENT ON COLUMN users.watch_provider_region IS 'Region code for streaming provider display';
COMMENT ON COLUMN users.show_watch_providers IS 'Whether to show streaming providers';
COMMENT ON COLUMN users.hidden_providers IS 'Array of hidden streaming provider IDs';
COMMENT ON COLUMN users.favorite_genres IS 'Array of favorite genre names';
COMMENT ON COLUMN users.default_festival_mode IS 'Default festival mode preference';
COMMENT ON COLUMN users.show_profile_popup IS 'Whether to show profile popup on hover';

COMMENT ON COLUMN clubs.avatar_icon IS 'Custom club avatar icon';
COMMENT ON COLUMN clubs.avatar_color_index IS 'Index into avatar color palette';
COMMENT ON COLUMN clubs.avatar_border_color_index IS 'Index into avatar border color palette';
COMMENT ON COLUMN clubs.festival_type IS 'Type of festival: standard, endless';
COMMENT ON COLUMN clubs.themes_enabled IS 'Whether themed festivals are enabled';
COMMENT ON COLUMN clubs.theme_governance IS 'How themes are chosen: democracy, autocracy, rotation';
COMMENT ON COLUMN clubs.scoring_enabled IS 'Whether competitive scoring is enabled';
COMMENT ON COLUMN clubs.nomination_guessing_enabled IS 'Whether nomination guessing game is enabled';
COMMENT ON COLUMN clubs.club_ratings_enabled IS 'Whether ratings are enabled for the club';

-- Note: social_links column preserved for actual social links (Twitter, Letterboxd, etc.)
-- Note: settings column preserved for complex nested configs that don't fit columns
