-- Add missing UPDATE policy for seasons table
-- Without this, concludeSeason() silently fails to update end_date due to RLS
CREATE POLICY "Producers and directors can update seasons"
ON seasons FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM club_members cm
  WHERE cm.user_id = (SELECT auth.uid())
    AND cm.club_id = seasons.club_id
    AND cm.role = ANY (ARRAY['producer', 'director'])
));
