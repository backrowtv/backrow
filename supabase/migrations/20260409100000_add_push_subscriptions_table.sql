-- Stores Web Push subscriptions for browser/device push delivery.
-- One user can have many subscriptions (one per browser/device).
CREATE TABLE public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint      text NOT NULL UNIQUE,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users can read their own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- No UPDATE policy — subscriptions are immutable; replace via delete + insert
