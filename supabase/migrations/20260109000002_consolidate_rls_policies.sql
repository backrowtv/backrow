-- Consolidate Multiple Permissive RLS Policies
-- This migration fixes the "multiple permissive policies" warning by replacing ALL policies
-- with separate INSERT/UPDATE/DELETE policies, keeping the SELECT policy for broader read access.
-- See: https://supabase.com/docs/guides/database/database-linter#0012_multiple_permissive_policies

-- ============================================
-- background_images table
-- Issue: Has ALL policy + SELECT policy both granting SELECT access
-- Fix: Replace ALL with INSERT, UPDATE, DELETE only
-- ============================================

DROP POLICY IF EXISTS "Users can manage their own entity backgrounds" ON background_images;

-- Create separate policies for INSERT, UPDATE, DELETE (not SELECT since we have a separate SELECT policy)
CREATE POLICY "Users can insert entity backgrounds"
  ON background_images
  FOR INSERT
  WITH CHECK (
    (entity_type = 'site_page') OR 
    ((entity_type = 'club') AND (EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    ))) OR 
    ((entity_type = 'profile') AND ((entity_id)::uuid = (select auth.uid()))) OR 
    ((entity_type = 'festival') AND (EXISTS (
      SELECT 1 FROM festivals f
      JOIN club_members cm ON cm.club_id = f.club_id
      WHERE f.id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    )))
  );

CREATE POLICY "Users can update entity backgrounds"
  ON background_images
  FOR UPDATE
  USING (
    (entity_type = 'site_page') OR 
    ((entity_type = 'club') AND (EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    ))) OR 
    ((entity_type = 'profile') AND ((entity_id)::uuid = (select auth.uid()))) OR 
    ((entity_type = 'festival') AND (EXISTS (
      SELECT 1 FROM festivals f
      JOIN club_members cm ON cm.club_id = f.club_id
      WHERE f.id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    )))
  )
  WITH CHECK (
    (entity_type = 'site_page') OR 
    ((entity_type = 'club') AND (EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    ))) OR 
    ((entity_type = 'profile') AND ((entity_id)::uuid = (select auth.uid()))) OR 
    ((entity_type = 'festival') AND (EXISTS (
      SELECT 1 FROM festivals f
      JOIN club_members cm ON cm.club_id = f.club_id
      WHERE f.id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    )))
  );

CREATE POLICY "Users can delete entity backgrounds"
  ON background_images
  FOR DELETE
  USING (
    (entity_type = 'site_page') OR 
    ((entity_type = 'club') AND (EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    ))) OR 
    ((entity_type = 'profile') AND ((entity_id)::uuid = (select auth.uid()))) OR 
    ((entity_type = 'festival') AND (EXISTS (
      SELECT 1 FROM festivals f
      JOIN club_members cm ON cm.club_id = f.club_id
      WHERE f.id = (background_images.entity_id)::uuid 
      AND cm.user_id = (select auth.uid()) 
      AND cm.role IN ('director', 'producer')
    )))
  );

-- ============================================
-- theme_pool_votes table
-- Issue: Has ALL policy + SELECT policy both granting SELECT access
-- Fix: Replace ALL with INSERT, UPDATE, DELETE only
-- ============================================

DROP POLICY IF EXISTS "Users can manage own theme pool votes" ON theme_pool_votes;

CREATE POLICY "Users can insert own theme pool votes"
  ON theme_pool_votes
  FOR INSERT
  WITH CHECK (
    (user_id = (select auth.uid())) AND 
    (EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = (select auth.uid()) 
      AND theme_pool.id = theme_pool_votes.theme_id
    ))
  );

CREATE POLICY "Users can update own theme pool votes"
  ON theme_pool_votes
  FOR UPDATE
  USING (
    (user_id = (select auth.uid())) AND 
    (EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = (select auth.uid()) 
      AND theme_pool.id = theme_pool_votes.theme_id
    ))
  )
  WITH CHECK (
    (user_id = (select auth.uid())) AND 
    (EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = (select auth.uid()) 
      AND theme_pool.id = theme_pool_votes.theme_id
    ))
  );

CREATE POLICY "Users can delete own theme pool votes"
  ON theme_pool_votes
  FOR DELETE
  USING (
    (user_id = (select auth.uid())) AND 
    (EXISTS (
      SELECT 1 FROM club_members
      JOIN theme_pool ON theme_pool.club_id = club_members.club_id
      WHERE club_members.user_id = (select auth.uid()) 
      AND theme_pool.id = theme_pool_votes.theme_id
    ))
  );

-- ============================================
-- theme_votes table
-- Issue: Has ALL policy + SELECT policy both granting SELECT access
-- Fix: Replace ALL with INSERT, UPDATE, DELETE only
-- ============================================

DROP POLICY IF EXISTS "Users can manage own theme votes" ON theme_votes;

CREATE POLICY "Users can insert own theme votes"
  ON theme_votes
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own theme votes"
  ON theme_votes
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own theme votes"
  ON theme_votes
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- curated_collections table
-- Issue: Has ALL policy + SELECT policy both granting SELECT access
-- Fix: Replace ALL with INSERT, UPDATE, DELETE only (for service role)
-- ============================================

DROP POLICY IF EXISTS "Service role can manage curated collections" ON curated_collections;

CREATE POLICY "Service role can insert curated collections"
  ON curated_collections
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update curated collections"
  ON curated_collections
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete curated collections"
  ON curated_collections
  FOR DELETE
  USING (true);

-- ============================================
-- site_announcements table
-- Issue: Has ALL policy + SELECT policy both granting SELECT access
-- Fix: Replace ALL with INSERT, UPDATE, DELETE only (for site admins)
-- ============================================

DROP POLICY IF EXISTS "Site admins can manage site_announcements" ON site_announcements;

CREATE POLICY "Site admins can insert site_announcements"
  ON site_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Site admins can update site_announcements"
  ON site_announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Site admins can delete site_announcements"
  ON site_announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM site_admins sa
      WHERE sa.user_id = (select auth.uid())
    )
  );

-- Note: clubs table has two UPDATE policies but for different roles (producer and site_admin)
-- This is intentional and not a "multiple permissive" issue since they serve different purposes

-- Add comment documenting this consolidation
COMMENT ON TABLE background_images IS 'Customizable background images for clubs, festivals, profiles, and site pages. RLS policies consolidated to avoid multiple permissive policy overhead.';
COMMENT ON TABLE theme_pool_votes IS 'Votes on theme pool themes. Separate from theme_votes which is for festival theme selection. RLS policies consolidated.';
COMMENT ON TABLE theme_votes IS 'Theme selection votes during festival theme_selection phase. RLS policies consolidated.';
COMMENT ON TABLE curated_collections IS 'Admin-curated movie collections for search and home display. RLS policies consolidated.';
COMMENT ON TABLE site_announcements IS 'Site-wide announcements managed by site admins. RLS policies consolidated.';

