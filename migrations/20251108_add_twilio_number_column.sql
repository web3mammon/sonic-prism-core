-- Migration: Add twilio_number column to separate Twilio provisioned number from user's personal number
-- Date: November 8, 2025
-- Purpose:
--   - twilio_number: Twilio provisioned number for routing inbound calls
--   - phone_number: User's personal number for agent transfers

-- Add new column for Twilio provisioned number
ALTER TABLE voice_ai_clients
ADD COLUMN twilio_number TEXT;

-- Add comments for clarity
COMMENT ON COLUMN voice_ai_clients.twilio_number IS 'Twilio provisioned phone number for inbound call routing (e.g., +15551234567)';
COMMENT ON COLUMN voice_ai_clients.phone_number IS 'User''s personal phone number for agent transfers (entered during onboarding)';

-- Create index for fast lookup by Twilio number (used by twilio-webhook)
CREATE INDEX idx_voice_ai_clients_twilio_number ON voice_ai_clients(twilio_number);

-- Note: call_transfer_number column is now deprecated - use phone_number instead
