-- Update voice_ai_clients table to support URL-based client identification
-- Add a unique client_slug field that maps to URL structure
ALTER TABLE public.voice_ai_clients 
ADD COLUMN client_slug text;

-- Create index for faster lookups
CREATE INDEX idx_voice_ai_clients_slug ON public.voice_ai_clients(client_slug);

-- Update existing records to have proper client_slug based on URL structure
-- For now, we'll set a default pattern, but this should be customized per client
UPDATE public.voice_ai_clients 
SET client_slug = LOWER(region || '_' || industry || '_' || REPLACE(business_name, ' ', ''))
WHERE client_slug IS NULL;

-- Add unique constraint to prevent duplicate client slugs
ALTER TABLE public.voice_ai_clients 
ADD CONSTRAINT unique_client_slug UNIQUE (client_slug);

-- Create a function to generate client_id from URL parameters
CREATE OR REPLACE FUNCTION public.get_client_by_url_params(
  p_region text,
  p_industry text, 
  p_clientname text
)
RETURNS table(
  client_id text,
  business_name text,
  user_id uuid,
  status text,
  config jsonb,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    vac.client_id,
    vac.business_name,
    vac.user_id,
    vac.status,
    vac.config,
    vac.created_at
  FROM public.voice_ai_clients vac
  WHERE vac.client_slug = LOWER(p_region || '_' || p_industry || '_' || p_clientname)
    OR vac.client_slug = p_clientname  -- fallback for direct client name matching
  LIMIT 1;
$$;

-- Create a function to get client stats for dashboard
CREATE OR REPLACE FUNCTION public.get_client_dashboard_stats(p_client_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}';
  total_calls integer := 0;
  calls_today integer := 0;
  calls_this_month integer := 0;
  total_cost numeric := 0.00;
  avg_duration numeric := 0.00;
  current_balance numeric := 0.00;
BEGIN
  -- Get call statistics
  SELECT 
    COUNT(*),
    COALESCE(SUM(cost_amount), 0),
    COALESCE(AVG(duration_seconds), 0)
  INTO total_calls, total_cost, avg_duration
  FROM public.call_sessions 
  WHERE client_id = p_client_id;

  -- Get today's calls
  SELECT COUNT(*)
  INTO calls_today
  FROM public.call_sessions 
  WHERE client_id = p_client_id 
    AND DATE(created_at) = CURRENT_DATE;

  -- Get this month's calls  
  SELECT COUNT(*)
  INTO calls_this_month
  FROM public.call_sessions 
  WHERE client_id = p_client_id 
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- Get current credit balance (assuming we link credits to client via user_id)
  SELECT COALESCE(balance, 0.00)
  INTO current_balance
  FROM public.credits c
  JOIN public.voice_ai_clients vac ON c.user_id = vac.user_id
  WHERE vac.client_id = p_client_id;

  -- Build result JSON
  result := jsonb_build_object(
    'total_calls', total_calls,
    'calls_today', calls_today,  
    'calls_this_month', calls_this_month,
    'total_cost', total_cost,
    'avg_duration_seconds', avg_duration,
    'current_balance', current_balance,
    'avg_cost_per_call', CASE 
      WHEN total_calls > 0 THEN total_cost / total_calls 
      ELSE 0 
    END
  );

  RETURN result;
END;
$$;