-- Create credits table for user account balances
CREATE TABLE public.credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage logs table for tracking purchases and call usage
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund')),
  call_count INTEGER,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing config table for different regions
CREATE TABLE public.pricing_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL, -- Price for base package (20 calls)
  base_calls INTEGER NOT NULL DEFAULT 20,
  per_call_price NUMERIC(10,2) NOT NULL, -- Price per additional call
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default pricing
INSERT INTO public.pricing_config (currency, base_price, base_calls, per_call_price) VALUES
('USD', 49.00, 20, 2.00),
('AUD', 67.00, 20, 3.00);

-- Enable RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credits
CREATE POLICY "Users can view their own credits" 
ON public.credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" 
ON public.credits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits" 
ON public.credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for usage_logs
CREATE POLICY "Users can view their own usage logs" 
ON public.usage_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs" 
ON public.usage_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Pricing config is public read-only
CREATE POLICY "Anyone can view pricing config" 
ON public.pricing_config 
FOR SELECT 
USING (true);

-- Admin policies
CREATE POLICY "Admins can manage credits" 
ON public.credits 
FOR ALL 
USING (has_role('admin'::app_role));

CREATE POLICY "Admins can manage usage logs" 
ON public.usage_logs 
FOR ALL 
USING (has_role('admin'::app_role));

CREATE POLICY "Admins can manage pricing config" 
ON public.pricing_config 
FOR ALL 
USING (has_role('admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_credits_updated_at
BEFORE UPDATE ON public.credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize user credits
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance, currency)
  VALUES (NEW.user_id, 0.00, 'USD');
  RETURN NEW;
END;
$$;

-- Trigger to create credits when profile is created
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();