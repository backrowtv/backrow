-- Add club-specific avatar and bio fields to club_members table
-- This allows users to have different avatars and bios per club

ALTER TABLE public.club_members 
ADD COLUMN IF NOT EXISTS club_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS club_bio TEXT;

-- Add comments
COMMENT ON COLUMN public.club_members.club_avatar_url IS 'URL to club-specific avatar image (stored in Supabase Storage). If null, uses global avatar_url from users table.';
COMMENT ON COLUMN public.club_members.club_bio IS 'Club-specific bio text. If null, uses global bio from users table.';

