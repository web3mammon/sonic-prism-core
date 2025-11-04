-- Add DodoPayments integration columns to voice_ai_clients table
-- NOTE: plan_id already exists, no need to add subscription_plan_id

ALTER TABLE voice_ai_clients
ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_dodo_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_ai_clients_dodo_customer_id ON voice_ai_clients(dodo_customer_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_clients_subscription_dodo_id ON voice_ai_clients(subscription_dodo_id);

-- Add comment for documentation
COMMENT ON COLUMN voice_ai_clients.dodo_customer_id IS 'DodoPayments customer ID for usage tracking and meter ingestion';
COMMENT ON COLUMN voice_ai_clients.subscription_status IS 'Subscription status: inactive, active, canceled, past_due';
COMMENT ON COLUMN voice_ai_clients.subscription_dodo_id IS 'DodoPayments subscription ID from subscription.created webhook';
