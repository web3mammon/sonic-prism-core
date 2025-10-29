-- Clean trial tracking with separate call and conversation counters
-- Much simpler: just INCREMENT the "used" counters, never decrement

-- 1. Drop the old credits column if it exists
ALTER TABLE public.voice_ai_clients
DROP COLUMN IF EXISTS credits CASCADE;

-- 2. Add new trial tracking columns
ALTER TABLE public.voice_ai_clients
ADD COLUMN IF NOT EXISTS trial_calls integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS trial_calls_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_conversations integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS trial_conversations_used integer DEFAULT 0;

-- 3. Ensure trial date columns exist
ALTER TABLE public.voice_ai_clients
ADD COLUMN IF NOT EXISTS trial_starts_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;

-- 4. Create/update function to auto-calculate trial_ends_at
CREATE OR REPLACE FUNCTION update_trial_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_starts_at IS NOT NULL THEN
    NEW.trial_ends_at := NEW.trial_starts_at + interval '3 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create/replace trigger
DROP TRIGGER IF EXISTS set_trial_ends_at ON public.voice_ai_clients;
CREATE TRIGGER set_trial_ends_at
  BEFORE INSERT OR UPDATE OF trial_starts_at ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_ends_at();

-- 6. Update trial_starts_at for existing clients
UPDATE public.voice_ai_clients
SET trial_starts_at = created_at
WHERE trial_starts_at IS NULL;

-- 7. Verify the changes
SELECT 
  client_id,
  business_name,
  channel_type,
  trial_calls,
  trial_calls_used,
  CASE WHEN trial_calls > 0 THEN trial_calls - trial_calls_used ELSE 0 END as calls_remaining,
  trial_conversations,
  trial_conversations_used,
  CASE WHEN trial_conversations > 0 THEN trial_conversations - trial_conversations_used ELSE 0 END as conversations_remaining,
  trial_starts_at,
  trial_ends_at,
  CASE 
    WHEN trial_ends_at > now() AND (trial_calls_used < trial_calls OR trial_conversations_used < trial_conversations) THEN 'Active Trial'
    WHEN trial_ends_at <= now() THEN 'Trial Expired (Time)'
    WHEN trial_calls_used >= trial_calls AND trial_conversations_used >= trial_conversations THEN 'Trial Expired (Usage)'
    ELSE 'Unknown'
  END as trial_status
FROM public.voice_ai_clients
ORDER BY created_at DESC;
