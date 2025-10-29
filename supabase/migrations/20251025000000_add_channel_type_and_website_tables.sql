-- ============================================
-- Migration: Add channel_type to voice_ai_clients + Website Chat Tables
-- Purpose: Support Phone, Website Widget, or Both
-- Date: 2025-10-25
-- ============================================

-- Step 1: Create enum type for channel selection
CREATE TYPE channel_type AS ENUM ('phone', 'website', 'both');

-- Step 2: Add channel_type column to voice_ai_clients
ALTER TABLE voice_ai_clients
ADD COLUMN channel_type channel_type NOT NULL DEFAULT 'phone';

-- Step 3: Add index for faster queries
CREATE INDEX idx_voice_ai_clients_channel_type
ON voice_ai_clients(channel_type);

-- Step 4: Update existing records (all current clients are phone-only)
UPDATE voice_ai_clients
SET channel_type = 'phone';

-- Step 5: Add comment
COMMENT ON COLUMN voice_ai_clients.channel_type IS
'Determines client channel: phone (voice calls), website (voice widget), or both';

-- ============================================
-- Table: chat_sessions
-- Purpose: Store website voice widget conversation data
-- ============================================

CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  chat_id text UNIQUE NOT NULL,
  client_id text NOT NULL REFERENCES voice_ai_clients(client_id),

  -- Visitor Info
  visitor_id text,
  visitor_name text,
  visitor_email text,
  visitor_metadata jsonb DEFAULT '{}'::jsonb,

  -- Session Details
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'active',

  -- Conversation Data
  transcript jsonb,
  transcript_summary text,
  message_count integer DEFAULT 0,

  -- Classification
  intent text,
  outcome_type text,                    -- 'booked' | 'info_provided' | 'transferred' | 'abandoned'
  sentiment_score numeric(3,2),         -- -1.0 to 1.0

  -- Billing
  cost_amount numeric(10,2),

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_sessions_client_id ON chat_sessions(client_id);
CREATE INDEX idx_chat_sessions_start_time ON chat_sessions(start_time DESC);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all chat sessions"
  ON chat_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_ai_clients
      WHERE voice_ai_clients.client_id = chat_sessions.client_id
      AND voice_ai_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update chat sessions"
  ON chat_sessions FOR UPDATE
  USING (true);

-- Comments
COMMENT ON TABLE chat_sessions IS 'Stores website voice widget conversation sessions';

-- ============================================
-- Table: widget_config
-- Purpose: Store widget customization settings
-- ============================================

CREATE TABLE widget_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE NOT NULL REFERENCES voice_ai_clients(client_id),

  -- Appearance
  primary_color text DEFAULT '#ef4444',
  secondary_color text DEFAULT '#1a1a1a',
  text_color text DEFAULT '#ffffff',
  position text DEFAULT 'bottom-right',   -- 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  widget_size text DEFAULT 'medium',      -- 'small' | 'medium' | 'large'
  border_radius integer DEFAULT 16,       -- pixels
  logo_url text,

  -- Behavior
  greeting_message text DEFAULT 'Hi! How can I help you today?',
  placeholder_text text DEFAULT 'Type your message...',
  auto_open boolean DEFAULT false,
  auto_open_delay integer DEFAULT 5000,   -- milliseconds
  show_branding boolean DEFAULT true,
  enable_sound boolean DEFAULT true,

  -- AI Configuration
  system_prompt text,
  response_tone text DEFAULT 'friendly',  -- 'friendly' | 'professional' | 'casual'
  max_response_length integer DEFAULT 500,

  -- Advanced
  allowed_domains text[],                 -- Whitelist of domains
  rate_limit integer DEFAULT 100,         -- messages per hour

  -- Generated Assets
  embed_code text,                        -- JavaScript embed snippet
  widget_url text,                        -- CDN URL for widget.js

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE widget_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all widget configs"
  ON widget_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can manage their widget config"
  ON widget_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM voice_ai_clients
      WHERE voice_ai_clients.client_id = widget_config.client_id
      AND voice_ai_clients.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE widget_config IS 'Website voice widget customization settings';
