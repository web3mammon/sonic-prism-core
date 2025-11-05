import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DODO_METER_ID = 'mtr_uaY8t2CPrkBHCJVvVAqeU'; // LIVE meter ID

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body
    const { client_id, minutes_used } = await req.json();

    console.log('[IngestCallUsage] Request:', { client_id, minutes_used });

    // Validate inputs
    if (!client_id || !minutes_used) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: client_id, minutes_used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client's dodo_customer_id
    const { data: client, error: clientError } = await supabaseClient
      .from('voice_ai_clients')
      .select('dodo_customer_id, business_name')
      .eq('client_id', client_id)
      .single();

    if (clientError || !client) {
      console.error('[IngestCallUsage] Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.dodo_customer_id) {
      console.warn('[IngestCallUsage] Client has no dodo_customer_id, skipping usage ingestion');
      return new Response(
        JSON.stringify({ message: 'No active subscription, usage not tracked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[IngestCallUsage] Ingesting usage for customer:', client.dodo_customer_id);

    // Send usage to DodoPayments meter
    const dodoApiKey = Deno.env.get('DODO_API_KEY') ?? '';

    const usageRequest = {
      meter_id: DODO_METER_ID,
      customer_id: client.dodo_customer_id,
      value: minutes_used,
      timestamp: new Date().toISOString()
    };

    console.log('[IngestCallUsage] DodoPayments usage request:', JSON.stringify(usageRequest, null, 2));

    // Use live.dodopayments.com for production
    const apiUrl = 'https://live.dodopayments.com/events/ingest';
    console.log('[IngestCallUsage] API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dodoApiKey}`,
      },
      body: JSON.stringify(usageRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[IngestCallUsage] DodoPayments error:', errorData);
      throw new Error(`DodoPayments API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    console.log('[IngestCallUsage] ✅ Usage ingested successfully');
    console.log('[IngestCallUsage] Response:', JSON.stringify(responseData, null, 2));

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        minutes_tracked: minutes_used,
        customer_id: client.dodo_customer_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[IngestCallUsage] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error ingesting usage'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
