-- Remove old color columns from widget_config
-- Now using theme_name instead of individual color fields

ALTER TABLE widget_config
DROP COLUMN IF EXISTS primary_color,
DROP COLUMN IF EXISTS secondary_color,
DROP COLUMN IF EXISTS text_color;

-- Update DATABASE_SCHEMA.md reference when done
COMMENT ON TABLE widget_config IS 'Website chat widget settings - now uses pre-built themes via theme_name column';
