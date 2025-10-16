import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [TEST-CALL] Function invoked');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clientId, phoneNumber, testScenario } = await req.json();
    console.log('🔍 [TEST-CALL] Request body:', { clientId, phoneNumber, testScenario });

    if (!clientId || !phoneNumber) {
      throw new Error('Missing required fields: clientId and phoneNumber');
    }

    console.log(`📞 [TEST-CALL] Initiating test call for client ${clientId} to ${phoneNumber}`);

    // Get client configuration
    const { data: client, error: clientError } = await supabaseClient
      .from('voice_ai_clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client lookup error:', clientError);
      throw new Error(`Client not found: ${clientId}`);
    }

    // Get Twilio credentials from secrets
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Create call session record with VALID status
    const callSid = `TEST_${Date.now()}`;
    console.log('Creating call session with call_sid:', callSid);
    
    const { data: session, error: sessionError } = await supabaseClient
      .from('call_sessions')
      .insert({
        client_id: clientId,
        call_sid: callSid,
        caller_number: phoneNumber,
        status: 'ringing', // VALID status from constraint
        metadata: {
          test_call: true,
          test_scenario: testScenario || 'General test call',
          direction: 'outbound',
        }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw new Error(`Failed to create call session: ${sessionError.message}`);
    }

    console.log('✅ [TEST-CALL] Session created:', session.id);

    // Don't create TwiML here! Use the SAME webhook endpoint as real calls
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-webhook/voice`;

    console.log('🔗 [TEST-CALL] Will use webhook URL:', webhookUrl);

    // Initiate outbound call via Twilio - point to our REAL webhook
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams({
      From: client.phone_number,
      To: phoneNumber,
      Url: webhookUrl,  // Use Url (not Twiml) to point to our webhook
      Method: 'POST',
      // No StatusCallback - FastAPI doesn't use it either
    });

    console.log('Making Twilio API call from', client.phone_number, 'to', phoneNumber);
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
      console.error('Twilio API error:', twilioResponse.status, errorText);
      throw new Error(`Twilio API error: ${twilioResponse.status} - ${errorText}`);
    }

    const callData = await twilioResponse.json();
    console.log('✅ [TEST-CALL] Twilio call initiated successfully. SID:', callData.sid);

    // Update session with actual Twilio call SID
    await supabaseClient
      .from('call_sessions')
      .update({
        call_sid: callData.sid,
        status: 'in-progress',
        metadata: {
          ...session.metadata,
          twilio_call_sid: callData.sid,
          twilio_status: callData.status,
        }
      })
      .eq('id', session.id);

    console.log('📊 [TEST-CALL] Session updated with Twilio SID');

    return new Response(
      JSON.stringify({
        success: true,
        callSid: callData.sid,
        sessionId: session.id,
        message: `Test call initiated to ${phoneNumber}. Using the SAME webhook as real calls for full voice AI pipeline.`,
        webhookUrl: webhookUrl,
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
