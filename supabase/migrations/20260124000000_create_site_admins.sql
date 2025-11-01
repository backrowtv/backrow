-- Create site_admins table for role-based admin access
-- This replaces the hardcoded admin email check

CREATE TABLE IF NOT EXISTS site_admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  notes text,
  CONSTRAINT site_admins_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE site_admins ENABLE ROW LEVEL SECURITY;

-- Only site admins can view the site_admins table
CREATE POLICY "Site admins can view all site admins"
ON site_admins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM site_admins sa WHERE sa.user_id = auth.uid()
  )
);

-- Only site admins can insert new admins
CREATE POLICY "Site admins can add new admins"
ON site_admins FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM site_admins sa WHERE sa.user_id = auth.uid()
  )
);

-- Only site admins can delete admins (but not themselves)
CREATE POLICY "Site admins can remove other admins"
ON site_admins FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM site_admins sa WHERE sa.user_id = auth.uid()
  )
  AND user_id != auth.uid()  -- Cannot remove yourself
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_site_admins_user_id ON site_admins(user_id);

-- Create helper function to check if a user is a site admin
CREATE OR REPLACE FUNCTION is_site_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM site_admins WHERE user_id = check_user_id
  );
$$;

-- Insert the initial admin (stephen@backrow.tv)
-- This ensures the original admin retains access
INSERT INTO site_admins (user_id, notes)
SELECT id, 'Original site admin - seeded on table creation'
FROM users
WHERE email = 'stephen@backrow.tv'
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE site_admins IS 'Users with site-wide administrative privileges';
COMMENT ON COLUMN site_admins.granted_by IS 'User who granted admin access (NULL for initial admin)';
