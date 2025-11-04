import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook signature and timestamp
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');
    const rawBody = await req.text();

    console.log('Webhook received:', rawBody);

    // Verify webhook signature (Cashfree signature verification)
    if (signature && timestamp) {
      try {
        verifyWebhookSignature(signature, rawBody, timestamp);
        console.log('✅ Webhook signature verified');
      } catch (error) {
        console.error('❌ Webhook signature verification failed:', error);
        throw new Error('Invalid webhook signature');
      }
    }

    const event = JSON.parse(rawBody);
    console.log('Event type:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        await handlePaymentSuccess(supabaseClient, event);
        break;

      case 'PAYMENT_FAILED_WEBHOOK':
        await handlePaymentFailed(supabaseClient, event);
        break;

      case 'SUBSCRIPTION_ACTIVATED':
        await handleSubscriptionActivated(supabaseClient, event);
        break;

      case 'SUBSCRIPTION_PAYMENT_SUCCESS':
        await handleSubscriptionPaymentSuccess(supabaseClient, event);
        break;

      case 'SUBSCRIPTION_PAYMENT_FAILED':
        await handleSubscriptionPaymentFailed(supabaseClient, event);
        break;

      case 'SUBSCRIPTION_CANCELLED':
        await handleSubscriptionCancelled(supabaseClient, event);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function verifyWebhookSignature(signature: string, rawBody: string, timestamp: string) {
  const secret = Deno.env.get('CASHFREE_CLIENT_SECRET') ?? '';
  const signatureData = `${timestamp}${rawBody}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signatureData)
    .digest('base64');

  if (signature !== expectedSignature) {
    throw new Error('Signature mismatch');
  }
}

async function handlePaymentSuccess(supabase: any, event: any) {
  console.log('💰 Payment success:', event.data.order.order_id);

  const orderId = event.data.order.order_id;

  // Update transaction status
  const { data: transaction, error: txError } = await supabase
    .from('payment_transactions')
    .update({
      payment_status: 'SUCCESS',
      cf_transaction_id: event.data.payment.cf_payment_id,
      payment_method: event.data.payment.payment_method,
    })
    .eq('cashfree_order_id', orderId)
    .select()
    .single();

  if (txError) {
    console.error('Error updating transaction:', txError);
    throw txError;
  }

  // Add credits to user account
  if (transaction && transaction.credits_added) {
    console.log(`Adding ${transaction.credits_added} credits to user ${transaction.user_id}`);

    const { error: creditsError } = await supabase.rpc('add_credits', {
      p_user_id: transaction.user_id,
      p_amount: transaction.credits_added,
    });

    if (creditsError) {
      console.error('Error adding credits:', creditsError);
      throw creditsError;
    }

    console.log('✅ Credits added successfully');
  }
}

async function handlePaymentFailed(supabase: any, event: any) {
  console.log('❌ Payment failed:', event.data.order.order_id);

  const orderId = event.data.order.order_id;

  // Update transaction status
  await supabase
    .from('payment_transactions')
    .update({
      payment_status: 'FAILED',
      metadata: { error: event.data.payment.payment_message },
    })
    .eq('cashfree_order_id', orderId);
}

async function handleSubscriptionActivated(supabase: any, event: any) {
  console.log('🎉 Subscription activated:', event.data.subscription.subscription_id);

  const subscriptionId = event.data.subscription.subscription_id;
  const tags = event.data.subscription.subscription_tags || {};
  const client_id = tags.client_id;
  const plan_id = tags.plan_id; // e.g., 'website_500' or 'website_500_yearly'

  console.log('[Webhook] Activating subscription for client:', client_id, 'plan:', plan_id);

  if (!client_id || !plan_id) {
    console.error('[Webhook] Missing client_id or plan_id in subscription tags');
    throw new Error('Missing required subscription tags');
  }

  // Plan details
  const planDetails: Record<string, { minutes: number; cycle_days: number }> = {
    'website_500': { minutes: 500, cycle_days: 30 },
    'phone_500': { minutes: 500, cycle_days: 30 },
    'complete_1000': { minutes: 1000, cycle_days: 30 },
    'website_500_yearly': { minutes: 6000, cycle_days: 365 },
    'phone_500_yearly': { minutes: 6000, cycle_days: 365 },
    'complete_1000_yearly': { minutes: 12000, cycle_days: 365 },
  };

  const plan = planDetails[plan_id];
  if (!plan) {
    console.error('[Webhook] Invalid plan_id:', plan_id);
    throw new Error(`Invalid plan_id: ${plan_id}`);
  }

  // Set billing cycle
  const billingCycleStart = new Date();
  const billingCycleEnd = new Date();
  billingCycleEnd.setDate(billingCycleEnd.getDate() + plan.cycle_days);

  console.log('[Webhook] 🔄 Updating database for client:', client_id);
  console.log('[Webhook] Update values:', {
    paid_plan: true,
    plan_id: plan_id,
    paid_minutes_included: plan.minutes,
    paid_minutes_used: 0,
  });

  // Update voice_ai_clients: Activate paid plan
  const { error, data } = await supabase
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
    .eq('client_id', client_id)
    .select();

  if (error) {
    console.error('[Webhook] ❌ Database update failed:', error);
    throw error;
  }

  console.log('[Webhook] ✅ Subscription activated for client:', client_id);
  console.log('[Webhook] 📊 Updated database record:', data);

  // Also update subscriptions table for tracking
  await supabase
    .from('subscriptions')
    .update({
      status: 'ACTIVE',
      subscription_start_date: new Date().toISOString(),
      next_billing_date: calculateNextBillingDate(new Date()),
    })
    .eq('cf_subscription_id', subscriptionId);
}

async function handleSubscriptionPaymentSuccess(supabase: any, event: any) {
  console.log('💳 Subscription payment success:', event.data.subscription.subscription_id);

  const subscriptionId = event.data.subscription.subscription_id;
  const tags = event.data.subscription.subscription_tags || {};
  const client_id = tags.client_id;
  const plan_id = tags.plan_id;

  console.log('[Webhook] Monthly renewal for client:', client_id);

  if (!client_id) {
    console.error('[Webhook] Missing client_id in subscription tags');
    return;
  }

  // Get current client data
  const { data: client } = await supabase
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', client_id)
    .single();

  if (client) {
    // Reset billing cycle
    const billingCycleStart = new Date();
    const billingCycleEnd = new Date();

    // Determine cycle length based on plan
    const isYearly = plan_id?.includes('yearly');
    billingCycleEnd.setDate(billingCycleEnd.getDate() + (isYearly ? 365 : 30));

    // Reset minutes for new billing cycle
    await supabase
      .from('voice_ai_clients')
      .update({
        paid_minutes_used: 0,
        billing_cycle_start: billingCycleStart.toISOString(),
        billing_cycle_end: billingCycleEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('client_id', client_id);

    // Update subscriptions table
    await supabase
      .from('subscriptions')
      .update({
        next_billing_date: calculateNextBillingDate(new Date()),
      })
      .eq('cf_subscription_id', subscriptionId);

    console.log('✅ Monthly/yearly subscription renewed for client:', client_id);
  }
}

async function handleSubscriptionPaymentFailed(supabase: any, event: any) {
  console.log('❌ Subscription payment failed:', event.data.subscription.subscription_id);

  const cfSubscriptionId = event.data.subscription.cf_subscription_id;

  // You might want to send email notification here
  await supabase
    .from('subscriptions')
    .update({
      status: 'PAYMENT_FAILED',
    })
    .eq('cf_subscription_id', cfSubscriptionId);
}

async function handleSubscriptionCancelled(supabase: any, event: any) {
  console.log('🛑 Subscription cancelled:', event.data.subscription.subscription_id);

  const subscriptionId = event.data.subscription.subscription_id;
  const tags = event.data.subscription.subscription_tags || {};
  const client_id = tags.client_id;

  console.log('[Webhook] Cancelling subscription for client:', client_id);

  if (client_id) {
    // Revert to trial/free plan
    await supabase
      .from('voice_ai_clients')
      .update({
        paid_plan: false,
        plan_id: null,
        paid_minutes_included: 0,
        paid_minutes_used: 0,
        billing_cycle_start: null,
        billing_cycle_end: null,
        updated_at: new Date().toISOString()
      })
      .eq('client_id', client_id);

    console.log('✅ Client reverted to trial plan:', client_id);
  }

  // Update subscriptions table
  await supabase
    .from('subscriptions')
    .update({
      status: 'CANCELLED',
      subscription_end_date: new Date().toISOString(),
    })
    .eq('cf_subscription_id', subscriptionId);
}

function calculateNextBillingDate(currentDate: Date): string {
  const nextDate = new Date(currentDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate.toISOString();
}
