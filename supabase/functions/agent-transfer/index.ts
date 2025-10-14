import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { call_sid, transcript, client_id } = await req.json();

    console.log('Agent transfer request:', { call_sid, client_id, transcript: transcript?.substring(0, 100) });

    if (!call_sid || !client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: call_sid, client_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check transcript for transfer keywords
    const transferKeywords = [
      'transfer', 'speak to someone', 'talk to a person', 'human', 
      'agent', 'representative', 'real person', 'live person',
      'speak to agent', 'talk to agent', 'escalate'
    ];

    const transcriptLower = (transcript || '').toLowerCase();
    const hasTransferIntent = transferKeywords.some(keyword => 
      transcriptLower.includes(keyword)
    );

    let transferReason = 'Customer requested transfer';
    if (hasTransferIntent) {
      const matchedKeyword = transferKeywords.find(keyword => transcriptLower.includes(keyword));
      transferReason = `Customer used keyword: "${matchedKeyword}"`;
    }

    // Query voice_ai_clients for transfer number
    const { data: clientData, error: clientError } = await supabase
      .from('voice_ai_clients')
      .select('call_transfer_number, call_transfer_enabled, business_name')
      .eq('client_id', client_id)
      .single();

    if (clientError || !clientData) {
      console.error('Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transfer is enabled and number exists
    if (!clientData.call_transfer_enabled || !clientData.call_transfer_number) {
      console.log('Transfer not enabled or number not set for client:', client_id);
      
      // Log failed transfer attempt
      await supabase.from('agent_transfers').insert({
        call_sid,
        client_id,
        transcript,
        transfer_number: clientData.call_transfer_number || 'NOT_SET',
        transfer_reason: 'Transfer not enabled or number not configured',
        status: 'failed',
        metadata: {
          transfer_enabled: clientData.call_transfer_enabled,
          has_number: !!clientData.call_transfer_number
        }
      });

      return new Response(
        JSON.stringify({ 
          error: 'Transfer not available',
          message: 'Call transfer is not enabled for this client or transfer number is not configured'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transferNumber = clientData.call_transfer_number;

    // Log the transfer
    const { error: logError } = await supabase
      .from('agent_transfers')
      .insert({
        call_sid,
        client_id,
        transcript,
        transfer_number: transferNumber,
        transfer_reason: transferReason,
        status: 'initiated',
        metadata: {
          business_name: clientData.business_name,
          has_transfer_intent: hasTransferIntent
        }
      });

    if (logError) {
      console.error('Error logging transfer:', logError);
    }

    // Generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Transferring you to an agent now. Please hold.</Say>
  <Dial timeout="30" callerId="${transferNumber}">
    <Number>${transferNumber}</Number>
  </Dial>
  <Say>The agent is not available at the moment. Please try again later or leave a message.</Say>
</Response>`;

    console.log('Transfer initiated to:', transferNumber);

    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      }
    });

  } catch (error) {
    console.error('Error in agent-transfer function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
