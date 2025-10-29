-- Add greeting_audio_url column to widget_config table
ALTER TABLE widget_config
ADD COLUMN IF NOT EXISTS greeting_audio_url text;

COMMENT ON COLUMN widget_config.greeting_audio_url IS 'URL to the generated TTS audio file for the greeting message';
