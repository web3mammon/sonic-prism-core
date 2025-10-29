-- Lead Capture System
-- Captures customer contact information during calls/chats

-- Drop existing table if it exists (for clean re-run after errors)
DROP TABLE IF EXISTS leads CASCADE;

CREATE TABLE leads (
  lead_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL REFERENCES voice_ai_clients(client_id) ON DELETE CASCADE,

  -- Lead information
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT, -- Additional context from conversation

  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('phone', 'website')),
  session_id TEXT, -- call_sid or chat_session_id

  -- Status management
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),

  -- Timestamps
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_captured_at ON leads(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Optional: Index for finding potential duplicates (if we want to check later)
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone) WHERE phone IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE leads IS 'Customer lead information captured during phone calls and website chats';
COMMENT ON COLUMN leads.name IS 'Customer name (optional - might be incomplete)';
COMMENT ON COLUMN leads.email IS 'Customer email (required for website-only clients)';
COMMENT ON COLUMN leads.phone IS 'Customer phone number (required for phone-only clients)';
COMMENT ON COLUMN leads.notes IS 'Additional context about customer needs or interests from the conversation';
COMMENT ON COLUMN leads.source IS 'Lead capture source: phone or website';
COMMENT ON COLUMN leads.session_id IS 'Links to call_sessions.call_sid or chat_sessions.session_id';
COMMENT ON COLUMN leads.status IS 'Lead status: new, contacted, converted, or lost';

-- RLS Policies (Row Level Security)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Users can only see leads for their own clients
CREATE POLICY "Users can view their own leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_ai_clients
      WHERE voice_ai_clients.client_id = leads.client_id
      AND voice_ai_clients.user_id = auth.uid()
    )
  );

-- System can insert leads (edge functions run as service role)
CREATE POLICY "System can insert leads"
  ON leads FOR INSERT
  WITH CHECK (true);

-- Users can update their own leads
CREATE POLICY "Users can update their own leads"
  ON leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM voice_ai_clients
      WHERE voice_ai_clients.client_id = leads.client_id
      AND voice_ai_clients.user_id = auth.uid()
    )
  );

-- Users can delete their own leads
CREATE POLICY "Users can delete their own leads"
  ON leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM voice_ai_clients
      WHERE voice_ai_clients.client_id = leads.client_id
      AND voice_ai_clients.user_id = auth.uid()
    )
  );
