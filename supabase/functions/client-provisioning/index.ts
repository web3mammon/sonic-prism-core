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

    // 2. Create the directory structure (this would call a system command)
    const provisioningData = {
      client_id,
      business_name,
      region,
      industry,
      client_slug,
      port: client.port,
      status: 'provisioning'
    }

    // 3. Update client status to provisioning
    await supabase
      .from('voice_ai_clients')
      .update({ status: 'provisioning' })
      .eq('client_id', client_id)

    // 4. Make HTTP request to the main server to handle file operations
    const provisioningResponse = await fetch(`http://localhost:8080/api/provision-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(provisioningData)
    })

    if (!provisioningResponse.ok) {
      throw new Error('Client provisioning failed on server')
    }

    // 5. Update client status to active
    await supabase
      .from('voice_ai_clients')
      .update({ status: 'active' })
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