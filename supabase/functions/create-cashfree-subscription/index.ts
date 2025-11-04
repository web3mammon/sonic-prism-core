import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cashfree Plan IDs (User created these in dashboard)
const CASHFREE_PLAN_IDS: Record<string, string> = {
  // Monthly plans
  'website_500': 'website_500',
  'phone_500': 'phone_500',
  'complete_1000': 'complete_1000',

  // Yearly plans
  'website_500_yearly': 'website_500_yearly',
  'phone_500_yearly': 'phone_500_yearly',
  'complete_1000_yearly': 'complete_1000_yearly'
};

// Plan details for minute allocation
const PLAN_DETAILS: Record<string, { minutes: number; cycle_days: number }> = {
  'website_500': { minutes: 500, cycle_days: 30 },
  'phone_500': { minutes: 500, cycle_days: 30 },
  'complete_1000': { minutes: 1000, cycle_days: 30 },
  'website_500_yearly': { minutes: 6000, cycle_days: 365 },
  'phone_500_yearly': { minutes: 6000, cycle_days: 365 },
  'complete_1000_yearly': { minutes: 12000, cycle_days: 365 },
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
    const { plan_id, user_id, client_id, user_email, customer_name, business_name } = await req.json();

    console.log('[CreateSubscription] Request:', { plan_id, user_id, client_id, customer_name });

    // Validate inputs
    if (!plan_id || !user_id || !client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id, user_id, client_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Cashfree plan ID
    const cashfreePlanId = CASHFREE_PLAN_IDS[plan_id];
    if (!cashfreePlanId) {
      return new Response(
        JSON.stringify({ error: `Invalid plan ID: ${plan_id}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan details for metadata
    const planDetails = PLAN_DETAILS[plan_id];

    console.log('[CreateSubscription] Creating Cashfree subscription with plan:', cashfreePlanId);

    // Create Cashfree subscription
    const subscriptionId = `sub_${client_id}_${Date.now()}`;

    // Latest Subscriptions API (2025-01-01)
    const baseUrl = Deno.env.get('CASHFREE_ENVIRONMENT') === 'PRODUCTION'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';

    // Cashfree Subscription API request (2025-01-01 format)
    const subscriptionRequest = {
      subscription_id: subscriptionId,
      customer_details: {
        customer_email: user_email || `${user_id}@klariqo.com`,
        customer_phone: '9999999999', // Placeholder - required field
        customer_name: customer_name || 'Customer', // Use actual cardholder name
      },
      plan_details: {
        plan_id: cashfreePlanId, // Reference to pre-created plan in dashboard
      },
      subscription_meta: {
        return_url: `${Deno.env.get('APP_URL')}/billing?payment=success`,
        notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cashfree-webhook`,
      },
      subscription_note: `${plan_id} subscription for ${business_name}`,
    };

    console.log('[CreateSubscription] Cashfree API request:', JSON.stringify(subscriptionRequest, null, 2));

    // Payment Gateway (subscriptions) API doesn't use X-Cf-Signature
    // Only standard authentication with x-client-id and x-client-secret
    const clientId = Deno.env.get('CASHFREE_TEST_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('CASHFREE_TEST_CLIENT_SECRET') ?? '';

    console.log('[CreateSubscription] Using client ID:', clientId);
    console.log('[CreateSubscription] Client secret available:', !!clientSecret);
    console.log('[CreateSubscription] Base URL:', baseUrl);
    const apiUrl = `${baseUrl}/pg/subscriptions`;
    console.log('[CreateSubscription] Full URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
      },
      body: JSON.stringify(subscriptionRequest),
    });

    const responseData = await response.json();

    console.log('[CreateSubscription] Cashfree response status:', response.status);
    console.log('[CreateSubscription] Cashfree response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('[CreateSubscription] Cashfree error:', responseData);
      throw new Error(`Cashfree API error: ${JSON.stringify(responseData)}`);
    }

    console.log('[CreateSubscription] ✅ Subscription created:', subscriptionId);
    console.log('[CreateSubscription] Subscription session ID:', responseData.subscription_session_id);
    console.log('[CreateSubscription] CF Subscription ID:', responseData.cf_subscription_id);

    // Save subscription metadata to database (for tracking)
    const { error: dbError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user_id,
        plan_name: plan_id,
        plan_amount: responseData.plan_details?.plan_max_amount || 0,
        plan_currency: responseData.plan_details?.plan_currency || 'INR',
        subscription_status: responseData.subscription_status || 'CREATED',
        cf_subscription_id: responseData.cf_subscription_id,
        included_calls: planDetails.minutes,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.warn('[CreateSubscription] Failed to save to subscriptions table:', dbError);
      // Don't fail the request - webhook will handle activation
    }

    // Return subscription session ID for frontend (this is used like payment_session_id)
    return new Response(
      JSON.stringify({
        subscription_id: subscriptionId,
        cf_subscription_id: responseData.cf_subscription_id,
        plan_id: plan_id,
        cashfree_plan_id: cashfreePlanId,
        payment_session_id: responseData.subscription_session_id, // Frontend expects this name
        subscription_session_id: responseData.subscription_session_id,
        status: responseData.subscription_status,
        authorization_url: responseData.authorisation_details?.authorization_url,
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
