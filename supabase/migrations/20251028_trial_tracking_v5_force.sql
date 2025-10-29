-- FORCE update trial allocations based on channel_type
-- This will overwrite any existing values

-- 1. Drop the old credits column if it exists
ALTER TABLE public.voice_ai_clients
DROP COLUMN IF EXISTS credits CASCADE;

-- 2. Add new trial tracking columns if they don't exist
ALTER TABLE public.voice_ai_clients
ADD COLUMN IF NOT EXISTS trial_calls integer,
ADD COLUMN IF NOT EXISTS trial_calls_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_conversations integer,
ADD COLUMN IF NOT EXISTS trial_conversations_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_starts_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;

-- 3. FORCE set trial allocations for ALL clients based on their channel_type
-- This will overwrite any existing values
UPDATE public.voice_ai_clients
SET 
  trial_calls = CASE 
    WHEN channel_type = 'phone' THEN 10
    WHEN channel_type = 'website' THEN 0
    WHEN channel_type = 'both' THEN 10
    ELSE 10  -- default to phone
  END,
  trial_conversations = CASE 
    WHEN channel_type = 'phone' THEN 0
    WHEN channel_type = 'website' THEN 10
    WHEN channel_type = 'both' THEN 10
    ELSE 0
  END,
  trial_calls_used = 0,  -- Reset usage counter
  trial_conversations_used = 0;  -- Reset usage counter

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

-- 5. Create/replace trigger for trial_ends_at
DROP TRIGGER IF EXISTS set_trial_ends_at ON public.voice_ai_clients;
CREATE TRIGGER set_trial_ends_at
  BEFORE INSERT OR UPDATE OF trial_starts_at ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_ends_at();

-- 6. Create trigger to set trial allocations on INSERT based on channel_type
CREATE OR REPLACE FUNCTION set_trial_allocations()
RETURNS TRIGGER AS $$
BEGIN
  -- Set trial_calls based on channel_type
  IF NEW.trial_calls IS NULL THEN
    NEW.trial_calls := CASE 
      WHEN NEW.channel_type = 'phone' THEN 10
      WHEN NEW.channel_type = 'website' THEN 0
      WHEN NEW.channel_type = 'both' THEN 10
      ELSE 10
    END;
  END IF;
  
  -- Set trial_conversations based on channel_type
  IF NEW.trial_conversations IS NULL THEN
    NEW.trial_conversations := CASE 
      WHEN NEW.channel_type = 'phone' THEN 0
      WHEN NEW.channel_type = 'website' THEN 10
      WHEN NEW.channel_type = 'both' THEN 10
      ELSE 0
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_trial_allocations ON public.voice_ai_clients;
CREATE TRIGGER auto_set_trial_allocations
  BEFORE INSERT ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_allocations();

-- 7. Update trial_starts_at for existing clients (use created_at)
UPDATE public.voice_ai_clients
SET trial_starts_at = created_at
WHERE trial_starts_at IS NULL;

-- 8. VERIFICATION QUERY
SELECT 
  client_id,
  business_name,
  channel_type,
  trial_calls,
  trial_calls_used,
  CASE WHEN trial_calls > 0 THEN trial_calls - trial_calls_used ELSE 0 END as calls_remaining,
  trial_conversations,
  trial_conversations_used,
  CASE WHEN trial_conversations > 0 THEN trial_conversations - trial_conversations_used ELSE 0 END as convos_remaining,
  trial_starts_at,
  trial_ends_at
FROM public.voice_ai_clients
ORDER BY created_at DESC;
