-- Rename "credits" to "free_calls_remaining" for clarity
-- This represents the NUMBER of free calls/conversations during trial (not dollar value)

ALTER TABLE public.voice_ai_clients
RENAME COLUMN credits TO free_calls_remaining;

-- Update the default to 10 free calls
ALTER TABLE public.voice_ai_clients
ALTER COLUMN free_calls_remaining SET DEFAULT 10;

-- Update any that are still 0 to 10
UPDATE public.voice_ai_clients
SET free_calls_remaining = 10
WHERE free_calls_remaining = 0 OR free_calls_remaining IS NULL;

-- Verify
SELECT 
  client_id,
  business_name,
  free_calls_remaining,
  channel_type,
  trial_starts_at,
  trial_ends_at
FROM public.voice_ai_clients
ORDER BY created_at DESC;
