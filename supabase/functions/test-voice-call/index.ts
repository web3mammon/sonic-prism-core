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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clientId, phoneNumber, testScenario } = await req.json();

    if (!clientId || !phoneNumber) {
      throw new Error('Missing required fields: clientId and phoneNumber');
    }

    console.log(`Initiating test call for client ${clientId} to ${phoneNumber}`);

    // Get client configuration
    const { data: client, error: clientError } = await supabaseClient
      .from('voice_ai_clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    // Get Twilio credentials from secrets
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Create call session record
    const { data: session, error: sessionError } = await supabaseClient
      .from('call_sessions')
      .insert({
        client_id: clientId,
        phone_number: phoneNumber,
        direction: 'outbound',
        status: 'initiating',
        metadata: {
          test_call: true,
          test_scenario: testScenario || 'General test call',
        }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw new Error('Failed to create call session');
    }

    // Get the WebSocket URL for voice streaming
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const wsUrl = `wss://${new URL(SUPABASE_URL!).hostname.replace('.supabase.co', '.functions.supabase.co')}/voice-websocket?client_id=${clientId}&call_sid=${session.call_sid}`;

    // Create TwiML with WebSocket stream for voice AI pipeline
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Connecting you to the AI assistant for testing.</Say>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="client_id" value="${clientId}" />
      <Parameter name="call_sid" value="${session.call_sid}" />
    </Stream>
  </Connect>
</Response>`;

    // Initiate outbound call via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams({
      From: client.phone_number,
      To: phoneNumber,
      Twiml: twiml,
      StatusCallback: `${SUPABASE_URL}/functions/v1/twilio-webhook/status`,
      StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'].join(','),
    });

    console.log('Making Twilio API call...');
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error('Twilio API error:', errorText);
      throw new Error(`Twilio API error: ${twilioResponse.status} - ${errorText}`);
    }

    const callData = await twilioResponse.json();
    console.log('Twilio call initiated:', callData.sid);

    // Update session with Twilio call SID
    await supabaseClient
      .from('call_sessions')
      .update({
        call_sid: callData.sid,
        status: 'ringing',
        metadata: {
          ...session.metadata,
          twilio_call_sid: callData.sid,
          twilio_status: callData.status,
        }
      })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        callSid: callData.sid,
        sessionId: session.id,
        message: `Test call initiated to ${phoneNumber}. The call will use the full voice AI pipeline: Deepgram STT → GPT → ElevenLabs TTS`,
        websocketUrl: wsUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Test call error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
