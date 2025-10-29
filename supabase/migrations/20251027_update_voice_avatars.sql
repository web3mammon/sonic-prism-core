-- Update voice_profiles with avatar URLs and fix ordering

-- Add avatar_url column
ALTER TABLE voice_profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update avatar URLs for all voices
UPDATE voice_profiles SET avatar_url = 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/avatars/jason.jpg' WHERE voice_id = 'Smxkoz0xiOoHo5WcSskf';
UPDATE voice_profiles SET avatar_url = 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/avatars/sarah.jpg' WHERE voice_id = 'YhNmhaaLcHbuyfVn0UeL';
UPDATE voice_profiles SET avatar_url = 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/avatars/henry.jpg' WHERE voice_id = 'LdTqJtvVwwciodnQ3CvY';
UPDATE voice_profiles SET avatar_url = 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/avatars/lily.jpg' WHERE voice_id = 'HJoB5tEZ4MKnaBUwdrqS';
UPDATE voice_profiles SET avatar_url = 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/avatars/pete.jpg' WHERE voice_id = 'G83AhxHK8kccx46W4Tcd';
UPDATE voice_profiles SET avatar_url = 'https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/avatars/ava.jpg' WHERE voice_id = 'jCF6ebPopunk73liLZIE';

-- Add display_order column for custom sorting (US → UK → AU)
ALTER TABLE voice_profiles ADD COLUMN IF NOT EXISTS display_order integer;

-- Set display order: US first (1-2), UK second (3-4), AU last (5-6)
UPDATE voice_profiles SET display_order = 1 WHERE voice_id = 'Smxkoz0xiOoHo5WcSskf'; -- Jason (US Male)
UPDATE voice_profiles SET display_order = 2 WHERE voice_id = 'YhNmhaaLcHbuyfVn0UeL'; -- Sarah (US Female)
UPDATE voice_profiles SET display_order = 3 WHERE voice_id = 'LdTqJtvVwwciodnQ3CvY'; -- Henry (UK Male)
UPDATE voice_profiles SET display_order = 4 WHERE voice_id = 'HJoB5tEZ4MKnaBUwdrqS'; -- Lily (UK Female)
UPDATE voice_profiles SET display_order = 5 WHERE voice_id = 'G83AhxHK8kccx46W4Tcd'; -- Pete (AU Male)
UPDATE voice_profiles SET display_order = 6 WHERE voice_id = 'jCF6ebPopunk73liLZIE'; -- Ava (AU Female)
