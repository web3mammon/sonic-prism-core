-- Remove all old references to 'port' column that was deleted
-- This fixes the "record NEW has no field port" error

-- 1. Drop all old RPC functions that reference port
DROP FUNCTION IF EXISTS public.get_client_by_url_params(text, text, text) CASCADE;

-- 2. Recreate get_client_by_url_params without port references (clean version)
CREATE OR REPLACE FUNCTION public.get_client_by_url_params(
  p_region text,
  p_industry text,
  p_clientname text
)
RETURNS TABLE(
  client_id text,
  business_name text,
  user_id uuid,
  status text,
  config jsonb,
  created_at timestamp with time zone,
  region text,
  industry text,
  phone_number text,
  channel_type text,
  voice_id text,
  trial_calls integer,
  trial_calls_used integer,
  trial_conversations integer,
  trial_conversations_used integer,
  trial_starts_at timestamp with time zone,
  trial_ends_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    vac.client_id,
    vac.business_name,
    vac.user_id,
    vac.status,
    vac.config,
    vac.created_at,
    vac.region,
    vac.industry,
    vac.phone_number,
    vac.channel_type,
    vac.voice_id,
    vac.trial_calls,
    vac.trial_calls_used,
    vac.trial_conversations,
    vac.trial_conversations_used,
    vac.trial_starts_at,
    vac.trial_ends_at
  FROM public.voice_ai_clients vac
  WHERE vac.client_slug = LOWER(p_region || '_' || p_industry || '_' || p_clientname)
    OR vac.client_slug = p_clientname
  LIMIT 1;
$$;

-- 3. Drop and recreate triggers to ensure they don't reference port
DROP TRIGGER IF EXISTS set_trial_ends_at ON public.voice_ai_clients;
DROP TRIGGER IF EXISTS auto_set_trial_allocations ON public.voice_ai_clients;

-- Recreate trial tracking triggers (clean versions)
CREATE TRIGGER set_trial_ends_at
  BEFORE INSERT OR UPDATE OF trial_starts_at ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_ends_at();

CREATE TRIGGER auto_set_trial_allocations
  BEFORE INSERT ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_allocations();

-- 4. Verify no port column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'voice_ai_clients'
      AND column_name = 'port'
  ) THEN
    RAISE NOTICE 'WARNING: port column still exists in voice_ai_clients table';
  ELSE
    RAISE NOTICE 'SUCCESS: port column has been removed from voice_ai_clients table';
  END IF;
END $$;
