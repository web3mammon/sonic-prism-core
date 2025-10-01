import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, clientId, phoneNumber, message, messageType, ...data } = await req.json();

    switch (action) {
      case 'send_sms':
        return await sendSMS(supabaseClient, clientId, phoneNumber, message, messageType);
      
      case 'send_payment_link':
        return await sendPaymentLink(supabaseClient, clientId, phoneNumber, data.amount, data.description);
      
      case 'send_appointment_confirmation':
        return await sendAppointmentConfirmation(supabaseClient, clientId, phoneNumber, data.appointmentDetails);
      
      case 'send_follow_up':
        return await sendFollowUp(supabaseClient, clientId, phoneNumber, data.followUpType);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('SMS Manager Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendSMS(supabase: any, clientId: string, phoneNumber: string, message: string, messageType: string) {
  // Get client configuration
  const { data: client, error: clientError } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (clientError || !client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  if (!client.phone_number) {
    throw new Error(`No phone number assigned to client: ${clientId}`);
  }

  // Send SMS via Twilio
  const twilioResponse = await sendTwilioSMS(client.phone_number, phoneNumber, message);

  // Log SMS in database
  const { error: logError } = await supabase
    .from('sms_logs')
    .insert({
      client_id: clientId,
      phone_number: phoneNumber,
      message_type: messageType || 'custom',
      message_content: message,
      status: twilioResponse.status,
      twilio_sid: twilioResponse.sid,
      cost_amount: 0.0075, // Example SMS cost
      metadata: {
        twilio_response: twilioResponse
      }
    });

  if (logError) {
    console.error('Error logging SMS:', logError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'SMS sent successfully',
      sid: twilioResponse.sid,
      status: twilioResponse.status
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendPaymentLink(supabase: any, clientId: string, phoneNumber: string, amount: number, description: string) {
  // Get client configuration
  const { data: client } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', clientId)
    .single();

  // Generate payment link (this would integrate with Stripe, Square, etc.)
  const paymentLink = `https://pay.${client.business_name.toLowerCase().replace(/\s+/g, '')}.com/pay/${Date.now()}`;
  
  const message = `Hi! Here's your payment link for ${description}: ${paymentLink} Amount: $${amount}. Thank you! - ${client.business_name}`;

  return await sendSMS(supabase, clientId, phoneNumber, message, 'payment_link');
}

async function sendAppointmentConfirmation(supabase: any, clientId: string, phoneNumber: string, appointmentDetails: any) {
  const { data: client } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', clientId)
    .single();

  const { date, time, service, address } = appointmentDetails;
  
  const message = `Appointment Confirmed! 📅
Date: ${date}
Time: ${time}
Service: ${service}
Location: ${address}

See you then! - ${client.business_name}`;

  return await sendSMS(supabase, clientId, phoneNumber, message, 'appointment');
}

async function sendFollowUp(supabase: any, clientId: string, phoneNumber: string, followUpType: string) {
  const { data: client } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', clientId)
    .single();

  let message = '';

  switch (followUpType) {
    case 'satisfaction':
      message = `Hi! How was our service? We'd love to hear your feedback. Reply or call us anytime! - ${client.business_name}`;
      break;
    case 'maintenance_reminder':
      message = `Reminder: It's time for your scheduled maintenance check. Call us to book your appointment! - ${client.business_name}`;
      break;
    case 'quote_follow_up':
      message = `Hi! Just following up on the quote we provided. Do you have any questions? We're here to help! - ${client.business_name}`;
      break;
    default:
      message = `Thank you for choosing ${client.business_name}! We appreciate your business. Call us if you need anything!`;
  }

  return await sendSMS(supabase, clientId, phoneNumber, message, 'follow_up');
}

async function sendTwilioSMS(from: string, to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  const credentials = btoa(`${accountSid}:${authToken}`);
  
  const body = new URLSearchParams();
  body.append('From', from);
  body.append('To', to);
  body.append('Body', message);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Twilio SMS API error: ${response.statusText} - ${errorData}`);
  }

  const data = await response.json();
  
  return {
    sid: data.sid,
    status: data.status === 'queued' || data.status === 'sent' ? 'sent' : 'failed'
  };
}