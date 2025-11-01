-- Migration: Create notifications table with all required columns, indexes, and RLS policies
-- Supports notification system for NotificationBell component

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'festival_started', 'festival_ended', 'nomination_received', 'rating_received', 'member_joined', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to navigate to when clicked
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional: Reference to related entity
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  festival_id UUID REFERENCES public.festivals(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE
);

-- Add optional foreign key columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'club_id') THEN
    ALTER TABLE public.notifications ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'festival_id') THEN
    ALTER TABLE public.notifications ADD COLUMN festival_id UUID REFERENCES public.festivals(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_user_id') THEN
    ALTER TABLE public.notifications ADD COLUMN related_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications

-- SELECT: Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE: Users can update their own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

