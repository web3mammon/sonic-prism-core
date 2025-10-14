-- Create agent_transfers table for logging call transfers
CREATE TABLE IF NOT EXISTS public.agent_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid text NOT NULL,
  client_id text NOT NULL,
  transcript text,
  transfer_number text NOT NULL,
  transfer_reason text,
  status text NOT NULL DEFAULT 'initiated',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.agent_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all agent transfers"
  ON public.agent_transfers
  FOR ALL
  USING (has_role('admin'::app_role));

CREATE POLICY "Users can view their own agent transfers"
  ON public.agent_transfers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_ai_clients
      WHERE voice_ai_clients.client_id = agent_transfers.client_id
      AND voice_ai_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert agent transfers"
  ON public.agent_transfers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon read"
  ON public.agent_transfers
  FOR SELECT
  USING (true);