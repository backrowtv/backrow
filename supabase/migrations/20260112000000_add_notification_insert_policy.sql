-- Migration: Add INSERT policy for notifications table
-- Fix: Notifications were not being created due to missing INSERT RLS policy

-- Allow authenticated users to create notifications
-- Notifications are created by server actions on behalf of users
-- Example: User A advances a festival → creates notifications for Users B, C, D
-- The inserting user is not the user_id in the notification, so we use WITH CHECK (true)
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
