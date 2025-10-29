-- Fix credits and add trial tracking

-- 1. Add trial tracking columns
ALTER TABLE public.voice_ai_clients
ADD COLUMN IF NOT EXISTS trial_starts_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone GENERATED ALWAYS AS (trial_starts_at + interval '3 days') STORED;

-- 2. Update existing clients with 0 credits to have 10 free trial credits
UPDATE public.voice_ai_clients
SET credits = 10
WHERE credits = 0 OR credits IS NULL;

-- 3. Change default for credits column to 10 (for future clients)
ALTER TABLE public.voice_ai_clients
ALTER COLUMN credits SET DEFAULT 10;

-- 4. Update trial_starts_at for existing clients (use created_at if null)
UPDATE public.voice_ai_clients
SET trial_starts_at = created_at
WHERE trial_starts_at IS NULL;

-- Verify changes
SELECT 
  client_id,
  business_name,
  credits,
  trial_starts_at,
  trial_ends_at,
  created_at
FROM public.voice_ai_clients
ORDER BY created_at DESC;
