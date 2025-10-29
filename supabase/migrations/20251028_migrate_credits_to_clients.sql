-- Migrate credits architecture to per-client (instead of per-user)
-- This allows each business to have separate billing/credits

-- Step 1: Add credits column to voice_ai_clients
ALTER TABLE voice_ai_clients
ADD COLUMN IF NOT EXISTS credits NUMERIC(10, 2) DEFAULT 0.00;

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_ai_clients_credits ON voice_ai_clients(credits);
CREATE INDEX IF NOT EXISTS idx_voice_ai_clients_user_id ON voice_ai_clients(user_id);

-- Step 3: Add comments
COMMENT ON COLUMN voice_ai_clients.credits IS 'Per-client credit balance. Credits are isolated per business/client, not shared across user''s multiple businesses.';

-- Note: New clients created via onboarding will get 10 free credits automatically
-- Existing clients will have credits = 0 and need to be topped up manually
