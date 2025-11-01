-- Migration: Add direct_messages table for DM system
-- Allows club members to send direct messages to each other
-- Only members of the same club can message each other

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Ensure message is not empty
  CONSTRAINT message_not_empty CHECK (LENGTH(TRIM(message)) > 0)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_club ON public.direct_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(sender_id, recipient_id, club_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for direct_messages

-- SELECT: Users can read messages where they are sender or recipient
-- AND they are members of the club
CREATE POLICY "Users can read own messages" ON public.direct_messages
  FOR SELECT
  USING (
    (sender_id = auth.uid() OR recipient_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = direct_messages.club_id
      AND user_id = auth.uid()
    )
  );

-- INSERT: Users can send messages if:
-- 1. They are the sender
-- 2. They are members of the club
-- 3. Recipient is also a member of the club
CREATE POLICY "Users can send messages to club members" ON public.direct_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = direct_messages.club_id
      AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = direct_messages.club_id
      AND user_id = direct_messages.recipient_id
    )
  );

-- UPDATE: Users can mark messages as read if they are the recipient
CREATE POLICY "Users can mark own messages as read" ON public.direct_messages
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- DELETE: Users can delete their own sent messages
CREATE POLICY "Users can delete own sent messages" ON public.direct_messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- Add comment
COMMENT ON TABLE public.direct_messages IS 'Direct messages between club members. Messages are scoped to a specific club, ensuring privacy.';

