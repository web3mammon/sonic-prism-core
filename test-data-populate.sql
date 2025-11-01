-- Mock Data Population Script for Testing Minute-Based Dashboard
-- November 1, 2025
-- Client: us_saas_flexprice_001
-- Ready to run - just copy and paste into Supabase SQL Editor

-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Paste into Supabase SQL Editor
-- 3. Click "Run"
-- 4. Refresh your dashboard at /us/saas/flexprice to see populated data

-- ============================================================================
-- STEP 1: Insert Mock Phone Call Sessions
-- ============================================================================
-- These calls are spread across different hours to populate the Activity chart
-- Duration varies from 45 seconds to 12 minutes

INSERT INTO call_sessions (
  client_id,
  call_sid,
  caller_number,
  status,
  start_time,
  end_time,
  duration_seconds,
  transcript,
  transcript_summary,
  cost_amount,
  metadata,
  primary_intent,
  sentiment_score,
  transfer_requested
) VALUES
-- Morning calls (9 AM - 10 AM)
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551001',
  'completed',
  NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '7 minutes',
  120, -- 2 minutes
  '[]'::jsonb,
  'Customer inquired about pricing for website plan',
  0.04,
  '{}'::jsonb,
  'pricing_inquiry',
  0.8,
  false
),
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551002',
  'completed',
  NOW() - INTERVAL '2 hours' + INTERVAL '15 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '19 minutes',
  240, -- 4 minutes
  '[]'::jsonb,
  'Customer requested technical support for integration',
  0.08,
  '{}'::jsonb,
  'support',
  0.6,
  true
),
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551003',
  'completed',
  NOW() - INTERVAL '2 hours' + INTERVAL '25 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '26 minutes',
  75, -- 1.25 minutes (will round to 2)
  '[]'::jsonb,
  'Brief inquiry about business hours',
  0.02,
  '{}'::jsonb,
  'general_inquiry',
  0.9,
  false
),

-- Mid-day calls (1 PM - 2 PM)
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551004',
  'completed',
  NOW() - INTERVAL '5 hours' + INTERVAL '10 minutes',
  NOW() - INTERVAL '5 hours' + INTERVAL '17 minutes',
  420, -- 7 minutes
  '[]'::jsonb,
  'Customer wanted to upgrade from trial to paid plan',
  0.14,
  '{}'::jsonb,
  'upgrade',
  0.95,
  false
),
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551005',
  'completed',
  NOW() - INTERVAL '5 hours' + INTERVAL '30 minutes',
  NOW() - INTERVAL '5 hours' + INTERVAL '33 minutes',
  180, -- 3 minutes
  '[]'::jsonb,
  'Customer asked about refund policy',
  0.06,
  '{}'::jsonb,
  'policy',
  0.5,
  false
),

-- Afternoon calls (4 PM - 5 PM)
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551006',
  'completed',
  NOW() - INTERVAL '8 hours' + INTERVAL '5 minutes',
  NOW() - INTERVAL '8 hours' + INTERVAL '15 minutes',
  600, -- 10 minutes (longest call)
  '[]'::jsonb,
  'Detailed consultation about enterprise features',
  0.20,
  '{}'::jsonb,
  'sales',
  0.85,
  false
),
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551007',
  'completed',
  NOW() - INTERVAL '8 hours' + INTERVAL '20 minutes',
  NOW() - INTERVAL '8 hours' + INTERVAL '21 minutes',
  45, -- 45 seconds (will round to 1 minute)
  '[]'::jsonb,
  'Quick question about widget installation',
  0.02,
  '{}'::jsonb,
  'support',
  0.7,
  false
),

-- One failed call to test metrics
(
  'us_saas_flexprice_001',
  'CA' || gen_random_uuid()::text,
  '+12025551008',
  'no-answer',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours' + INTERVAL '30 seconds',
  30,
  '[]'::jsonb,
  NULL,
  0.01,
  '{}'::jsonb,
  NULL,
  NULL,
  false
);

-- ============================================================================
-- STEP 2: Insert Mock Website Chat Sessions
-- ============================================================================
-- These chats are also spread across hours to contribute to Activity chart

INSERT INTO chat_sessions (
  client_id,
  chat_id,
  visitor_id,
  status,
  start_time,
  end_time,
  duration_seconds,
  transcript,
  transcript_summary,
  metadata,
  intent,
  sentiment_score
) VALUES
-- Morning chats (10 AM)
(
  'us_saas_flexprice_001',
  'CS' || gen_random_uuid()::text,
  'visitor_001',
  'completed',
  NOW() - INTERVAL '2 hours' + INTERVAL '35 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '38 minutes',
  180, -- 3 minutes
  '[]'::jsonb,
  'Visitor asked about pricing plans',
  '{}'::jsonb,
  'pricing_inquiry',
  0.8
),
(
  'us_saas_flexprice_001',
  'CS' || gen_random_uuid()::text,
  'visitor_002',
  'completed',
  NOW() - INTERVAL '2 hours' + INTERVAL '45 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '50 minutes',
  300, -- 5 minutes
  '[]'::jsonb,
  'Visitor inquired about integration with existing CRM',
  '{}'::jsonb,
  'integration',
  0.9
),

