import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { client_id, business_name, region, industry, client_slug } = await req.json()

    console.log('🚀 Starting client provisioning for:', { client_id, business_name })

    // 1. Get the newly created client from Supabase
    const { data: client, error: clientError } = await supabase
      .from('voice_ai_clients')
      .select('*')
      .eq('client_id', client_id)
      .single()

    if (clientError) {
      throw new Error(`Failed to get client: ${clientError.message}`)
    }

    // 2. Update client status to provisioning
    await supabase
      .from('voice_ai_clients')
      .update({ status: 'provisioning' })
      .eq('client_id', client_id)

    // 3. Initialize client configuration in database
    const defaultConfig = {
      voice_id: '6FINSXmstr7jTeJkpd2r', // Default ElevenLabs voice
      system_prompt: `You are a professional AI assistant for ${business_name}. Be helpful, concise, and friendly.`,
      business_context: {
        name: business_name,
        region: region,
        industry: industry
      },
      active_hours: {
        enabled: true,
        hours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
          saturday: { open: '10:00', close: '14:00' },
          sunday: { open: 'closed', close: 'closed' }
        }
      },
      conversation_config: {
        model: 'gpt-4',
        max_tokens: 150,
        temperature: 0.7
      },
      tts_config: {
        model: 'eleven_turbo_v2_5',
        stability: 0.5,
        similarity_boost: 0.75
      },
      audio_snippets: {
        intro_greeting: `intro_greeting.ulaw`,
        after_hours_greeting: `after_hours_greeting.ulaw`
      }
    }

    // 4. Update client config
    await supabase
      .from('voice_ai_clients')
      .update({ 
        config: defaultConfig,
        status: 'active' 
      })
      .eq('client_id', client_id)

    console.log('✅ Client provisioning completed for:', client_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client provisioned successfully',
        client_id,
        port: client.port
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Client provisioning error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})