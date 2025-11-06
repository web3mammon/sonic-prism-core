-- Create contact_messages table for storing support requests

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,

  -- Client Information
  client_id text,
  client_slug text,
  business_name text,

  -- Message Details
  reason text NOT NULL CHECK (reason IN ('general_query', 'dashboard_issues', 'phone_provisioning', 'other')),
  message text NOT NULL,

  -- Status Tracking
  status text DEFAULT 'unread' CHECK (status IN ('unread', 'in_progress', 'resolved')),
  admin_notes text,
  resolved_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX idx_contact_messages_client_id ON contact_messages(client_id);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- RLS Policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own contact messages"
  ON contact_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create contact messages
CREATE POLICY "Users can create contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER set_contact_messages_updated_at
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_messages_updated_at();
