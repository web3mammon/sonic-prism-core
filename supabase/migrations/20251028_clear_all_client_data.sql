-- CLEAR ALL CLIENT DATA (FRESH START)
-- This removes all client-related data but preserves:
-- - User accounts (profiles)
-- - Database structure (tables, columns, triggers)

-- Step 1: Delete from child tables first (due to foreign key constraints)

-- Delete all call sessions
DELETE FROM public.call_sessions;

-- Delete all chat sessions
DELETE FROM public.chat_sessions;

-- Delete all conversation logs
DELETE FROM public.conversation_logs;

-- Delete all widget configs
DELETE FROM public.widget_config;

-- Delete all audio files
DELETE FROM public.audio_files;

-- Delete all leads
DELETE FROM public.leads;

-- Step 2: Delete from main client table
DELETE FROM public.voice_ai_clients;

-- Step 3: Optionally clear storage (audio files)
-- Note: This requires manual cleanup in Supabase Storage UI or via API
-- Go to: Storage > audio-snippets > Delete all files

-- Step 4: Verify cleanup
SELECT 'voice_ai_clients' as table_name, COUNT(*) as remaining_rows FROM public.voice_ai_clients
UNION ALL
SELECT 'call_sessions', COUNT(*) FROM public.call_sessions
UNION ALL
SELECT 'chat_sessions', COUNT(*) FROM public.chat_sessions
UNION ALL
SELECT 'conversation_logs', COUNT(*) FROM public.conversation_logs
UNION ALL
SELECT 'widget_config', COUNT(*) FROM public.widget_config
UNION ALL
SELECT 'audio_files', COUNT(*) FROM public.audio_files
UNION ALL
SELECT 'leads', COUNT(*) FROM public.leads
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as remaining_rows FROM public.profiles;

-- All counts should be 0 except profiles (your user accounts remain intact)
