import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const eventType = pathSegments[pathSegments.length - 1]; // 'voice', 'status', 'sms', etc.

    switch (eventType) {
      case 'voice':
        return await handleVoiceWebhook(req, supabaseClient);
      
      case 'status':
        return await handleStatusWebhook(req, supabaseClient);
      
      case 'sms':
        return await handleSMSWebhook(req, supabaseClient);
      
      default:
        return await handleGenericWebhook(req, supabaseClient, eventType);
    }
  } catch (error) {
    console.error('Twilio Webhook Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleVoiceWebhook(req: Request, supabase: any) {
  const formData = await req.formData();
  const params = Object.fromEntries(formData.entries());

  console.log('Voice webhook received:', params);

  const callSid = params.CallSid as string;
  const from = params.From as string;
  const to = params.To as string;
  const callStatus = params.CallStatus as string;
  const direction = params.Direction as string; // 'inbound' or 'outbound-api'

  console.log(`Call direction: ${direction}`);

  // Find the client by phone number based on call direction
  // INBOUND: client phone = To (our number)
  // OUTBOUND: client phone = From (our number)
  const lookupNumber = direction === 'outbound-api' ? from : to;
  console.log(`Looking up client by phone: ${lookupNumber}`);

  const { data: client } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('phone_number', lookupNumber)
    .single();

  if (!client) {
    console.error(`No client found for phone number: ${lookupNumber} (direction: ${direction})`);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }

  console.log(`✅ Client found: ${client.business_name} (${client.client_id})`);

  // DON'T create session in database here - it causes timeout!
  // FastAPI creates IN-MEMORY session only, WebSocket handler will create DB session
  console.log(`📞 Generating TwiML for: ${callSid}`);

  try {
    // Generate TwiML response immediately
    const twiml = generateTwiMLResponse(client, callSid, from, to, direction);
    console.log(`✅ TwiML generated successfully`);

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error in voice webhook:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Technical error occurred. Please try again.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

async function handleStatusWebhook(req: Request, supabase: any) {
  const formData = await req.formData();
  const params = Object.fromEntries(formData.entries());
  
  console.log('Status webhook received:', params);

  const callSid = params.CallSid as string;
  const callStatus = params.CallStatus as string;
  const callDuration = params.CallDuration as string;

  // Update call session
  const updateData: any = {
    status: mapTwilioStatus(callStatus),
    updated_at: new Date().toISOString()
  };

  if (callStatus === 'completed' && callDuration) {
    updateData.duration_seconds = parseInt(callDuration);
    updateData.end_time = new Date().toISOString();
    
    // Calculate cost (example: $0.05 per minute)
    const costPerMinute = 0.05;
    const minutes = Math.ceil(parseInt(callDuration) / 60);
    updateData.cost_amount = minutes * costPerMinute;
  }

  const { error } = await supabase
    .from('call_sessions')
    .update(updateData)
    .eq('call_sid', callSid);

  if (error) {
    console.error('Error updating call session:', error);
  }

  return new Response('OK', { status: 200 });
}

async function handleSMSWebhook(req: Request, supabase: any) {
  const formData = await req.formData();
  const params = Object.fromEntries(formData.entries());
  
  console.log('SMS webhook received:', params);

  const messageSid = params.MessageSid as string;
  const from = params.From as string;
  const to = params.To as string;
  const body = params.Body as string;
  const messageStatus = params.MessageStatus as string;

  // Find the client by phone number
  const { data: client } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('phone_number', from) // SMS sent from our number
    .single();

  if (client) {
    // Log SMS in our system
    await supabase
      .from('sms_logs')
      .upsert({
        client_id: client.client_id,
        phone_number: to,
        message_type: 'custom',
        message_content: body,
        status: messageStatus === 'delivered' ? 'delivered' : 
                messageStatus === 'failed' ? 'failed' : 'sent',
        twilio_sid: messageSid,
        cost_amount: 0.0075, // Example SMS cost
        metadata: {
          twilio_params: params
        }
      });
  }

  return new Response('OK', { status: 200 });
}

async function handleGenericWebhook(req: Request, supabase: any, eventType: string) {
  const body = await req.text();
  console.log(`Generic webhook (${eventType}):`, body);
  
  // Log the webhook for debugging
  // In a real implementation, you might want to store these in a webhooks table
  
  return new Response('OK', { status: 200 });
}

function mapTwilioStatus(twilioStatus: string): string {
  switch (twilioStatus) {
    case 'ringing':
      return 'ringing';
    case 'in-progress':
      return 'in-progress';
    case 'completed':
      return 'completed';
    case 'busy':
    case 'failed':
      return 'failed';
    case 'no-answer':
      return 'no-answer';
    default:
      return twilioStatus;
  }
}

function generateTwiMLResponse(client: any, callSid: string, from: string, to: string, direction: string): string {
  console.log(`🔧 Generating TwiML - CallSid: ${callSid}, From: ${from}, To: ${to}, Direction: ${direction}`);

  // Use callSid in PATH like FastAPI does, pass other params as Stream parameters
  const streamUrl = `wss://btqccksigmohyjdxgrrj.supabase.co/functions/v1/twilio-voice-webhook/${callSid}`;

  console.log(`🔗 WebSocket URL: ${streamUrl}`);

  // Use Twilio's Parameter tags to pass additional data (including client_id and direction)
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}" name="AudioStream">
      <Parameter name="caller" value="${from}" />
      <Parameter name="called" value="${to}" />
      <Parameter name="client_id" value="${client.client_id}" />
      <Parameter name="direction" value="${direction}" />
    </Stream>
  </Connect>
</Response>`;

  console.log(`📄 Generated TwiML`);
  return twiml;
}