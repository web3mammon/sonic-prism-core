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

    // Parse Twilio webhook form data
    const formData = await req.formData();
    const twilioData = {
      messageSid: formData.get('MessageSid') as string,
      accountSid: formData.get('AccountSid') as string,
      from: formData.get('From') as string,
      to: formData.get('To') as string,
      body: formData.get('Body') as string,
      numMedia: formData.get('NumMedia') as string,
    };

    console.log('Received SMS webhook:', twilioData);

    // Find client by phone number (the "To" field is our client's number)
    const { data: client, error: clientError } = await supabaseClient
      .from('voice_ai_clients')
      .select('*')
      .eq('phone_number', twilioData.to)
      .single();

    if (clientError || !client) {
      console.error('Client not found for number:', twilioData.to);
      // Still return 200 to Twilio to avoid retries
      return new Response(getTwiMLResponse(''), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Extract intent from SMS body
    const intent = extractIntent(twilioData.body);
    console.log('Detected intent:', intent);

    // Check if this is a follow-up to a recent call
    const { data: recentCall } = await supabaseClient
      .from('call_sessions')
      .select('*')
      .eq('client_id', client.client_id)
      .eq('caller_number', twilioData.from)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Store SMS in database
    const { error: insertError } = await supabaseClient
      .from('sms_logs')
      .insert({
        client_id: client.client_id,
        phone_number: twilioData.from,
        message_type: intent,
        message_content: twilioData.body,
        status: 'delivered',
        twilio_sid: twilioData.messageSid,
        cost_amount: 0.0075, // Standard SMS cost
        metadata: {
          is_follow_up: !!recentCall,
          related_call_id: recentCall?.id,
          num_media: parseInt(twilioData.numMedia || '0'),
          twilio_account_sid: twilioData.accountSid,
        }
      });

    if (insertError) {
      console.error('Error storing SMS:', insertError);
    }

    // Generate auto-response based on intent
    const responseMessage = generateAutoResponse(intent, client, recentCall);
    
    // If we have a response, send it back via Twilio
    if (responseMessage) {
      // Log the outbound response
      await supabaseClient
        .from('sms_logs')
        .insert({
          client_id: client.client_id,
          phone_number: twilioData.from,
          message_type: 'auto_reply',
          message_content: responseMessage,
          status: 'sent',
          cost_amount: 0.0075,
          metadata: {
            in_reply_to: twilioData.messageSid,
            auto_generated: true,
          }
        });

      return new Response(getTwiMLResponse(responseMessage), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // No response needed - return empty TwiML
    return new Response(getTwiMLResponse(''), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('SMS Handler Error:', error);
    // Return 200 to Twilio even on error to avoid retries
    return new Response(getTwiMLResponse(''), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});

/**
 * Extract intent from SMS message body
 */
function extractIntent(body: string): string {
  const lowerBody = body.toLowerCase();

  // Pricing inquiries
  if (lowerBody.match(/\b(price|cost|how much|quote|estimate|pricing)\b/)) {
    return 'pricing_inquiry';
  }

  // Booking requests
  if (lowerBody.match(/\b(book|schedule|appointment|reserve|availability|available)\b/)) {
    return 'booking_request';
  }

  // Follow-up messages
  if (lowerBody.match(/\b(follow up|following up|earlier|previous|spoke|talked)\b/)) {
    return 'follow_up';
  }

  // Emergency/urgent
  if (lowerBody.match(/\b(emergency|urgent|asap|immediately|now)\b/)) {
    return 'emergency';
  }

  // Confirmation/Yes
  if (lowerBody.match(/\b(yes|confirm|ok|okay|sure|correct)\b/)) {
    return 'confirmation';
  }

  // Cancellation
  if (lowerBody.match(/\b(cancel|no longer|change my mind|don't need)\b/)) {
    return 'cancellation';
  }

  // General inquiry
  return 'custom';
}

/**
 * Generate auto-response based on intent and context
 */
function generateAutoResponse(intent: string, client: any, recentCall: any): string {
  const businessName = client.business_name;

  switch (intent) {
    case 'pricing_inquiry':
      return `Hi! Thanks for your interest in ${businessName}. For accurate pricing, we'd love to discuss your specific needs. Give us a call at ${client.phone_number} or we can call you back!`;

    case 'booking_request':
      return `Great! We'd be happy to schedule an appointment. Please call us at ${client.phone_number} so we can find the perfect time for you, or reply with a few times that work!`;

    case 'emergency':
      return `We've received your urgent message. ${client.call_transfer_enabled ? `Calling our team now at ${client.call_transfer_number}` : `Please call us immediately at ${client.phone_number}`} for emergency assistance!`;

    case 'confirmation':
      if (recentCall) {
        return `Perfect! Your appointment is confirmed. We'll see you then! If anything changes, just let us know. - ${businessName}`;
      }
      return `Thank you for confirming! If you need anything else, feel free to reach out. - ${businessName}`;

    case 'cancellation':
      return `We've noted your cancellation. If you'd like to reschedule in the future, we're here to help. Thank you! - ${businessName}`;

    case 'follow_up':
      if (recentCall) {
        return `Thanks for following up! We have your information from our recent call. How can we help you further? - ${businessName}`;
      }
      return `Hi! Thanks for reaching out to ${businessName}. How can we assist you today?`;

    default:
      // For general messages, acknowledge receipt
      return `Thank you for contacting ${businessName}! We've received your message and will get back to you shortly. For immediate assistance, call ${client.phone_number}.`;
  }
}

/**
 * Generate TwiML response for Twilio
 */
function getTwiMLResponse(message: string): string {
  if (!message) {
    // Empty response - no auto-reply
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
