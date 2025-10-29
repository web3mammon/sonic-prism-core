-- ============================================
-- Migration: Add voice_profiles table
-- Purpose: Centralized voice management for ElevenLabs voices
-- Date: 2025-10-27
-- ============================================

-- Step 1: Create voice_profiles table
CREATE TABLE IF NOT EXISTS voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id text UNIQUE NOT NULL,           -- ElevenLabs voice ID
  name text NOT NULL,                       -- "Sarah", "Jason", "Pete", etc.
  gender text NOT NULL,                     -- 'male' | 'female'
  accent text NOT NULL,                     -- 'US' | 'UK' | 'AU'
  language text DEFAULT 'en',               -- 'en' (future: 'es', 'fr', etc.)
  voice_provider text DEFAULT 'elevenlabs', -- 'elevenlabs'
  personality text,                         -- 'friendly', 'professional', 'warm'
  demo_audio_url text,                      -- URL to demo MP3 in Supabase Storage
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Step 2: Add indexes
CREATE INDEX idx_voice_profiles_accent ON voice_profiles(accent);
CREATE INDEX idx_voice_profiles_gender ON voice_profiles(gender);
CREATE INDEX idx_voice_profiles_active ON voice_profiles(is_active);

-- Step 3: Insert the 6 custom voices
INSERT INTO voice_profiles (voice_id, name, gender, accent, personality, demo_audio_url) VALUES
-- Australian voices
('G83AhxHK8kccx46W4Tcd', 'Pete', 'male', 'AU', 'friendly', 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/audio-snippets/voice-previews/pete.mp3'),
('jCF6ebPopunk73liLZIE', 'Ava', 'female', 'AU', 'warm', 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/audio-snippets/voice-previews/ava.mp3'),

-- American voices
('Smxkoz0xiOoHo5WcSskf', 'Jason', 'male', 'US', 'professional', 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/audio-snippets/voice-previews/jason.mp3'),
('YhNmhaaLcHbuyfVn0UeL', 'Sarah', 'female', 'US', 'friendly', 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/audio-snippets/voice-previews/sarah.mp3'),

-- UK voices
('LdTqJtvVwwciodnQ3CvY', 'Henry', 'male', 'UK', 'professional', 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/audio-snippets/voice-previews/henry.mp3'),
('HJoB5tEZ4MKnaBUwdrqS', 'Lily', 'female', 'UK', 'warm', 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/audio-snippets/voice-previews/lily.mp3');

-- Step 4: Add comments
COMMENT ON TABLE voice_profiles IS 'Centralized voice management for ElevenLabs AI voices';
COMMENT ON COLUMN voice_profiles.voice_id IS 'ElevenLabs voice ID (unique identifier)';
COMMENT ON COLUMN voice_profiles.demo_audio_url IS 'URL to demo MP3 for voice selection UI';

-- Step 5: Enable RLS (Row Level Security)
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read voice profiles (public data)
CREATE POLICY "Voice profiles are publicly readable"
  ON voice_profiles FOR SELECT
  USING (true);

-- Policy: Only admins can modify voice profiles
CREATE POLICY "Only admins can modify voice profiles"
  ON voice_profiles FOR ALL
  USING (has_role('admin'::app_role));
