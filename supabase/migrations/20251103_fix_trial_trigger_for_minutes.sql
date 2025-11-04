-- Migration: Fix trial allocation trigger for minute-based pricing
-- Date: November 3, 2025
-- Issue: Old trigger still references trial_calls/trial_conversations which don't exist
-- Solution: Drop old trigger/function, create new one for trial_minutes

-- Step 1: Drop old trigger and function
DROP TRIGGER IF EXISTS auto_set_trial_allocations ON public.voice_ai_clients;
DROP FUNCTION IF EXISTS set_trial_allocations();

-- Step 2: Create new function for minute-based trial allocation
CREATE OR REPLACE FUNCTION set_trial_minutes_allocation()
RETURNS TRIGGER AS $$
BEGIN
  -- Set trial_minutes to 30 for all users (universal trial)
  IF NEW.trial_minutes IS NULL THEN
    NEW.trial_minutes := 30;
  END IF;

  -- Initialize trial_minutes_used to 0
  IF NEW.trial_minutes_used IS NULL THEN
    NEW.trial_minutes_used := 0;
  END IF;

  -- Set paid_plan to FALSE by default
  IF NEW.paid_plan IS NULL THEN
    NEW.paid_plan := FALSE;
  END IF;

  -- Initialize paid_minutes_used to 0
  IF NEW.paid_minutes_used IS NULL THEN
    NEW.paid_minutes_used := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create new trigger
CREATE TRIGGER auto_set_trial_minutes
  BEFORE INSERT ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_minutes_allocation();

-- Step 4: Update any RPC functions that reference trial_calls (optional cleanup)
-- Note: This is safe to run even if the function doesn't exist
DROP FUNCTION IF EXISTS get_client_dashboard_data(uuid);
DROP FUNCTION IF EXISTS get_client_dashboard_data(text);

-- Recreate get_client_dashboard_data with minute-based fields
CREATE OR REPLACE FUNCTION get_client_dashboard_data(p_user_id uuid)
RETURNS TABLE (
  client_id text,
  business_name text,
  channel_type text,
  phone_number text,
  region text,
  industry text,
  status text,
  trial_minutes integer,
  trial_minutes_used integer,
  minutes_remaining integer,
  paid_plan boolean,
  plan_id text,
  paid_minutes_included integer,
  paid_minutes_used integer,
  billing_cycle_start timestamptz,
  billing_cycle_end timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vac.client_id,
    vac.business_name,
    vac.channel_type::text,
    vac.phone_number,
    vac.region,
    vac.industry,
    vac.status,
    vac.trial_minutes,
    vac.trial_minutes_used,
    CASE WHEN vac.trial_minutes > 0 THEN vac.trial_minutes - vac.trial_minutes_used ELSE 0 END as minutes_remaining,
    vac.paid_plan,
    vac.plan_id,
    vac.paid_minutes_included,
    vac.paid_minutes_used,
    vac.billing_cycle_start,
    vac.billing_cycle_end,
    vac.created_at
  FROM voice_ai_clients vac
  WHERE vac.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Trial allocation trigger updated for minute-based pricing';
  RAISE NOTICE '✅ Old trial_calls/trial_conversations references removed';
  RAISE NOTICE '✅ New trigger sets trial_minutes = 30 for all new users';
END $$;
