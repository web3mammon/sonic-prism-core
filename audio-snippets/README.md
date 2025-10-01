# Audio Snippets

This directory contains pre-recorded audio snippets for voice AI clients. Audio files should be in **μ-law (ulaw) format at 8kHz** to match Twilio's audio format requirements.

## Directory Structure

```
audio-snippets/
├── au_plmb_jamesonplumbing/
│   ├── intro_greeting.ulaw
│   ├── pricing.ulaw
│   ├── services_offered.ulaw
│   └── emergency_hours.ulaw
└── {region}_{industry}_{businessname}/
    └── ...
```

## Folder Naming Convention

Folders should match the client_id pattern (without the numeric suffix):
- Format: `{region}_{industry}_{businessname}`
- Example: `au_plmb_jamesonplumbing`

## Audio File Requirements

1. **Format**: μ-law (ulaw) encoded
2. **Sample Rate**: 8kHz
3. **Channels**: Mono (1 channel)
4. **File Extension**: `.ulaw`

## Converting Audio to μ-law Format

Use FFmpeg to convert audio files to the correct format:

```bash
ffmpeg -i input.mp3 -ar 8000 -ac 1 -acodec pcm_mulaw -f mulaw output.ulaw
```

## How Audio Snippets Work

1. **Configuration**: Add audio snippet mappings in the `voice_ai_clients.audio_snippets` JSON field:
   ```json
   {
     "pricing_hours": "pricing.ulaw",
     "emergency_callout": "emergency_hours.ulaw",
     "services_list": "services_offered.ulaw"
   }
   ```

2. **Intent Matching**: When a user's speech contains keywords from the intent name (e.g., "pricing", "hours"), the AI will play the corresponding audio file instead of generating a response.

3. **File Serving**: The `serve-audio-snippet` edge function reads files from this directory and streams them to Twilio during calls.

## Adding New Clients

1. Create a folder matching the client's ID pattern
2. Add `.ulaw` audio files to the folder
3. Update the client's `audio_snippets` configuration in the database
4. Test the audio snippets during a call

## Example Client Configuration

```sql
UPDATE voice_ai_clients 
SET audio_snippets = '{
  "pricing_hours": "pricing.ulaw",
  "emergency": "emergency_hours.ulaw",
  "services": "services_offered.ulaw"
}'::jsonb
WHERE client_id = 'au_plmb_jamesonplumbing_001';
```
