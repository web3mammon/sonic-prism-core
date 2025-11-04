import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Razorpay from "npm:razorpay@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IMPORTANT: These are TEST plan IDs - will be replaced with PRODUCTION IDs before launch
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  // Monthly plans
  'website_500': 'plan_RbUyZLapDalVzP',
  'phone_500': 'plan_RbUyieKIBJfARO',
  'complete_1000': 'plan_RbUyzIwReFnHDR', // NOTE: Named complete_500 in Razorpay, but we call it complete_1000

  // Yearly plans
  'website_500_yearly': 'plan_RbUzShTCLTWmoA',
  'phone_500_yearly': 'plan_RbUzIvw0z85k2h',
  'complete_1000_yearly': 'plan_RbUz8Dn5bPjInL' // NOTE: Named complete_500_yearly in Razorpay
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

    // Get request body
    const { plan_id, user_id, client_id, user_email, business_name } = await req.json();

    console.log('[CreateSubscription] Request:', { plan_id, user_id, client_id });

    // Validate inputs
    if (!plan_id || !user_id || !client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id, user_id, client_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Razorpay plan ID
    const razorpayPlanId = RAZORPAY_PLAN_IDS[plan_id];
    if (!razorpayPlanId) {
      return new Response(
        JSON.stringify({ error: `Invalid plan ID: ${plan_id}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
    });

    console.log('[CreateSubscription] Creating Razorpay subscription with plan:', razorpayPlanId);

    // Create subscription
    const subscriptionOptions = {
      plan_id: razorpayPlanId,
      customer_notify: 1, // Send email to customer
      total_count: 12, // For yearly: 1 payment, for monthly: 12 payments (1 year)
      quantity: 1,
      notes: {
        plan_id: plan_id, // Our internal plan_id (e.g., 'website_500_yearly')
        user_id: user_id,
        client_id: client_id,
        business_name: business_name || 'N/A'
      }
    };

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    console.log('[CreateSubscription] ✅ Subscription created:', subscription.id);
    console.log('[CreateSubscription] Short URL:', subscription.short_url);

    // Return subscription details (including short_url for payment)
    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        plan_id: plan_id,
        razorpay_plan_id: razorpayPlanId,
        short_url: subscription.short_url, // Razorpay hosted payment page
        status: subscription.status, // 'created'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[CreateSubscription] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error creating subscription'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
