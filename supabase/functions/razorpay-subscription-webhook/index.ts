import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
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

    // Get webhook body and signature
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    console.log('[RazorpayWebhook] Received webhook');

    // Verify webhook signature
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

    // ⚠️ TEMPORARY: Skip signature verification if secret not configured yet
    // TODO: Remove this once webhook secret is added to Supabase
    if (!webhookSecret || webhookSecret.length === 0) {
      console.warn('[RazorpayWebhook] ⚠️ RAZORPAY_WEBHOOK_SECRET not configured - skipping signature verification (INSECURE!)');
      console.warn('[RazorpayWebhook] ⚠️ Add webhook secret to Supabase vault ASAP!');
      // Continue processing webhook WITHOUT verification (temporary)
    } else {
      // Proper signature verification when secret is configured
      if (!signature) {
        console.error('[RazorpayWebhook] ❌ Missing signature');
        return new Response(
          JSON.stringify({ error: 'Missing webhook signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify signature using HMAC
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const messageData = encoder.encode(body);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const expectedSignature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expectedSignatureHex) {
        console.error('[RazorpayWebhook] ❌ Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[RazorpayWebhook] ✅ Signature verified');
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const event = payload.event;
    const subscriptionData = payload.payload?.subscription?.entity;
    const paymentData = payload.payload?.payment?.entity;

    console.log('[RazorpayWebhook] Event type:', event);

    // Handle different webhook events
    switch (event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(supabaseClient, subscriptionData);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(supabaseClient, subscriptionData, paymentData);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(supabaseClient, subscriptionData);
        break;

      case 'subscription.paused':
        console.log('[RazorpayWebhook] Subscription paused:', subscriptionData?.id);
        // Could implement pause logic if needed
        break;

      case 'subscription.resumed':
        console.log('[RazorpayWebhook] Subscription resumed:', subscriptionData?.id);
        // Could implement resume logic if needed
        break;

      default:
        console.log('[RazorpayWebhook] Unhandled event:', event);
    }

    // Return 200 OK to acknowledge webhook
    return new Response(
      JSON.stringify({ received: true, event: event }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[RazorpayWebhook] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown webhook error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Handler: Subscription activated (first payment successful)
async function handleSubscriptionActivated(supabaseClient: any, subscription: any) {
  console.log('[Webhook] Processing subscription.activated:', subscription.id);

  const client_id = subscription.notes?.client_id;
  const plan_id = subscription.notes?.plan_id;

  if (!client_id || !plan_id) {
    console.error('[Webhook] Missing client_id or plan_id in subscription notes');
    return;
  }

  // Determine plan details
  const planDetails: Record<string, { minutes: number; cycle_days: number }> = {
    // Monthly plans
    'website_500': { minutes: 500, cycle_days: 30 },
    'phone_500': { minutes: 500, cycle_days: 30 },
    'complete_1000': { minutes: 1000, cycle_days: 30 },
    // Yearly plans
    'website_500_yearly': { minutes: 6000, cycle_days: 365 },
    'phone_500_yearly': { minutes: 6000, cycle_days: 365 },
    'complete_1000_yearly': { minutes: 12000, cycle_days: 365 }
  };

  const plan = planDetails[plan_id];
  if (!plan) {
    console.error('[Webhook] Invalid plan_id:', plan_id);
    return;
  }

  // Set billing cycle
  const billingCycleStart = new Date();
  const billingCycleEnd = new Date();
  billingCycleEnd.setDate(billingCycleEnd.getDate() + plan.cycle_days);

  // Update database: Activate paid plan
  const { error } = await supabaseClient
    .from('voice_ai_clients')
    .update({
      paid_plan: true,
      plan_id: plan_id,
      paid_minutes_included: plan.minutes,
      paid_minutes_used: 0,
      billing_cycle_start: billingCycleStart.toISOString(),
      billing_cycle_end: billingCycleEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('client_id', client_id);

  if (error) {
    console.error('[Webhook] Database update failed:', error);
    throw error;
  }

  console.log('[Webhook] ✅ Subscription activated for client:', client_id);
}

// Handler: Subscription charged (recurring payment)
async function handleSubscriptionCharged(supabaseClient: any, subscription: any, payment: any) {
  console.log('[Webhook] Processing subscription.charged:', subscription.id);

  const client_id = subscription.notes?.client_id;
  const plan_id = subscription.notes?.plan_id;

  if (!client_id || !plan_id) {
    console.error('[Webhook] Missing client_id or plan_id in subscription notes');
    return;
  }

  // Determine plan details
  const planDetails: Record<string, { minutes: number; cycle_days: number }> = {
    // Monthly plans
    'website_500': { minutes: 500, cycle_days: 30 },
    'phone_500': { minutes: 500, cycle_days: 30 },
    'complete_1000': { minutes: 1000, cycle_days: 30 },
    // Yearly plans
    'website_500_yearly': { minutes: 6000, cycle_days: 365 },
    'phone_500_yearly': { minutes: 6000, cycle_days: 365 },
    'complete_1000_yearly': { minutes: 12000, cycle_days: 365 }
  };

  const plan = planDetails[plan_id];
  if (!plan) {
    console.error('[Webhook] Invalid plan_id:', plan_id);
    return;
  }

  // Reset billing cycle (new month/year)
  const billingCycleStart = new Date();
  const billingCycleEnd = new Date();
  billingCycleEnd.setDate(billingCycleEnd.getDate() + plan.cycle_days);

  // Update database: Reset minutes for new cycle
  const { error } = await supabaseClient
    .from('voice_ai_clients')
    .update({
      paid_minutes_used: 0, // RESET USAGE
      paid_minutes_included: plan.minutes,
      billing_cycle_start: billingCycleStart.toISOString(),
      billing_cycle_end: billingCycleEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('client_id', client_id);

  if (error) {
    console.error('[Webhook] Database update failed:', error);
    throw error;
  }

  console.log('[Webhook] ✅ Subscription renewed for client:', client_id);
  console.log('[Webhook] New billing cycle:', billingCycleStart, 'to', billingCycleEnd);
}

// Handler: Subscription cancelled
async function handleSubscriptionCancelled(supabaseClient: any, subscription: any) {
  console.log('[Webhook] Processing subscription.cancelled:', subscription.id);

  const client_id = subscription.notes?.client_id;

  if (!client_id) {
    console.error('[Webhook] Missing client_id in subscription notes');
    return;
  }

  // Update database: Downgrade to trial
  const { error } = await supabaseClient
    .from('voice_ai_clients')
    .update({
      paid_plan: false, // Back to trial/free tier
      plan_id: null,
      paid_minutes_included: 0,
      paid_minutes_used: 0,
      updated_at: new Date().toISOString()
    })
    .eq('client_id', client_id);

  if (error) {
    console.error('[Webhook] Database update failed:', error);
    throw error;
  }

  console.log('[Webhook] ✅ Subscription cancelled for client:', client_id);
}
