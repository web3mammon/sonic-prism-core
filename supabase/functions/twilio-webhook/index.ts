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

  // Find the client by Twilio provisioned number based on call direction
  // INBOUND: client's twilio_number = To (our number that was called)
  // OUTBOUND: client's twilio_number = From (our number making the call)
  const lookupNumber = direction === 'outbound-api' ? from : to;
  console.log(`Looking up client by Twilio number: ${lookupNumber}`);

  const { data: client } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('twilio_number', lookupNumber)
    .single();

  if (!client) {
    console.error(`No client found for Twilio number: ${lookupNumber} (direction: ${direction})`);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }

  console.log(`✅ Client found: ${client.business_name} (${client.client_id})`);

  // ========================================
  // ENFORCEMENT: Check trial limits (Nov 1, 2025)
  // ========================================
  const hasMinuteTracking = client.trial_minutes !== undefined && client.trial_minutes !== null;

  if (hasMinuteTracking && !client.paid_plan) {
    // Trial user - check if limit exceeded
    const minutesUsed = client.trial_minutes_used || 0;
    const minutesTotal = client.trial_minutes || 30;

    if (minutesUsed >= minutesTotal) {
      console.warn(`[BLOCKED] 🚫 Trial exhausted for ${client.client_id}: ${minutesUsed}/${minutesTotal} minutes used`);

      const blockTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Your trial has ended. Please upgrade to continue. Visit app dot klariqo dot com to choose a plan. Thank you!</Say>
  <Hangup/>
</Response>`;

      return new Response(blockTwiML, {
        headers: { 'Content-Type': 'text/xml' }
      });
    } else {
      const remaining = minutesTotal - minutesUsed;
      console.log(`[Trial] ✅ ${client.client_id} has ${remaining} minutes remaining (${minutesUsed}/${minutesTotal} used)`);
    }
  } else if (hasMinuteTracking && client.paid_plan) {
    // Paid user - allow call, overage tracked separately
    const minutesUsed = client.paid_minutes_used || 0;
    const minutesIncluded = client.paid_minutes_included || 0;
    const overage = Math.max(0, minutesUsed - minutesIncluded);

    if (overage > 0) {
      console.log(`[Paid] ⚠️ ${client.client_id} in overage: ${overage} minutes over ${minutesIncluded} included`);
    } else {
      console.log(`[Paid] ✅ ${client.client_id} within limits: ${minutesUsed}/${minutesIncluded} minutes used`);
    }
  }

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

  console.log('[Status] ========================================');
  console.log('[Status] Webhook received:', params);

  const callSid = params.CallSid as string;
  const callStatus = params.CallStatus as string;
  const callDuration = params.CallDuration as string;
  const timestamp = params.Timestamp as string;

  if (!callSid) {
    console.error('[Status] ❌ Missing CallSid in status webhook');
    return new Response('Missing CallSid', { status: 400 });
  }

  // Check if call session exists
  const { data: existingSession, error: lookupError } = await supabase
    .from('call_sessions')
    .select('id, status')
    .eq('call_sid', callSid)
    .maybeSingle();

  if (lookupError) {
    console.error('[Status] Database lookup error:', lookupError);
  }

  if (!existingSession) {
    console.warn(`[Status] ⚠️ No call session found for SID: ${callSid} - call may have been created outside our system`);
    // Don't fail - Twilio will retry if we return error
    return new Response('OK - Session not found', { status: 200 });
  }

  console.log(`[Status] Found session ${existingSession.id} with current status: ${existingSession.status}`);

  // Update call session
  const updateData: any = {
    status: mapTwilioStatus(callStatus),
    updated_at: new Date().toISOString()
  };

  if (callStatus === 'completed' && callDuration) {
    const durationSeconds = parseInt(callDuration);
    updateData.duration_seconds = durationSeconds;
    updateData.end_time = new Date().toISOString();

    // Calculate cost: $2.00 flat per completed call (regardless of duration)
    // This matches our marketing and business model
    updateData.cost_amount = 2.00;

    console.log(`[Status] Call completed - Duration: ${durationSeconds}s, Cost: $${updateData.cost_amount}`);
  }

  const { error: updateError } = await supabase
    .from('call_sessions')
    .update(updateData)
    .eq('call_sid', callSid);

  if (updateError) {
    console.error('[Status] ❌ Error updating call session:', updateError);
    return new Response('Database update failed', { status: 500 });
  }

  console.log(`[Status] ✅ Successfully updated call ${callSid} to status: ${updateData.status}`);
  console.log('[Status] ========================================');

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