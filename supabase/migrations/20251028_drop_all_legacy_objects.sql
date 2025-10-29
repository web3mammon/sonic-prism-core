-- Drop all database objects that might reference dropped tables
-- Run this to clean up any lingering functions, triggers, or views

-- Drop any functions that might reference credits table
DROP FUNCTION IF EXISTS public.create_user_credits CASCADE;
DROP FUNCTION IF EXISTS public.update_user_credits CASCADE;
DROP FUNCTION IF EXISTS public.deduct_credits CASCADE;
DROP FUNCTION IF EXISTS public.add_credits CASCADE;
DROP FUNCTION IF EXISTS public.get_user_credits CASCADE;
DROP FUNCTION IF EXISTS public.check_credits_balance CASCADE;

-- Drop any functions that might reference call_credits_ledger
DROP FUNCTION IF EXISTS public.log_credit_deduction CASCADE;
DROP FUNCTION IF EXISTS public.track_credit_usage CASCADE;

-- Drop any functions that might reference pricing_config
DROP FUNCTION IF EXISTS public.get_pricing CASCADE;
DROP FUNCTION IF EXISTS public.get_pricing_by_currency CASCADE;
DROP FUNCTION IF EXISTS public.calculate_price CASCADE;

-- Drop any functions that might reference usage_logs
DROP FUNCTION IF EXISTS public.log_usage CASCADE;
DROP FUNCTION IF EXISTS public.track_usage CASCADE;

-- Drop any triggers on voice_ai_clients that might reference old columns
DROP TRIGGER IF EXISTS update_credits_trigger ON public.voice_ai_clients CASCADE;
DROP TRIGGER IF EXISTS check_port_trigger ON public.voice_ai_clients CASCADE;

-- List all remaining functions for manual review (if any)
-- You can run this separately to see what's left:
-- SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
