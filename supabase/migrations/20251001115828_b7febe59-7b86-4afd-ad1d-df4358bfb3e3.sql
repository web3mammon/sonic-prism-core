-- Enhance voice_ai_clients table to store complete client configuration
-- This replaces the need for separate client_config.py files

-- Add columns for complete voice AI configuration
ALTER TABLE voice_ai_clients
ADD COLUMN IF NOT EXISTS system_prompt text,
ADD COLUMN IF NOT EXISTS greeting_message text,
ADD COLUMN IF NOT EXISTS call_transfer_number text,
ADD COLUMN IF NOT EXISTS transfer_context text,
ADD COLUMN IF NOT EXISTS audio_snippets jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS conversation_config jsonb DEFAULT '{
  "max_tokens": 150,
  "temperature": 0.7,
  "model": "gpt-4",
  "enable_recording": true,
  "enable_transcription": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS stt_config jsonb DEFAULT '{
  "provider": "deepgram",
  "model": "nova-2",
  "language": "en-US"
}'::jsonb,
ADD COLUMN IF NOT EXISTS tts_config jsonb DEFAULT '{
  "provider": "elevenlabs",
  "model": "eleven_turbo_v2_5",
  "stability": 0.5,
  "similarity_boost": 0.75
}'::jsonb,
ADD COLUMN IF NOT EXISTS business_context jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS active_hours jsonb DEFAULT '{
  "timezone": "Australia/Sydney",
  "hours": {
    "monday": {"open": "09:00", "close": "17:00"},
    "tuesday": {"open": "09:00", "close": "17:00"},
    "wednesday": {"open": "09:00", "close": "17:00"},
    "thursday": {"open": "09:00", "close": "17:00"},
    "friday": {"open": "09:00", "close": "17:00"},
    "saturday": {"open": "10:00", "close": "14:00"},
    "sunday": {"closed": true}
  }
}'::jsonb;

-- Create index for faster client lookups by phone number
CREATE INDEX IF NOT EXISTS idx_voice_ai_clients_phone_number ON voice_ai_clients(phone_number);

-- Create index for faster client lookups by status
CREATE INDEX IF NOT EXISTS idx_voice_ai_clients_status ON voice_ai_clients(status);

COMMENT ON COLUMN voice_ai_clients.system_prompt IS 'Base system prompt for the AI agent';
COMMENT ON COLUMN voice_ai_clients.greeting_message IS 'Initial greeting when call starts';
COMMENT ON COLUMN voice_ai_clients.audio_snippets IS 'Mapping of intent -> audio file paths for pre-recorded responses';
COMMENT ON COLUMN voice_ai_clients.conversation_config IS 'GPT model settings and conversation parameters';
COMMENT ON COLUMN voice_ai_clients.business_context IS 'Business-specific information (services, pricing, location, etc)';
COMMENT ON COLUMN voice_ai_clients.active_hours IS 'Business hours and timezone configuration';