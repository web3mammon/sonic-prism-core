-- Fix get_client_by_url_params after dropping config column (Oct 29, 2025)
-- Replace config with actual separate columns: system_prompt, greeting_message, business_hours, timezone

DROP FUNCTION IF EXISTS public.get_client_by_url_params(text, text, text) CASCADE;

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
  created_at timestamp with time zone,
  region text,
  industry text,
  phone_number text,
  channel_type text,
  voice_id text,
  system_prompt text,
  greeting_message text,
  business_hours jsonb,
  timezone text,
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
    vac.created_at,
    vac.region,
    vac.industry,
    vac.phone_number,
    vac.channel_type,
    vac.voice_id,
    vac.system_prompt,
    vac.greeting_message,
    vac.business_hours,
    vac.timezone,
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
