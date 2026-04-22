-- fetch_invite_club_preview: returns minimal club preview for an invite landing
-- page, gated on presenting a valid unexpired invite token for that slug.
--
-- Needed because the SELECT policy on public.clubs hides private clubs from
-- non-members. Without this RPC, a legitimate invitee hitting
-- /join/<slug>?token=<t> could not load the club row and saw "Club Not Found".
--
-- Security model: caller must know a valid unexpired token bound to that slug.
-- The token is already anon-readable via the "Anyone can read invites by token"
-- policy on club_invites, so this RPC does not leak anything that couldn't
-- already be probed token-first.

CREATE OR REPLACE FUNCTION public.fetch_invite_club_preview(
  p_slug text,
  p_token text
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  privacy text,
  archived boolean,
  picture_url text,
  description text,
  settings jsonb,
  avatar_icon text,
  avatar_color_index integer,
  avatar_border_color_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.slug,
    c.name,
    c.privacy,
    c.archived,
    c.picture_url,
    c.description,
    c.settings,
    c.avatar_icon,
    c.avatar_color_index,
    c.avatar_border_color_index
  FROM public.clubs c
  WHERE c.slug = p_slug
    AND EXISTS (
      SELECT 1
      FROM public.club_invites ci
      WHERE ci.club_id = c.id
        AND ci.token = p_token
        AND ci.expires_at > now()
    );
$$;

REVOKE ALL ON FUNCTION public.fetch_invite_club_preview(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_invite_club_preview(text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.fetch_invite_club_preview(text, text) IS
  'Returns minimal club preview fields for an invite landing page; requires a valid unexpired invite token bound to the given slug.';
