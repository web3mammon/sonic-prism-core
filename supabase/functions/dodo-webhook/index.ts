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

    // Get webhook payload
    const payload = await req.json();
    const eventType = payload.type; // DodoPayments uses 'type' not 'event'

    console.log('[DodoWebhook] Received event:', eventType);
    console.log('[DodoWebhook] Payload:', JSON.stringify(payload, null, 2));

    // Handle different subscription events
    switch (eventType) {
      case 'subscription.active': {
        // New subscription activated - store customer_id mapping and set paid plan
        const subscriptionData = payload.data;
        const customer = subscriptionData.customer;

        console.log('[DodoWebhook] Subscription created:', subscriptionData.subscription_id);
        console.log('[DodoWebhook] Customer:', customer.customer_id, customer.email);

        // Get user_id and plan_id from metadata
        const userId = subscriptionData.metadata?.user_id;
        const planId = subscriptionData.metadata?.plan_id;

        if (!userId) {
          console.error('[DodoWebhook] No user_id in metadata');
          break;
        }

        // Calculate paid_minutes_included and billing cycle based on plan_id
        let paid_minutes_included = 0;
        let billing_cycle_days = 30;

        if (planId?.includes('_yearly')) {
          billing_cycle_days = 365;
          paid_minutes_included = planId.includes('complete') ? 12000 : 6000;
        } else {
          paid_minutes_included = planId?.includes('complete') ? 1000 : 500;
        }

        const billing_cycle_start = new Date().toISOString();
        const billing_cycle_end = new Date(Date.now() + billing_cycle_days * 24 * 60 * 60 * 1000).toISOString();

        console.log('[DodoWebhook] Plan details:', {
          planId,
          paid_minutes_included,
          billing_cycle_days,
          billing_cycle_start,
          billing_cycle_end
        });

        // Update client with all subscription and payment fields
        const { error: updateError } = await supabaseClient
          .from('voice_ai_clients')
          .update({
            // DodoPayments IDs
            dodo_customer_id: customer.customer_id,
            subscription_dodo_id: subscriptionData.subscription_id,
            subscription_status: 'active',

            // Paid plan activation
            paid_plan: true,
            plan_id: planId,
            paid_minutes_included: paid_minutes_included,
            paid_minutes_used: 0, // Reset usage for new subscription

            // Billing cycle
            billing_cycle_start: billing_cycle_start,
            billing_cycle_end: billing_cycle_end,

            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[DodoWebhook] Failed to update client:', updateError);
        } else {
          console.log('[DodoWebhook] ✅ Client updated with paid plan and dodo_customer_id');
        }
        break;
      }

      case 'subscription.renewed': {
        // Subscription renewed successfully - reset billing cycle and minutes
        const subscriptionData = payload.data;

        console.log('[DodoWebhook] Subscription renewed:', subscriptionData.subscription_id);

        // Get plan_id to calculate new billing cycle
        const planId = subscriptionData.metadata?.plan_id;
        let paid_minutes_included = 0;
        let billing_cycle_days = 30;

        if (planId?.includes('_yearly')) {
          billing_cycle_days = 365;
          paid_minutes_included = planId.includes('complete') ? 12000 : 6000;
        } else {
          paid_minutes_included = planId?.includes('complete') ? 1000 : 500;
        }

        const billing_cycle_start = new Date().toISOString();
        const billing_cycle_end = new Date(Date.now() + billing_cycle_days * 24 * 60 * 60 * 1000).toISOString();

        // Update subscription status and reset billing cycle
        const { error: updateError } = await supabaseClient
          .from('voice_ai_clients')
          .update({
            subscription_status: 'active',
            paid_minutes_used: 0, // Reset usage for new billing period
            billing_cycle_start: billing_cycle_start,
            billing_cycle_end: billing_cycle_end,
            updated_at: new Date().toISOString()
          })
          .eq('subscription_dodo_id', subscriptionData.subscription_id);

        if (updateError) {
          console.error('[DodoWebhook] Failed to update renewal:', updateError);
        } else {
          console.log('[DodoWebhook] ✅ Subscription renewed with new billing cycle');
        }
        break;
      }

      case 'subscription.cancelled': {
        // Subscription cancelled
        const subscriptionData = payload.data;

        console.log('[DodoWebhook] Subscription cancelled:', subscriptionData.subscription_id);

        // Update subscription status
        const { error: updateError } = await supabaseClient
          .from('voice_ai_clients')
          .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('subscription_dodo_id', subscriptionData.subscription_id);

        if (updateError) {
          console.error('[DodoWebhook] Failed to update cancellation:', updateError);
        } else {
          console.log('[DodoWebhook] ✅ Subscription canceled');
        }
        break;
      }

      case 'subscription.failed': {
        // Payment failed - subscription failed
        const subscriptionData = payload.data;

        console.log('[DodoWebhook] Subscription failed:', subscriptionData.subscription_id);

        // Update subscription status
        const { error: updateError } = await supabaseClient
          .from('voice_ai_clients')
          .update({
            subscription_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('subscription_dodo_id', subscriptionData.subscription_id);

        if (updateError) {
          console.error('[DodoWebhook] Failed to update failed status:', updateError);
        } else {
          console.log('[DodoWebhook] ✅ Subscription marked failed');
        }
        break;
      }

      default:
        console.log('[DodoWebhook] Unhandled event type:', eventType);
    }

    // Return 200 to acknowledge webhook
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[DodoWebhook] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error processing webhook'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
