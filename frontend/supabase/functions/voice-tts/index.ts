import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, client_id, voice_id } = await req.json();
    
    if (!text) {
      throw new Error('No text provided');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log(`🔊 TTS request for client: ${client_id}`);

    // Get client's TTS configuration from database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: client } = await supabaseClient
      .from('voice_ai_clients')
      .select('tts_config, voice_id')
      .eq('client_id', client_id)
      .single();

    const ttsConfig = client?.tts_config || {};
    const finalVoiceId = voice_id || client?.voice_id || '6FINSXmstr7jTeJkpd2r'; // Default voice

    console.log(`Using voice: ${finalVoiceId}, model: ${ttsConfig.model || 'eleven_turbo_v2_5'}`);

    // Generate speech with ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: ttsConfig.model || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: ttsConfig.stability || 0.5,
            similarity_boost: ttsConfig.similarity_boost || 0.75,
            style: 0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    console.log(`✅ Generated ${audioBuffer.byteLength} bytes of audio`);

    return new Response(
      JSON.stringify({
        audio: audioBase64,
        format: 'mp3',
        voice_id: finalVoiceId,
        size_bytes: audioBuffer.byteLength
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
