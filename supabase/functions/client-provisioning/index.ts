import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FlexPrice API configuration
const FLEXPRICE_API_KEY = Deno.env.get('FLEXPRICE_API_KEY');
const FLEXPRICE_BASE_URL = Deno.env.get('FLEXPRICE_BASE_URL') || 'https://api.cloud.flexprice.io/v1';

interface ClientProvisioningRequest {
  business_name: string;
  region: 'AU' | 'US' | 'UK';
  industry: string;
  phone_number?: string; // Optional: Required for phone channel, optional for website-only
  user_id: string; // Required: The UUID of the user creating this client
  channel_type?: 'phone' | 'website' | 'both'; // Default: 'phone'
  greeting_text?: string;
  system_prompt?: string;
  voice_id?: string;
  // NEW: Business context fields
  website_url?: string;
  services_offered?: string[];
  pricing_info?: string;
  target_audience?: string;
  tone?: string;
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

    // Validate required fields (phone_number optional for website-only clients)
    if (!requestData.business_name || !requestData.region || !requestData.industry || !requestData.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: business_name, region, industry, user_id' }),
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

    // Step 5: Generate intro audio with ElevenLabs (BOTH formats)
    console.log('[ClientProvisioning] Generating intro audio with ElevenLabs...');
    const audioFileName_ulaw = `${client_id}_intro.ulaw`;
    const audioFileName_mp3 = `${client_id}_intro.mp3`;

    // Generate μ-law for phone calls
    const audioBuffer_ulaw = await generateIntroAudio(greeting_text, voice_id, 'ulaw_8000');
    if (!audioBuffer_ulaw) {
      throw new Error('Failed to generate ulaw intro audio');
    }
    console.log(`[ClientProvisioning] Generated ulaw audio: ${audioBuffer_ulaw.byteLength} bytes`);

    // Generate MP3 for website widget
    const audioBuffer_mp3 = await generateIntroAudio(greeting_text, voice_id, 'mp3_44100');
    if (!audioBuffer_mp3) {
      throw new Error('Failed to generate mp3 intro audio');
    }
    console.log(`[ClientProvisioning] Generated mp3 audio: ${audioBuffer_mp3.byteLength} bytes`);

    // Step 6: Upload BOTH to Supabase Storage
    console.log('[ClientProvisioning] Uploading audio files to Supabase Storage...');

    // Upload ulaw (phone)
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('audio-snippets')
      .upload(audioFileName_ulaw, audioBuffer_ulaw, {
        contentType: 'audio/basic',
        upsert: true,
      });

    if (uploadError) {
      console.error('[ClientProvisioning] Upload error (ulaw):', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }
    console.log('[ClientProvisioning] ✅ Ulaw audio uploaded:', uploadData);

    // Upload mp3 (website)
    const { data: uploadData_mp3, error: uploadError_mp3 } = await supabaseClient.storage
      .from('audio-snippets')
      .upload(audioFileName_mp3, audioBuffer_mp3, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError_mp3) {
      console.error('[ClientProvisioning] Upload error (mp3):', uploadError_mp3);
      throw new Error(`MP3 storage upload failed: ${uploadError_mp3.message}`);
    }
    console.log('[ClientProvisioning] ✅ MP3 audio uploaded:', uploadData_mp3);

    // Step 7: Insert into voice_ai_clients table
    console.log('[ClientProvisioning] Creating voice_ai_clients record...');

    const channel_type = requestData.channel_type || 'phone';

    // Calculate timezone based on region
    const timezone = requestData.region === 'AU' ? 'Australia/Sydney'
                   : requestData.region === 'UK' ? 'Europe/London'
                   : requestData.region === 'CA' ? 'America/Toronto'
                   : requestData.region === 'IN' ? 'Asia/Kolkata'
                   : 'America/New_York';

    // Default business hours (can be customized later in Business Details page)
    const business_hours = {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '14:00' },
      sunday: { closed: true }
    };

    // ========================================
    // TRIAL ALLOCATION (Hybrid Approach - Nov 1, 2025)
    // ========================================
    // Minute-based trial (universal for all channels)
    const trial_minutes = 30; // 30 minutes for all users
    const trial_minutes_used = 0;

    console.log(`[ClientProvisioning] Trial allocation: ${trial_minutes} minutes (universal for all channels)`);

    const { data: clientData, error: clientError} = await supabaseClient
      .from('voice_ai_clients')
      .insert({
        client_id: client_id,
        client_slug: client_slug,
        user_id: requestData.user_id,
        business_name: requestData.business_name,
        region: requestData.region,
        industry: requestData.industry,
        phone_number: requestData.phone_number,
        call_transfer_number: requestData.phone_number, // Default to same as phone_number (user can change later)
        voice_id: voice_id,
        greeting_message: greeting_text,
        system_prompt: system_prompt,
        timezone: timezone,
        business_hours: business_hours,
        channel_type: channel_type,
        status: 'active',
        // Minute-based trial tracking (Nov 1, 2025)
        trial_minutes: trial_minutes,
        trial_minutes_used: trial_minutes_used,
        created_at: new Date().toISOString(),
        // NEW: Business context fields
        website_url: requestData.website_url || null,
        services_offered: requestData.services_offered || [],
        pricing_info: requestData.pricing_info || null,
        target_audience: requestData.target_audience || null,
        tone: requestData.tone || 'professional',
      })
      .select('client_id, client_slug, user_id, business_name, region, industry, phone_number, voice_id, greeting_message, system_prompt, timezone, business_hours, channel_type, status, trial_minutes, trial_minutes_used, created_at, website_url, services_offered, pricing_info, target_audience, tone')
      .single();

    if (clientError) {
      console.error('[ClientProvisioning] Client insert error:', clientError);
      throw new Error(`Failed to create client: ${clientError.message}`);
    }

    console.log('[ClientProvisioning] Client created:', clientData);

    // Step 8: FlexPrice Integration - Create customer and wallet
    console.log('[ClientProvisioning] Creating FlexPrice customer and wallet...');

    // Get user email from Supabase Auth
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(requestData.user_id);
    const userEmail = userData?.user?.email || `${requestData.user_id}@klariqo.com`; // Fallback email

    if (userError) {
      console.warn('[ClientProvisioning] Could not fetch user email:', userError.message);
    }

    // Create FlexPrice customer (per-client, not per-user)
    // This ensures each business has separate billing
    const customerCreated = await createFlexPriceCustomer(
      client_id,  // Use client_id instead of user_id for per-business billing
      userEmail,
      requestData.business_name
    );

    if (customerCreated) {
      // Create wallet with 10 free trial credits (per-client wallet)
      await createFlexPriceWallet(client_id, 10);  // Use client_id for per-business credits
    } else {
      console.warn('[ClientProvisioning] ⚠️ FlexPrice customer creation failed - continuing anyway');
      // Non-fatal - client is already created, we can retry later
    }

    // Step 9: Insert into audio_files table (both formats)
    console.log('[ClientProvisioning] Creating audio_files records...');

    // Insert ulaw record
    const { data: audioFileData_ulaw, error: audioFileError_ulaw } = await supabaseClient
      .from('audio_files')
      .insert({
        client_id: client_id,
        file_name: audioFileName_ulaw,
        file_path: `audio-snippets/${audioFileName_ulaw}`,
        file_type: 'intro',
        audio_format: 'ulaw',
        sample_rate: 8000,
        duration_ms: Math.round((audioBuffer_ulaw.byteLength / 8000) * 1000),
        file_size_bytes: audioBuffer_ulaw.byteLength,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (audioFileError_ulaw) {
      console.error('[ClientProvisioning] Audio file insert error (ulaw):', audioFileError_ulaw);
    } else {
      console.log('[ClientProvisioning] Ulaw audio file record created:', audioFileData_ulaw);
    }

    // Insert mp3 record
    const { data: audioFileData_mp3, error: audioFileError_mp3 } = await supabaseClient
      .from('audio_files')
      .insert({
        client_id: client_id,
        file_name: audioFileName_mp3,
        file_path: `audio-snippets/${audioFileName_mp3}`,
        file_type: 'intro',
        audio_format: 'mp3',
        sample_rate: 44100,
        duration_ms: Math.round((audioBuffer_mp3.byteLength / 176400) * 1000), // 44100 * 4 bytes/sample
        file_size_bytes: audioBuffer_mp3.byteLength,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (audioFileError_mp3) {
      console.error('[ClientProvisioning] Audio file insert error (mp3):', audioFileError_mp3);
    } else {
      console.log('[ClientProvisioning] MP3 audio file record created:', audioFileData_mp3);
    }

    // Step 9: Create widget_config if channel_type is 'website' or 'both'
    let embed_code = null;
    if (channel_type === 'website' || channel_type === 'both') {
      console.log('[ClientProvisioning] Creating widget_config for website channel...');

      // Generate embed code
      const widget_url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/widgets/klariqo-widget.js`;
      embed_code = `<script src="${widget_url}?client_id=${client_id}"></script>`;

      // Generate MP3 audio URL for widget
      const mp3_audio_url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/audio-snippets/${audioFileName_mp3}`;

      const { data: widgetData, error: widgetError } = await supabaseClient
        .from('widget_config')
        .insert({
          client_id: client_id,
          primary_color: '#ef4444',
          secondary_color: '#1a1a1a',
          text_color: '#ffffff',
          position: 'bottom-right',
          widget_size: 'medium',
          greeting_message: greeting_text,
          greeting_audio_url: mp3_audio_url,  // Pre-generated MP3 intro
          system_prompt: system_prompt,
          embed_code: embed_code,
          widget_url: widget_url,
        })
        .select()
        .single();

      if (widgetError) {
        console.error('[ClientProvisioning] Widget config insert error:', widgetError);
        // Non-fatal - client is already created
      } else {
        console.log('[ClientProvisioning] Widget config created:', widgetData);
      }
    }

    // Success response
    const responseData: any = {
      success: true,
      client_id: client_id,
      client_slug: client_slug,
      channel_type: channel_type,
      business_name: requestData.business_name,
      phone_number: requestData.phone_number,
      voice_id: voice_id,
      intro_audio_file_ulaw: audioFileName_ulaw,
      intro_audio_file_mp3: audioFileName_mp3,
      audio_url_ulaw: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/audio-snippets/${audioFileName_ulaw}`,
      audio_url_mp3: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/audio-snippets/${audioFileName_mp3}`,
      message: 'Client provisioned successfully',
    };

    // Add embed_code to response if widget was created
    if (embed_code) {
      responseData.embed_code = embed_code;
    }

    return new Response(
      JSON.stringify(responseData),
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
    // Physical/Local Services
    'plumbing': 'plmb',
    'hvac': 'hvac',
    'electrical': 'elec',
    'electrician': 'elec',
    'landscaping': 'land',
    'lawn': 'land',
    'cleaning': 'clen',
    'roofing': 'roof',
    'painting': 'pant',
    'carpentry': 'carp',
    'pest_control': 'pest',
    'pest': 'pest',
    'locksmith': 'lock',
    'handyman': 'hand',

    // Online Businesses
    'saas': 'saas',
    'software': 'saas',
    'software_as_a_service': 'saas',
    'ecommerce': 'ecom',
    'e-commerce': 'ecom',
    'e_commerce': 'ecom',
    'online_store': 'ecom',
    'online_shop': 'ecom',
    'blog': 'blog',
    'blogging': 'blog',
    'content': 'blog',
    'consulting': 'cons',
    'consultant': 'cons',
    'consultancy': 'cons',
    'marketing': 'mark',
    'marketing_agency': 'mark',
    'agency': 'mark',
    'design': 'desi',
    'design_agency': 'desi',
    'creative': 'desi',
    'creative_agency': 'desi',

    // Professional Services
    'healthcare': 'hlth',
    'health': 'hlth',
    'medical': 'hlth',
    'dental': 'hlth',
    'dentist': 'hlth',
    'real_estate': 'real',
    'realestate': 'real',
    'property': 'real',
    'legal': 'legl',
    'law': 'legl',
    'lawyer': 'legl',
    'attorney': 'legl',

    // Food & Hospitality
    'restaurant': 'rest',
    'food': 'rest',
    'cafe': 'cafe',
    'coffee': 'cafe',
    'bar': 'rest',
  };

  const normalized = industry.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return industryMap[normalized] || 'misc'; // Default to 'misc' for miscellaneous
}

// Helper: Get default voice_id based on region
function getDefaultVoiceId(region: string): string {
  const voiceMap: { [key: string]: string } = {
    'AU': 'G83AhxHK8kccx46W4Tcd', // Male Australian voice
    'US': 'pNInz6obpgDQGcFmaJgB', // Male US voice (Adam)
    'UK': 'ThT5KcBeYPX3keUQqHPh', // Male UK voice (Antoni)
    'CA': 'pNInz6obpgDQGcFmaJgB', // Male Canadian voice (same as US - Adam)
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
async function generateIntroAudio(text: string, voiceId: string, format: 'ulaw_8000' | 'mp3_44100'): Promise<ArrayBuffer | null> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

  if (!ELEVENLABS_API_KEY) {
    console.error('[ElevenLabs] API key not found');
    return null;
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

    // Determine content type based on format
    const acceptHeader = format === 'ulaw_8000' ? 'audio/basic' : 'audio/mpeg';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': acceptHeader,
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        output_format: format, // Dynamic: 'ulaw_8000' for phone, 'mp3_44100' for web
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs] Error response (${format}):`, response.status, errorText);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[ElevenLabs] Generated ${audioBuffer.byteLength} bytes of ${format} audio`);

    return audioBuffer;

  } catch (error) {
    console.error(`[ElevenLabs] Error generating ${format} audio:`, error);
    return null;
  }
}

// ============================================================================
// FLEXPRICE INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Create a customer in FlexPrice
 */
async function createFlexPriceCustomer(userId: string, email: string, businessName: string): Promise<boolean> {
  if (!FLEXPRICE_API_KEY) {
    console.error('[FlexPrice] API key not configured');
    return false;
  }

  try {
    console.log(`[FlexPrice] Creating customer for user ${userId}...`);

    const response = await fetch(`${FLEXPRICE_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FLEXPRICE_API_KEY,
      },
      body: JSON.stringify({
        external_customer_id: userId,
        name: businessName,
        email: email,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FlexPrice] Customer creation failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('[FlexPrice] ✅ Customer created:', data);
    return true;
  } catch (error) {
    console.error('[FlexPrice] Customer creation error:', error);
    return false;
  }
}

/**
 * Create a wallet and grant initial free trial credits
 * @param clientId - The client_id (business identifier) to create wallet for
 * @param initialCredits - Initial credit balance (default: 10)
 *
 * NOTE: We use client_id as external_customer_id to ensure per-business billing.
 * This way each business (client) has its own isolated credit pool.
 */
async function createFlexPriceWallet(clientId: string, initialCredits: number = 10): Promise<boolean> {
  if (!FLEXPRICE_API_KEY) {
    console.error('[FlexPrice] API key not configured');
    return false;
  }

  try {
    console.log(`[FlexPrice] Creating wallet with ${initialCredits} free trial credits for client ${clientId}...`);

    const response = await fetch(`${FLEXPRICE_BASE_URL}/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FLEXPRICE_API_KEY,
      },
      body: JSON.stringify({
        external_customer_id: clientId,  // Use client_id for per-business wallets
        currency: 'USD',
        initial_balance: initialCredits,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FlexPrice] Wallet creation failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log(`[FlexPrice] ✅ Wallet created with ${initialCredits} free trial credits for client ${clientId}:`, data);
    return true;
  } catch (error) {
    console.error('[FlexPrice] Wallet creation error:', error);
    return false;
  }
}