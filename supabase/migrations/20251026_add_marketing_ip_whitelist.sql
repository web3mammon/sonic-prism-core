-- ============================================
-- Migration: Add marketing_ip_whitelist table
-- Purpose: Whitelist IPs for unlimited marketing widget access (testing, demos, VIPs)
-- Date: 2025-10-26
-- ============================================

CREATE TABLE marketing_ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast IP lookups
CREATE INDEX idx_marketing_ip_whitelist_ip ON marketing_ip_whitelist(ip_address);

-- RLS: No policies needed - this table is managed by edge functions and admins
ALTER TABLE marketing_ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to read this table
CREATE POLICY "Edge functions can read IP whitelist"
  ON marketing_ip_whitelist FOR SELECT
  USING (true);

-- Comments
COMMENT ON TABLE marketing_ip_whitelist IS 'Whitelisted IPs bypass rate limiting on marketing site (unlimited access)';
COMMENT ON COLUMN marketing_ip_whitelist.ip_address IS 'Client IP address to whitelist';
COMMENT ON COLUMN marketing_ip_whitelist.description IS 'Note about why this IP is whitelisted (e.g., "Office IP", "Demo for investor")';

-- Example: Add your office IP (replace with actual IP)
-- INSERT INTO marketing_ip_whitelist (ip_address, description) VALUES ('YOUR_IP_HERE', 'Office/Testing IP');
