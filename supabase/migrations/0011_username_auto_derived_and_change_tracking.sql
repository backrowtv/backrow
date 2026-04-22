-- Track whether a user's username was auto-generated (OAuth path) or
-- explicitly picked (signup form / wizard). OAuth users are forced through
-- a /welcome/username interstitial until they pick one.
--
-- Also track when a user last changed their username, so we can enforce a
-- 30-day cooldown on subsequent changes (mirrors display-name cooldown but
-- tighter because profile URLs use the UUID id, not the username).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username_auto_derived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS username_last_changed_at TIMESTAMPTZ;

-- Backfill: flag existing users whose ONLY identity is non-email (pure OAuth).
-- These users never saw a username field and are walking around with an
-- email-derived handle; the middleware will route them through the picker.
UPDATE public.users u
SET username_auto_derived = true
WHERE EXISTS (
  SELECT 1 FROM auth.identities i
  WHERE i.user_id = u.id AND i.provider <> 'email'
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i
  WHERE i.user_id = u.id AND i.provider = 'email'
);
