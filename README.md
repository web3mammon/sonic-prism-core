# Klariqo Voice AI Platform

**Full-stack AI voice assistant platform:** React + Vite + Supabase + Deno Edge Functions

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Configure Twilio webhook: `https://<project-id>.supabase.co/functions/v1/twilio-webhook/voice`

## 🏗️ Architecture

```
React App → Supabase (DB + Auth + Edge Functions) → Twilio (Voice) → AI Services (STT/GPT/TTS)
```

**All backend logic now runs on Deno Edge Functions** (Python fully removed)

## 📁 Structure

- `src/` - React frontend (TypeScript + TailwindCSS)
- `supabase/functions/` - Deno edge functions (all AI/voice logic)
- `supabase/migrations/` - Database schema

## 🗄️ Key Tables

- `voice_ai_clients` - Client configurations
- `call_sessions` - Call records & transcripts
- `conversation_logs` - Message-by-message logs
- `profiles` - User accounts
- `credits` - Usage tracking

## 📞 Call Flow

1. Twilio call → `twilio-webhook` (creates session)
2. WebSocket → `twilio-voice-webhook` (streaming handler)
3. Audio → `voice-stt` (Deepgram transcription)
4. Text → `voice-router` (GPT-4 response)
5. Text → `voice-tts` (ElevenLabs speech)
6. Audio → Twilio → Caller

## 🔧 Edge Functions

- **twilio-webhook** - Call initiation
- **twilio-voice-webhook** - WebSocket streaming (core)
- **voice-stt** - Speech-to-text (Deepgram)
- **voice-router** - AI routing (GPT-4)
- **voice-tts** - Text-to-speech (ElevenLabs)
- **client-provisioning** - New client setup
- **calendar-integration** - Booking management
- **audio-manager** - Audio file serving
- **sms-manager** - SMS operations

## 🔐 Setup

1. Configure Supabase secrets (OpenAI, ElevenLabs, Deepgram, Twilio)
2. Set Twilio webhooks to Supabase edge functions
3. Add client via signup flow or database insert
4. Test call to assigned Twilio number

## 📝 Migration Complete

✅ **All Python removed** - Pure TypeScript/Deno stack
✅ **Zero Python runtime** - Fully serverless on Supabase
✅ **100% edge functions** - Scalable, fast, maintainable

Test: Call your Twilio number configured with webhook URL above.
