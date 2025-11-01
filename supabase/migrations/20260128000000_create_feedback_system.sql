-- Feedback System Migration
-- Creates tables for bug reports and feature requests with voting

-- Feedback items table
CREATE TABLE feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
  title TEXT NOT NULL CHECK (length(title) <= 200),
  description TEXT CHECK (description IS NULL OR length(description) <= 1000),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for table documentation
COMMENT ON TABLE feedback_items IS 'User-submitted bug reports and feature requests with voting support';
COMMENT ON COLUMN feedback_items.type IS 'Type of feedback: bug or feature';
COMMENT ON COLUMN feedback_items.status IS 'Current status: open, in_progress, resolved, closed, wont_fix';
COMMENT ON COLUMN feedback_items.admin_response IS 'Optional response from site admin';

-- Feedback votes table
CREATE TABLE feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feedback_id, user_id)
);

COMMENT ON TABLE feedback_votes IS 'Upvotes on feedback items - one vote per user per item';

-- Indexes for performance
CREATE INDEX idx_feedback_items_type ON feedback_items(type);
CREATE INDEX idx_feedback_items_status ON feedback_items(status);
CREATE INDEX idx_feedback_items_created_at ON feedback_items(created_at DESC);
CREATE INDEX idx_feedback_items_user_id ON feedback_items(user_id);
CREATE INDEX idx_feedback_votes_feedback_id ON feedback_votes(feedback_id);
CREATE INDEX idx_feedback_votes_user_id ON feedback_votes(user_id);

-- Enable Row Level Security
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback_items
-- Using subselect pattern for auth.uid() for performance (per project rules)

-- Only authenticated users can view feedback
CREATE POLICY "Authenticated users can view feedback" ON feedback_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create feedback
CREATE POLICY "Authenticated users can create feedback" ON feedback_items
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback" ON feedback_items
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback" ON feedback_items
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Site admins can update any feedback (for status changes and admin responses)
CREATE POLICY "Site admins can update any feedback" ON feedback_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM site_admins WHERE site_admins.user_id = (SELECT auth.uid()))
  );

-- RLS Policies for feedback_votes

-- Authenticated users can view votes
CREATE POLICY "Authenticated users can view votes" ON feedback_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote" ON feedback_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can remove their own votes
CREATE POLICY "Users can remove own votes" ON feedback_votes
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Trigger to update updated_at timestamp
CREATE TRIGGER set_feedback_items_updated_at
  BEFORE UPDATE ON feedback_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
