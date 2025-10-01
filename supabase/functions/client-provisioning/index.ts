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

    // 3. Generate industry-specific AI configuration
    const industryPrompts: Record<string, string> = {
      plmb: `You are an AI receptionist for ${business_name}, a professional plumbing service. Your role is to:
- Greet callers warmly and professionally
- Identify the nature of plumbing emergencies (burst pipes, blocked drains, gas leaks, hot water issues)
- Determine urgency level and schedule appointments accordingly
- Collect caller details: name, address, phone number, and issue description
- For emergencies, prioritize immediate dispatch
- Quote standard service call fees when asked
- Be empathetic for stressful situations like floods or no hot water
Keep responses concise (under 50 words) and natural for voice conversations.`,
      
      elec: `You are an AI receptionist for ${business_name}, a licensed electrical service. Your role is to:
- Answer calls professionally and identify electrical issues
- Assess urgency (power outages, sparking, safety hazards are HIGH priority)
- Schedule appointments for installations, repairs, and safety inspections
- Collect caller information and property details
- Emphasize safety for dangerous situations
- Provide service call fee information
Keep responses brief and reassuring for voice calls.`,
      
      hvac: `You are an AI receptionist for ${business_name}, an HVAC service company. Your role is to:
- Handle inquiries about heating, cooling, and ventilation systems
- Identify urgent issues (no heating in winter, no cooling in summer, gas smells)
- Schedule service appointments and maintenance visits
- Collect property details and system information
- Quote service fees and maintenance packages
Keep responses conversational and under 50 words.`,
      
      clean: `You are an AI receptionist for ${business_name}, a professional cleaning service. Your role is to:
- Take booking requests for residential and commercial cleaning
- Identify service type: regular cleaning, deep cleaning, move-in/out, or special requests
- Collect property size, location, and specific requirements
- Schedule appointments and provide quote estimates
- Ask about frequency preferences (one-time, weekly, fortnightly)
Keep responses friendly and efficient.`,
      
      misc: `You are an AI receptionist for ${business_name}. Your role is to:
- Greet callers professionally and warmly
- Understand their service needs
- Collect contact information and service details
- Schedule appointments at convenient times
- Provide general information about services and fees
Keep responses natural and concise for voice conversations.`
    }

    const greetingMessages: Record<string, string> = {
      plmb: `Thanks for calling ${business_name}, your trusted local plumber. How can I help you today?`,
      elec: `Good day, you've reached ${business_name} electrical services. What can I assist you with?`,
      hvac: `Hello, ${business_name} heating and cooling. How may I help you today?`,
      clean: `Hi there, ${business_name} cleaning services. How can I brighten your day?`,
      misc: `Hello, you've reached ${business_name}. How may I assist you today?`
    }

    const defaultConfig = {
      voice_id: '6FINSXmstr7jTeJkpd2r', // Professional, neutral voice
      system_prompt: industryPrompts[industry] || industryPrompts.misc,
      greeting_message: greetingMessages[industry] || greetingMessages.misc,
      business_context: {
        name: business_name,
        region: region,
        industry: industry,
        client_slug: client_slug
      },
      active_hours: {
        enabled: true,
        timezone: 'Australia/Sydney',
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
        model: 'gpt-4',
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
        language: 'en-AU'
      },
      call_transfer_enabled: false,
      transfer_threshold: -0.5,
      audio_snippets: {}
    }

    // 4. Update client with personalized configuration
    await supabase
      .from('voice_ai_clients')
      .update({ 
        system_prompt: industryPrompts[industry] || industryPrompts.misc,
        greeting_message: greetingMessages[industry] || greetingMessages.misc,
        voice_id: '6FINSXmstr7jTeJkpd2r',
        business_context: defaultConfig.business_context,
        active_hours: defaultConfig.active_hours,
        conversation_config: defaultConfig.conversation_config,
        tts_config: defaultConfig.tts_config,
        stt_config: defaultConfig.stt_config,
        call_transfer_enabled: false,
        transfer_threshold: -0.5,
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