-- Afternoon chats (3 PM - 4 PM)
(
  'us_saas_flexprice_001',
  'CS' || gen_random_uuid()::text,
  'visitor_003',
  'completed',
  NOW() - INTERVAL '6 hours' + INTERVAL '10 minutes',
  NOW() - INTERVAL '6 hours' + INTERVAL '12 minutes',
  120, -- 2 minutes
  '[]'::jsonb,
  'Quick question about widget customization',
  '{}'::jsonb,
  'support',
  0.85
),
(
  'us_saas_flexprice_001',
  'CS' || gen_random_uuid()::text,
  'visitor_004',
  'completed',
  NOW() - INTERVAL '6 hours' + INTERVAL '25 minutes',
  NOW() - INTERVAL '6 hours' + INTERVAL '31 minutes',
  360, -- 6 minutes
  '[]'::jsonb,
  'Visitor discussed custom enterprise solution',
  '{}'::jsonb,
  'sales',
  0.95
),

-- Evening chat (6 PM)
(
  'us_saas_flexprice_001',
  'CS' || gen_random_uuid()::text,
  'visitor_005',
  'completed',
  NOW() - INTERVAL '9 hours' + INTERVAL '15 minutes',
  NOW() - INTERVAL '9 hours' + INTERVAL '17 minutes',
  90, -- 1.5 minutes (will round to 2)
  '[]'::jsonb,
  'Visitor asked about trial period',
  '{}'::jsonb,
  'trial_inquiry',
  0.75
);

-- ============================================================================
-- STEP 3: Calculate Total Minutes Used and Update Client
-- ============================================================================
-- Phone calls total: 2 + 4 + 2 + 7 + 3 + 10 + 1 + 1 (failed) = 30 minutes
-- Website chats total: 3 + 5 + 2 + 6 + 2 = 18 minutes
-- GRAND TOTAL: 48 minutes used

UPDATE voice_ai_clients
SET
  trial_minutes_used = 48,
  updated_at = NOW()
WHERE client_id = 'us_saas_flexprice_001';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check the data)
-- ============================================================================

-- Check total sessions created
SELECT
  'Phone Calls' as type,
  COUNT(*) as count,
  SUM(CEIL(duration_seconds::numeric / 60)) as total_minutes
FROM call_sessions
WHERE client_id = 'us_saas_flexprice_001'
UNION ALL
SELECT
  'Website Chats' as type,
  COUNT(*) as count,
  SUM(CEIL(duration_seconds::numeric / 60)) as total_minutes
FROM chat_sessions
WHERE client_id = 'us_saas_flexprice_001';

-- Check client's updated trial minutes
SELECT
  business_name,
  trial_minutes,
  trial_minutes_used,
  (trial_minutes - trial_minutes_used) as minutes_remaining
FROM voice_ai_clients
WHERE client_id = 'us_saas_flexprice_001';

-- Check activity by hour distribution
SELECT
  EXTRACT(HOUR FROM start_time) as hour,
  COUNT(*) as sessions,
  SUM(CEIL(duration_seconds::numeric / 60)) as total_minutes
FROM (
  SELECT start_time, duration_seconds FROM call_sessions WHERE client_id = 'us_saas_flexprice_001'
  UNION ALL
  SELECT start_time, duration_seconds FROM chat_sessions WHERE client_id = 'us_saas_flexprice_001'
) combined
GROUP BY EXTRACT(HOUR FROM start_time)
ORDER BY hour;

-- ============================================================================
-- EXPECTED DASHBOARD RESULTS AFTER RUNNING THIS SCRIPT:
-- ============================================================================
-- ✅ Minutes Used This Month: 48
-- ✅ Minutes Remaining: -18 (30 - 48 = exceeds trial, should show upgrade prompt)
-- ✅ Activity by Hour Chart: Bars at hours matching NOW() - intervals
-- ✅ Peak Hour: Should be the hour with 10-minute call (or highest combined)
-- ✅ Success Rate: 87.5% (7 completed calls / 8 total calls)
-- ✅ Top Intent: "pricing_inquiry" or "support" (appears multiple times)
-- ✅ Transfer Rate: 12.5% (1 transfer requested / 8 total calls)
-- ============================================================================
