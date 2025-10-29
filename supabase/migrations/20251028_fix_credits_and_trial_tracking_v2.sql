-- Fix credits and add trial tracking (v2 - using trigger instead of generated column)

-- 1. Add trial tracking columns
ALTER TABLE public.voice_ai_clients
ADD COLUMN IF NOT EXISTS trial_starts_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;

-- 2. Create function to auto-calculate trial_ends_at
CREATE OR REPLACE FUNCTION update_trial_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_starts_at IS NOT NULL THEN
    NEW.trial_ends_at := NEW.trial_starts_at + interval '3 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-update trial_ends_at
DROP TRIGGER IF EXISTS set_trial_ends_at ON public.voice_ai_clients;
CREATE TRIGGER set_trial_ends_at
  BEFORE INSERT OR UPDATE OF trial_starts_at ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_ends_at();

-- 4. Update existing clients with 0 credits to have 10 free trial credits
UPDATE public.voice_ai_clients
SET credits = 10
WHERE credits = 0 OR credits IS NULL;

-- 5. Change default for credits column to 10 (for future clients)
ALTER TABLE public.voice_ai_clients
ALTER COLUMN credits SET DEFAULT 10;

-- 6. Update trial_starts_at for existing clients (use created_at)
-- This will trigger the function to set trial_ends_at automatically
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
  CASE 
    WHEN trial_ends_at > now() THEN 'Active Trial'
    WHEN trial_ends_at <= now() THEN 'Trial Expired'
    ELSE 'No Trial Data'
  END as trial_status,
  created_at
FROM public.voice_ai_clients
ORDER BY created_at DESC;
