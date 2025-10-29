-- ============================================
-- Migration: Add marketing_rate_limits table
-- Purpose: Rate limit marketing site voice widget (3 min per IP per 24h)
-- Date: 2025-10-26
-- ============================================

CREATE TABLE marketing_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  total_seconds_today integer DEFAULT 0,
  conversation_count integer DEFAULT 0,
  last_conversation_start timestamp with time zone,
  last_reset timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast IP lookups
CREATE INDEX idx_marketing_rate_limits_ip ON marketing_rate_limits(ip_address);

-- Index for cleanup queries (find old records)
CREATE INDEX idx_marketing_rate_limits_last_reset ON marketing_rate_limits(last_reset);

-- RLS: No policies needed - this table is managed by edge functions only
ALTER TABLE marketing_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage this table
CREATE POLICY "Edge functions can manage rate limits"
  ON marketing_rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE marketing_rate_limits IS 'Rate limiting for marketing site voice widget - 3 minutes per IP per 24 hours';
COMMENT ON COLUMN marketing_rate_limits.ip_address IS 'Client IP address (hashed for privacy)';
COMMENT ON COLUMN marketing_rate_limits.total_seconds_today IS 'Total conversation seconds used today';
COMMENT ON COLUMN marketing_rate_limits.conversation_count IS 'Number of conversations started today';
COMMENT ON COLUMN marketing_rate_limits.last_reset IS 'Last time the counter was reset (24h cycle)';

-- Auto-cleanup function: Delete records older than 48 hours
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM marketing_rate_limits
  WHERE last_reset < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup (if pg_cron is enabled)
-- SELECT cron.schedule('cleanup-rate-limits', '0 2 * * *', 'SELECT cleanup_old_rate_limits();');
