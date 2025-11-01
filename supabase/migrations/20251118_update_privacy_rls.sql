-- Update Profiles (Users) Viewing Policy
-- Users can only view profiles if it's their own OR they share a mutual club
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles of mutual club members" ON public.users;

CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of mutual club members" 
ON public.users FOR SELECT 
USING (public.have_mutual_clubs(auth.uid(), id));

-- Update Messages Policy
-- Users can only insert messages if they share a club with the recipient (implied by club_id or direct relationship)
-- NOTE: The current chat_messages table structure is simple (club_id, user_id, message). 
-- If direct messages are implemented, they might need a different table or structure.
-- Assuming 'chat_messages' is for CLUB CHAT, the policy should enforce club membership.

DROP POLICY IF EXISTS "Club members can insert chat messages" ON public.chat_messages;

CREATE POLICY "Club members can insert chat messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE club_id = chat_messages.club_id 
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Club members can view chat messages" ON public.chat_messages;

CREATE POLICY "Club members can view chat messages" 
ON public.chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE club_id = chat_messages.club_id 
    AND user_id = auth.uid()
  )
);

-- Note: If there's a separate Direct Messages table, it needs similar "mutual club" policies.
-- Based on the schema provided, there isn't an explicit 'direct_messages' table yet. 
-- If one is needed, it should be created. For now, we are securing the existing tables.

