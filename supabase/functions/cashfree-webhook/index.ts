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

  const cfSubscriptionId = event.data.subscription.cf_subscription_id;

  // Update subscription status
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'ACTIVE',
      subscription_start_date: new Date().toISOString(),
      next_billing_date: calculateNextBillingDate(new Date()),
    })
    .eq('cf_subscription_id', cfSubscriptionId)
    .select()
    .single();

  if (subError) {
    console.error('Error updating subscription:', subError);
    throw subError;
  }

  // Add initial included calls to credits
  if (subscription) {
    console.log(`Adding ${subscription.included_calls} subscription calls to user ${subscription.user_id}`);

    // Update credits table with subscription calls
    const { error: creditsError } = await supabase
      .from('credits')
      .upsert({
        user_id: subscription.user_id,
        calls_included: subscription.included_calls,
        currency: subscription.plan_currency,
        monthly_base_fee: subscription.plan_amount,
      });

    if (creditsError) {
      console.error('Error updating credits:', creditsError);
    } else {
      console.log('✅ Subscription calls added');
    }
  }
}

async function handleSubscriptionPaymentSuccess(supabase: any, event: any) {
  console.log('💳 Subscription payment success:', event.data.subscription.subscription_id);

  const cfSubscriptionId = event.data.subscription.cf_subscription_id;

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('cf_subscription_id', cfSubscriptionId)
    .single();

  if (subscription) {
    // Reset monthly included calls
    await supabase
      .from('credits')
      .update({
        calls_included: subscription.included_calls,
        last_payment_date: new Date().toISOString(),
      })
      .eq('user_id', subscription.user_id);

    // Update next billing date
    await supabase
      .from('subscriptions')
      .update({
        next_billing_date: calculateNextBillingDate(new Date()),
      })
      .eq('cf_subscription_id', cfSubscriptionId);

    console.log('✅ Monthly subscription renewed');
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

  const cfSubscriptionId = event.data.subscription.cf_subscription_id;

  await supabase
    .from('subscriptions')
    .update({
      status: 'CANCELLED',
      subscription_end_date: new Date().toISOString(),
    })
    .eq('cf_subscription_id', cfSubscriptionId);
}

function calculateNextBillingDate(currentDate: Date): string {
  const nextDate = new Date(currentDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate.toISOString();
}
