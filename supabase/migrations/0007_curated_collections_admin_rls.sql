-- Add missing admin RLS policies on curated_collections.
-- The table had only a public SELECT (is_active = true) policy; admin
-- writes via the cookie-based anon client were silently denied by RLS.
-- Pattern mirrors site_announcements.

DROP POLICY IF EXISTS "Anyone can read active curated collections" ON public.curated_collections;

CREATE POLICY "Anyone can read active curated collections"
ON public.curated_collections FOR SELECT
USING (
  is_active = true
  OR EXISTS (SELECT 1 FROM site_admins sa WHERE sa.user_id = (SELECT auth.uid()))
);

CREATE POLICY "Site admins can insert curated_collections"
ON public.curated_collections FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM site_admins sa WHERE sa.user_id = (SELECT auth.uid())));

CREATE POLICY "Site admins can update curated_collections"
ON public.curated_collections FOR UPDATE
USING (EXISTS (SELECT 1 FROM site_admins sa WHERE sa.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM site_admins sa WHERE sa.user_id = (SELECT auth.uid())));

CREATE POLICY "Site admins can delete curated_collections"
ON public.curated_collections FOR DELETE
USING (EXISTS (SELECT 1 FROM site_admins sa WHERE sa.user_id = (SELECT auth.uid())));
