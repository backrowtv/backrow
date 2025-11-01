-- Add club_invites table for token-based private club invitations
-- Tokens expire after 7 days and are reusable

-- Create the table
CREATE TABLE club_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES users(id)
);

-- Index for token lookups (fast validation)
CREATE INDEX idx_club_invites_token ON club_invites(token);

-- Index for listing a club's invites
CREATE INDEX idx_club_invites_club_id ON club_invites(club_id);

-- Enable RLS
ALTER TABLE club_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read invites by token (needed for validation on join page)
CREATE POLICY "Anyone can read invites by token" ON club_invites
  FOR SELECT TO public
  USING (true);

-- Admins (producer/director) or critics with invite permission can create invites
CREATE POLICY "Authorized members can create invites" ON club_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_invites.club_id
        AND club_members.user_id = (SELECT auth.uid())
        AND club_members.role IN ('producer', 'director')
    )
    OR EXISTS (
      SELECT 1 FROM club_members cm
      JOIN clubs c ON c.id = cm.club_id
      WHERE cm.club_id = club_invites.club_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'critic'
        AND (c.settings->>'allow_critics_to_invite')::boolean = true
    )
  );

-- Allow updates (for marking tokens as used)
CREATE POLICY "Allow invite updates" ON club_invites
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);
