-- Add our actual test clients: plmbcoldcalling and plmbsurvey
-- These match our API setup on ports 3009 and 3010

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
-- Our test client: plmbcoldcalling (port 3009)
(
  'au_klrq_plmbcoldcalling_001',
  '0c274fbf-2907-4285-9587-781da11284b7', -- Using existing test user_id
  'au',
  'klrq',
  'Plumbing Cold Calling',
  'active',
  3009,
  'au_klrq_plmbcoldcalling',
  '{"system_prompt": "You are Lauren, a professional AI assistant for Klariqo plumbing cold calling services", "voice_id": "default", "features": {"sms_enabled": true, "payment_links": true, "calendar_integration": true}}',
  '+61400000001'
),
-- Our test client: plmbsurvey (port 3010)
(
  'au_klrq_plmbsurvey_001',
  '0c274fbf-2907-4285-9587-781da11284b7',
  'au',
  'klrq',
  'Plumbing Survey',
  'active',
  3010,
  'au_klrq_plmbsurvey',
  '{"system_prompt": "You are Sarah, a friendly AI assistant for Klariqo plumbing survey services", "voice_id": "default", "features": {"sms_enabled": true, "survey_collection": true}}',
  '+61400000002'
);

-- Add some test call sessions for plmbcoldcalling
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
-- Test calls for plmbcoldcalling
('au_klrq_plmbcoldcalling_001', 'CA_TEST_001', '+61400111111', 'completed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '4 minutes', 240, 2.00, '[]', '{"lead_quality": "high", "converted": true}'),
('au_klrq_plmbcoldcalling_001', 'CA_TEST_002', '+61400111112', 'completed', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '7 minutes', 420, 3.50, '[]', '{"lead_quality": "medium", "converted": false}'),
('au_klrq_plmbcoldcalling_001', 'CA_TEST_003', '+61400111113', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '6 minutes', 360, 3.00, '[]', '{"lead_quality": "high", "converted": true}'),

-- Test calls for plmbsurvey
('au_klrq_plmbsurvey_001', 'CA_SURVEY_001', '+61400222221', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes', 180, 1.50, '[]', '{"survey_completed": true, "satisfaction": 8}'),
('au_klrq_plmbsurvey_001', 'CA_SURVEY_002', '+61400222222', 'completed', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours' + INTERVAL '5 minutes', 300, 2.50, '[]', '{"survey_completed": true, "satisfaction": 9}');