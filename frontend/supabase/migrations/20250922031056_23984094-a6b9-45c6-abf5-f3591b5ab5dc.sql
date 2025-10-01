-- Insert dummy clients for testing URL mapping
-- First, let's add some test voice AI clients with proper client_slugs

INSERT INTO public.voice_ai_clients (
  client_id, 
  user_id, 
  region, 
  industry, 
  business_name, 
  status, 
  port, 
  client_slug,
  config,
  phone_number
) VALUES 
-- Australian Plumbing Client
(
  'au_plmb_acmeplumbing_001',
  '0c274fbf-2907-4285-9587-781da11284b7', -- Using existing user_id from network logs
  'au',
  'plmb', 
  'ACME Plumbing',
  'active',
  3001,
  'au_plmb_acmeplumbing',
  '{"system_prompt": "You are a helpful AI assistant for ACME Plumbing Services", "voice_id": "default", "features": {"sms_enabled": true, "calendar_integration": true}}',
  '+61412345678'
),
-- Australian Electrical Client  
(
  'au_elec_smithelectrical_001',
  '0c274fbf-2907-4285-9587-781da11284b7',
  'au',
  'elec',
  'Smith Electrical Services', 
  'active',
  3002,
  'au_elec_smithelectrical',
  '{"system_prompt": "You are a professional AI assistant for Smith Electrical Services", "voice_id": "default", "features": {"sms_enabled": true, "calendar_integration": false}}',
  '+61423456789'
),
-- UK Plumbing Client
(
  'uk_plmb_jamesonplumbing_001',
  '0c274fbf-2907-4285-9587-781da11284b7',
  'uk', 
  'plmb',
  'Jameson Plumbing Ltd',
  'inactive',
  3003,
  'uk_plmb_jamesonplumbing', 
  '{"system_prompt": "You are a friendly AI assistant for Jameson Plumbing Ltd", "voice_id": "british", "features": {"sms_enabled": false, "calendar_integration": true}}',
  '+44207123456'
),
-- US Tech Client
(
  'us_tech_globaltechsolutions_001',
  '0c274fbf-2907-4285-9587-781da11284b7',
  'us',
  'tech', 
  'Global Tech Solutions',
  'starting',
  3004,
  'us_tech_globaltechsolutions',
  '{"system_prompt": "You are a technical AI assistant for Global Tech Solutions", "voice_id": "american", "features": {"sms_enabled": true, "calendar_integration": true}}',
  '+15551234567'
);

-- Add some dummy call sessions for testing
INSERT INTO public.call_sessions (
  client_id,
  call_sid,
  caller_number,
  status,
  start_time,
  end_time,
  duration_seconds,
  cost_amount,
  transcript,
  metadata
) VALUES
-- Calls for ACME Plumbing
('au_plmb_acmeplumbing_001', 'CA123456789', '+61987654321', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes', 300, 2.50, '[]', '{}'),
('au_plmb_acmeplumbing_001', 'CA123456790', '+61987654322', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '8 minutes', 480, 3.20, '[]', '{}'),
('au_plmb_acmeplumbing_001', 'CA123456791', '+61987654323', 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '12 minutes', 720, 4.80, '[]', '{}'),

-- Calls for Smith Electrical
('au_elec_smithelectrical_001', 'CA123456792', '+61987654324', 'completed', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours' + INTERVAL '6 minutes', 360, 2.88, '[]', '{}'),
('au_elec_smithelectrical_001', 'CA123456793', '+61987654325', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', 600, 4.00, '[]', '{}');

-- Update credits for the user (delete and insert to avoid unique constraint issues)
DELETE FROM public.credits WHERE user_id = '0c274fbf-2907-4285-9587-781da11284b7';
INSERT INTO public.credits (user_id, balance, currency) 
VALUES ('0c274fbf-2907-4285-9587-781da11284b7', 125.50, 'USD');