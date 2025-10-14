import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { call_sid, transcript, client_id } = await req.json();

    console.log('Agent transfer request:', { call_sid, client_id });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if transcript contains transfer keywords
    const transferKeywords = [
      'transfer',
      'speak to someone',
      'talk to human',
      'real person',
      'agent',
      'representative',
      'manager',
      'supervisor',
      'help me',
      'live person'
    ];

    const transcriptLower = (transcript || '').toLowerCase();
    const containsTransferKeyword = transferKeywords.some(keyword => 
      transcriptLower.includes(keyword)
    );

    // Query voice_ai_clients for transfer number
    const { data: client, error: clientError } = await supabase
      .from('voice_ai_clients')
      .select('call_transfer_number, call_transfer_enabled, business_name')
      .eq('client_id', client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error('Client not found');
    }

    // Check if transfer is enabled and number is configured
    if (!client.call_transfer_enabled) {
      console.log('Call transfer not enabled for client:', client_id);
      return new Response(
        JSON.stringify({ 
          error: 'Call transfer not enabled',
          shouldTransfer: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    if (!client.call_transfer_number) {
      console.log('No transfer number configured for client:', client_id);
      return new Response(
        JSON.stringify({ 
          error: 'No transfer number configured',
          shouldTransfer: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Determine transfer reason
    let transferReason = 'customer_requested';
    if (transcriptLower.includes('emergency')) {
      transferReason = 'emergency';
    } else if (transcriptLower.includes('manager') || transcriptLower.includes('supervisor')) {
      transferReason = 'escalation';
    }

    // Log the transfer to agent_transfers table
    const { error: insertError } = await supabase
      .from('agent_transfers')
      .insert({
        call_sid,
        client_id,
        transcript: transcript || '',
        transfer_number: client.call_transfer_number,
        transfer_reason: transferReason,
        status: 'initiated',
        metadata: {
          contains_keyword: containsTransferKeyword,
          business_name: client.business_name,
          timestamp: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error('Error logging transfer:', insertError);
    }

    // Generate TwiML response to transfer the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Transferring you to an agent now. Please hold.</Say>
  <Dial>${escapeXml(client.call_transfer_number)}</Dial>
</Response>`;

    console.log('Transfer initiated to:', client.call_transfer_number);

    return new Response(
      twiml,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml' 
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in agent-transfer function:', error);
    
    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, but I'm unable to transfer your call at this time. Please try again later.</Say>
  <Hangup/>
</Response>`;

    return new Response(
      errorTwiml,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml' 
        },
        status: 200
      }
    );
  }
});

// Helper function to escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
