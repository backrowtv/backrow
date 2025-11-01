-- Add column to track when a user last changed their display name (6-month cooldown)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_display_name_change timestamptz;
