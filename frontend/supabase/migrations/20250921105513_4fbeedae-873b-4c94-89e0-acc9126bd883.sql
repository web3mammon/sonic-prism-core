-- Create Voice AI Clients table
CREATE TABLE public.voice_ai_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  industry TEXT NOT NULL,
  business_name TEXT NOT NULL,
  port INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'starting', 'stopping', 'error')),
  phone_number TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Call Sessions table
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  call_sid TEXT NOT NULL UNIQUE,
  caller_number TEXT,
  status TEXT NOT NULL CHECK (status IN ('ringing', 'in-progress', 'completed', 'failed', 'no-answer')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  transcript JSONB DEFAULT '[]',
  transcript_summary TEXT,
  recording_url TEXT,
  cost_amount NUMERIC(10,4) DEFAULT 0.00,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Audio Files table for TTS library
CREATE TABLE public.audio_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('tts_generated', 'uploaded', 'system')),
  voice_id TEXT,
  text_content TEXT,
  duration_ms INTEGER,
  file_size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SMS Logs table
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('payment_link', 'onboarding', 'appointment', 'follow_up', 'custom')),
  message_content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
  twilio_sid TEXT,
  cost_amount NUMERIC(6,4) DEFAULT 0.00,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Phone Number Pool table
CREATE TABLE public.phone_number_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'reserved', 'suspended')),
  assigned_client_id TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  monthly_cost NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on all tables
ALTER TABLE public.voice_ai_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_number_pool ENABLE ROW LEVEL SECURITY;

-- Voice AI Clients policies
CREATE POLICY "Admins can manage all voice AI clients" 
ON public.voice_ai_clients 
FOR ALL 
USING (has_role('admin'::app_role));

CREATE POLICY "Users can view their own voice AI clients" 
ON public.voice_ai_clients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice AI clients" 
ON public.voice_ai_clients 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Call Sessions policies
CREATE POLICY "Admins can manage all call sessions" 
ON public.call_sessions 
FOR ALL 
USING (has_role('admin'::app_role));

CREATE POLICY "Users can view their own call sessions" 
ON public.call_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.voice_ai_clients 
    WHERE client_id = call_sessions.client_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "System can insert call sessions" 
ON public.call_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update call sessions" 
ON public.call_sessions 
FOR UPDATE 
USING (true);

-- Audio Files policies
CREATE POLICY "Admins can manage all audio files" 
ON public.audio_files 
FOR ALL 
USING (has_role('admin'::app_role));

CREATE POLICY "Users can manage their own audio files" 
ON public.audio_files 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.voice_ai_clients 
    WHERE client_id = audio_files.client_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "System can manage audio files" 
ON public.audio_files 
FOR ALL 
USING (true);

-- SMS Logs policies
CREATE POLICY "Admins can manage all sms logs" 
ON public.sms_logs 
FOR ALL 
USING (has_role('admin'::app_role));

CREATE POLICY "Users can view their own sms logs" 
ON public.sms_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.voice_ai_clients 
    WHERE client_id = sms_logs.client_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "System can insert sms logs" 
ON public.sms_logs 
FOR INSERT 
WITH CHECK (true);

-- Phone Number Pool policies
CREATE POLICY "Admins can manage phone number pool" 
ON public.phone_number_pool 
FOR ALL 
USING (has_role('admin'::app_role));

CREATE POLICY "Users can view available phone numbers" 
ON public.phone_number_pool 
FOR SELECT 
USING (status = 'available' OR assigned_client_id IN (
  SELECT client_id FROM public.voice_ai_clients WHERE user_id = auth.uid()
));

-- Add foreign key constraints
ALTER TABLE public.voice_ai_clients 
ADD CONSTRAINT fk_voice_ai_clients_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.call_sessions 
ADD CONSTRAINT fk_call_sessions_client_id 
FOREIGN KEY (client_id) REFERENCES public.voice_ai_clients(client_id) ON DELETE CASCADE;

ALTER TABLE public.audio_files 
ADD CONSTRAINT fk_audio_files_client_id 
FOREIGN KEY (client_id) REFERENCES public.voice_ai_clients(client_id) ON DELETE CASCADE;

ALTER TABLE public.sms_logs 
ADD CONSTRAINT fk_sms_logs_client_id 
FOREIGN KEY (client_id) REFERENCES public.voice_ai_clients(client_id) ON DELETE CASCADE;

ALTER TABLE public.phone_number_pool 
ADD CONSTRAINT fk_phone_number_pool_assigned_client_id 
FOREIGN KEY (assigned_client_id) REFERENCES public.voice_ai_clients(client_id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_voice_ai_clients_user_id ON public.voice_ai_clients(user_id);
CREATE INDEX idx_voice_ai_clients_port ON public.voice_ai_clients(port);
CREATE INDEX idx_call_sessions_client_id ON public.call_sessions(client_id);
CREATE INDEX idx_call_sessions_call_sid ON public.call_sessions(call_sid);
CREATE INDEX idx_call_sessions_start_time ON public.call_sessions(start_time);
CREATE INDEX idx_audio_files_client_id ON public.audio_files(client_id);
CREATE INDEX idx_sms_logs_client_id ON public.sms_logs(client_id);
CREATE INDEX idx_phone_number_pool_status ON public.phone_number_pool(status);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_voice_ai_clients_updated_at
  BEFORE UPDATE ON public.voice_ai_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_sessions_updated_at
  BEFORE UPDATE ON public.call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get next available port
CREATE OR REPLACE FUNCTION public.get_next_available_port()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_port INTEGER;
BEGIN
  SELECT COALESCE(MAX(port), 3000) + 1 
  INTO next_port 
  FROM public.voice_ai_clients;
  
  RETURN next_port;
END;
$$;