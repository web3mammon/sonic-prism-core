import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientProvisioningRequest {
  business_name: string;
  region: 'AU' | 'US' | 'UK';
  industry: string;
  phone_number: string;
  user_id: string; // Required: The UUID of the user creating this client
  greeting_text?: string;
  system_prompt?: string;
  voice_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const requestData: ClientProvisioningRequest = await req.json();
    console.log('[ClientProvisioning] Request:', requestData);

    // Validate required fields
    if (!requestData.business_name || !requestData.region || !requestData.industry || !requestData.phone_number || !requestData.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: business_name, region, industry, phone_number, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Generate client_id and client_slug
    const client_id = generateClientId(
      requestData.region,
      requestData.industry,
      requestData.business_name
    );

    // client_slug is used for URL routing: /region/industry/businessslug
    const client_slug = `${requestData.region.toLowerCase()}_${getIndustryCode(requestData.industry)}_${requestData.business_name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`;

    console.log('[ClientProvisioning] Generated client_id:', client_id);
    console.log('[ClientProvisioning] Generated client_slug:', client_slug);

    // Step 2: Get voice_id (use provided or default based on region)
    const voice_id = requestData.voice_id || getDefaultVoiceId(requestData.region);
    console.log('[ClientProvisioning] Using voice_id:', voice_id);

    // Step 3: Generate greeting text (use provided or default)
    const greeting_text = requestData.greeting_text || generateGreeting(
      requestData.region,
      requestData.business_name
    );
    console.log('[ClientProvisioning] Greeting:', greeting_text);

    // Step 4: Generate system prompt (use provided or default)
    const system_prompt = requestData.system_prompt || generateSystemPrompt(
      requestData.industry,
      requestData.business_name
    );

    // Step 5: Generate intro audio with ElevenLabs
    console.log('[ClientProvisioning] Generating intro audio with ElevenLabs...');
    const audioFileName = `${client_id}_intro.ulaw`;
    const audioBuffer = await generateIntroAudio(greeting_text, voice_id);

    if (!audioBuffer) {
      throw new Error('Failed to generate intro audio');
    }

    console.log(`[ClientProvisioning] Generated audio: ${audioBuffer.byteLength} bytes`);

    // Step 6: Upload to Supabase Storage
    console.log('[ClientProvisioning] Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('audio-snippets')
      .upload(audioFileName, audioBuffer, {
        contentType: 'audio/basic',
        upsert: true,
      });

    if (uploadError) {
      console.error('[ClientProvisioning] Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('[ClientProvisioning] Upload successful:', uploadData);

    // Step 7: Insert into voice_ai_clients table
    console.log('[ClientProvisioning] Creating voice_ai_clients record...');

    // Generate complete config (no port/api_proxy_path needed with Edge Functions!)
    const config = {
      voice_id: voice_id,
      system_prompt: system_prompt,
      greeting_message: greeting_text,
      business_context: {
        name: requestData.business_name,
        region: requestData.region,
        industry: requestData.industry,
        client_slug: client_slug
      },
      active_hours: {
        enabled: true,
        timezone: requestData.region === 'AU' ? 'Australia/Sydney' : requestData.region === 'UK' ? 'Europe/London' : 'America/New_York',
        hours: {
          monday: { open: '07:00', close: '17:00' },
          tuesday: { open: '07:00', close: '17:00' },
          wednesday: { open: '07:00', close: '17:00' },
          thursday: { open: '07:00', close: '17:00' },
          friday: { open: '07:00', close: '17:00' },
          saturday: { open: '08:00', close: '12:00' },
          sunday: { closed: true }
        }
      },
      conversation_config: {
        model: 'gpt-4o-mini',
        max_tokens: 150,
        temperature: 0.7,
        enable_recording: true,
        enable_transcription: true
      },
      tts_config: {
        provider: 'elevenlabs',
        model: 'eleven_turbo_v2_5',
        stability: 0.5,
        similarity_boost: 0.75
      },
      stt_config: {
        provider: 'deepgram',
        model: 'nova-2',
        language: requestData.region === 'AU' ? 'en-AU' : requestData.region === 'UK' ? 'en-GB' : 'en-US'
      },
      call_transfer_enabled: false,
      transfer_threshold: -0.5,
      audio_snippets: {}
    };

    const { data: clientData, error: clientError } = await supabaseClient
      .from('voice_ai_clients')
      .insert({
        client_id: client_id,
        client_slug: client_slug,
        user_id: requestData.user_id,
        business_name: requestData.business_name,
        region: requestData.region,
        industry: requestData.industry,
        phone_number: requestData.phone_number,
        voice_id: voice_id,
        greeting_message: greeting_text,
        system_prompt: system_prompt,
        intro_audio_file: audioFileName,
        config: config,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (clientError) {
      console.error('[ClientProvisioning] Client insert error:', clientError);
      throw new Error(`Failed to create client: ${clientError.message}`);
    }

    console.log('[ClientProvisioning] Client created:', clientData);

    // Step 8: Insert into audio_files table
    console.log('[ClientProvisioning] Creating audio_files record...');
    const { data: audioFileData, error: audioFileError } = await supabaseClient
      .from('audio_files')
      .insert({
        client_id: client_id,
        file_name: audioFileName,
        file_path: `audio-snippets/${audioFileName}`,
        file_type: 'intro',
        audio_format: 'ulaw',
        sample_rate: 8000,
        duration_ms: Math.round((audioBuffer.byteLength / 8000) * 1000), // Approximate duration
        file_size_bytes: audioBuffer.byteLength,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (audioFileError) {
      console.error('[ClientProvisioning] Audio file insert error:', audioFileError);
      // Non-fatal - client is already created
    }

    console.log('[ClientProvisioning] Audio file record created:', audioFileData);

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        client_id: client_id,
        business_name: requestData.business_name,
        phone_number: requestData.phone_number,
        voice_id: voice_id,
        intro_audio_file: audioFileName,
        audio_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/audio-snippets/${audioFileName}`,
        message: 'Client provisioned successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ClientProvisioning] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper: Generate client_id from region, industry, and business name
// Format: {region}_{industry_code}_{business_slug}_001
function generateClientId(region: string, industry: string, businessName: string): string {
  const regionCode = region.toLowerCase();
  const industryCode = getIndustryCode(industry);
  const businessSlug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  // Generate sequence number (001, 002, etc.) - for now, just use 001
  // In production, you'd query the database to find the next available number
  const sequence = '001';

  return `${regionCode}_${industryCode}_${businessSlug}_${sequence}`;
}

// Helper: Map industry to 4-letter code
function getIndustryCode(industry: string): string {
  const industryMap: { [key: string]: string } = {
    'plumbing': 'plmb',
    'hvac': 'hvac',
    'electrical': 'elec',
    'landscaping': 'land',
    'cleaning': 'clen',
    'roofing': 'roof',
    'painting': 'pant',
    'carpentry': 'carp',
    'pest_control': 'pest',
    'locksmith': 'lock',
  };

  const normalized = industry.toLowerCase().replace(/\s+/g, '_');
  return industryMap[normalized] || 'gnrl'; // Default to 'gnrl' for general
}

// Helper: Get default voice_id based on region
function getDefaultVoiceId(region: string): string {
  const voiceMap: { [key: string]: string } = {
    'AU': 'G83AhxHK8kccx46W4Tcd', // Male Australian voice
    'US': 'pNInz6obpgDQGcFmaJgB', // Male US voice (Adam)
    'UK': 'ThT5KcBeYPX3keUQqHPh', // Male UK voice (Antoni)
  };

  return voiceMap[region] || voiceMap['US']; // Default to US voice
}

// Helper: Generate greeting based on region and business name
function generateGreeting(region: string, businessName: string): string {
  const greetingMap: { [key: string]: string } = {
    'AU': `G'day! Thanks for calling ${businessName}. How can I help you today?`,
    'US': `Hi there! Thanks for calling ${businessName}. How can I assist you today?`,
    'UK': `Hello! Thanks for calling ${businessName}. How may I help you today?`,
  };

  return greetingMap[region] || greetingMap['US'];
}

// Helper: Generate system prompt based on industry
function generateSystemPrompt(industry: string, businessName: string): string {
  const industryPrompts: { [key: string]: string } = {
    'plumbing': `You are a friendly and professional receptionist for ${businessName}, a plumbing company. Your role is to:
- Greet callers warmly
- Understand their plumbing issue (leaks, blockages, installations, emergencies)
- Collect basic information (name, phone, address, issue description)
- Schedule appointments or dispatch emergency service
- Be empathetic to urgent situations
- Provide estimated arrival times when possible

Keep responses natural, concise, and helpful. Ask one question at a time.`,

    'hvac': `You are a friendly and professional receptionist for ${businessName}, an HVAC company. Your role is to:
- Greet callers warmly
- Understand their heating/cooling issue
- Collect basic information (name, phone, address, system type, issue)
- Schedule service appointments or emergency dispatch
- Provide basic troubleshooting if appropriate
- Be empathetic to comfort concerns

Keep responses natural, concise, and helpful.`,

    'default': `You are a friendly and professional receptionist for ${businessName}. Your role is to:
- Greet callers warmly
- Understand their needs
- Collect basic information (name, phone, inquiry details)
- Schedule appointments or route calls appropriately
- Provide helpful information about services

Keep responses natural, concise, and helpful.`,
  };

  const normalized = industry.toLowerCase();
  return industryPrompts[normalized] || industryPrompts['default'];
}

// Helper: Generate intro audio using ElevenLabs streaming API
async function generateIntroAudio(text: string, voiceId: string): Promise<ArrayBuffer | null> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

  if (!ELEVENLABS_API_KEY) {
    console.error('[ElevenLabs] API key not found');
    return null;
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/basic',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        output_format: 'ulaw_8000', // Direct μ-law output for Twilio
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs] Error response:', response.status, errorText);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[ElevenLabs] Generated ${audioBuffer.byteLength} bytes of μ-law audio`);

    return audioBuffer;

  } catch (error) {
    console.error('[ElevenLabs] Error generating audio:', error);
    return null;
  }
}