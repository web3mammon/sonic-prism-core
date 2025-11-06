-- Add theme_name column to widget_config table
-- This allows clients to select from pre-built gradient themes instead of custom colors

ALTER TABLE widget_config
ADD COLUMN IF NOT EXISTS theme_name TEXT DEFAULT 'gradient-purple';

-- Add comment to explain the column
COMMENT ON COLUMN widget_config.theme_name IS 'Pre-built gradient theme: gradient-purple, gradient-ocean, gradient-sunset, gradient-forest, gradient-midnight, gradient-rose, gradient-sky, gradient-emerald, gradient-crimson, gradient-gold';

-- Update existing rows to use gradient-purple if they don't have a theme
UPDATE widget_config
SET theme_name = 'gradient-purple'
WHERE theme_name IS NULL;
