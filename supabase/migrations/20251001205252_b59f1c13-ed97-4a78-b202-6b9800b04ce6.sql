-- Phase 1 & 2: Extend call_sessions table for sentiment analysis and business intelligence
ALTER TABLE public.call_sessions 
ADD COLUMN IF NOT EXISTS sentiment_score numeric,
ADD COLUMN IF NOT EXISTS primary_intent text,
ADD COLUMN IF NOT EXISTS conversation_stage text,
ADD COLUMN IF NOT EXISTS transfer_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS outcome_type text;

-- Add indexes for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_call_sessions_sentiment ON public.call_sessions(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_call_sessions_intent ON public.call_sessions(primary_intent);
CREATE INDEX IF NOT EXISTS idx_call_sessions_outcome ON public.call_sessions(outcome_type);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON public.call_sessions(created_at);

-- Add transfer configuration to voice_ai_clients
ALTER TABLE public.voice_ai_clients
ADD COLUMN IF NOT EXISTS call_transfer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_threshold numeric DEFAULT -0.5;

-- Create business_insights table for storing calculated BI metrics
CREATE TABLE IF NOT EXISTS public.business_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  metric_type text NOT NULL,
  metric_value jsonb NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_business_insights_client FOREIGN KEY (client_id) REFERENCES public.voice_ai_clients(client_id)
);

-- Enable RLS on business_insights
ALTER TABLE public.business_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business_insights
CREATE POLICY "Users can view their own business insights"
ON public.business_insights
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.voice_ai_clients
    WHERE voice_ai_clients.client_id = business_insights.client_id
    AND voice_ai_clients.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all business insights"
ON public.business_insights
FOR ALL
USING (has_role('admin'::app_role));

CREATE POLICY "System can insert business insights"
ON public.business_insights
FOR INSERT
WITH CHECK (true);

-- Add indexes for business_insights
CREATE INDEX IF NOT EXISTS idx_business_insights_client ON public.business_insights(client_id);
CREATE INDEX IF NOT EXISTS idx_business_insights_period ON public.business_insights(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_business_insights_type ON public.business_insights(metric_type);