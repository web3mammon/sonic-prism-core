-- Add business_hours and timezone to voice_ai_clients table
-- Business hours will be stored as JSONB with this structure:
-- {
--   "monday": { "open": "09:00", "close": "17:00", "closed": false },
--   "tuesday": { "open": "09:00", "close": "17:00", "closed": false },
--   "wednesday": { "open": "09:00", "close": "17:00", "closed": false },
--   "thursday": { "open": "09:00", "close": "17:00", "closed": false },
--   "friday": { "open": "09:00", "close": "17:00", "closed": false },
--   "saturday": { "open": "10:00", "close": "14:00", "closed": false },
--   "sunday": { "closed": true }
-- }

ALTER TABLE voice_ai_clients
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add comment for documentation
COMMENT ON COLUMN voice_ai_clients.business_hours IS 'Business operating hours by day of week. JSONB format: {"monday": {"open": "09:00", "close": "17:00", "closed": false}, ...}';
COMMENT ON COLUMN voice_ai_clients.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London)';
