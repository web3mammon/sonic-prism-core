-- Add minute tracking fields to get_client_by_url_params RPC function
-- November 1, 2025
-- Adds: trial_minutes, trial_minutes_used, paid_plan_type, paid_minutes_included, paid_minutes_used, billing_cycle_start, billing_cycle_end

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
  website_url text,
  business_address text,
  services_offered jsonb,
  pricing_info text,
  target_audience text,
  tone text,
  call_transfer_enabled boolean,
  call_transfer_number text,
  -- OLD: Event-based trial tracking (kept for backwards compatibility)
  trial_calls integer,
  trial_calls_used integer,
  trial_conversations integer,
  trial_conversations_used integer,
  trial_starts_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  -- NEW: Minute-based pricing (November 1, 2025)
  trial_minutes integer,
  trial_minutes_used integer,
  paid_plan_type text,
  paid_minutes_included integer,
  paid_minutes_used integer,
  billing_cycle_start timestamp with time zone,
  billing_cycle_end timestamp with time zone
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
    vac.website_url,
    vac.business_address,
    vac.services_offered,
    vac.pricing_info,
    vac.target_audience,
    vac.tone,
    vac.call_transfer_enabled,
    vac.call_transfer_number,
    vac.trial_calls,
    vac.trial_calls_used,
    vac.trial_conversations,
    vac.trial_conversations_used,
    vac.trial_starts_at,
    vac.trial_ends_at,
    vac.trial_minutes,
    vac.trial_minutes_used,
    vac.paid_plan_type,
    vac.paid_minutes_included,
    vac.paid_minutes_used,
    vac.billing_cycle_start,
    vac.billing_cycle_end
  FROM public.voice_ai_clients vac
  WHERE vac.client_slug = LOWER(p_region || '_' || p_industry || '_' || p_clientname)
    OR vac.client_slug = p_clientname
  LIMIT 1;
$$;
