-- Fix get_client_by_url_params after database cleanup
-- Removed columns: port, api_proxy_path, intro_audio_file, active_hours, credit_balance
DROP FUNCTION IF EXISTS public.get_client_by_url_params(text, text, text);

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
  voice_id text
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
    vac.voice_id
  FROM public.voice_ai_clients vac
  WHERE vac.client_slug = LOWER(p_region || '_' || p_industry || '_' || p_clientname)
    OR vac.client_slug = p_clientname
  LIMIT 1;
$$;
