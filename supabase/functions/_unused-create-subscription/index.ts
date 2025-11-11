import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { currency = 'USD', return_url } = await req.json();

    // Get pricing for currency
    const { data: pricing, error: pricingError } = await supabaseClient
      .from('pricing_config')
      .select('*')
      .eq('currency', currency)
      .single();

    if (pricingError || !pricing) {
      throw new Error(`No pricing found for currency: ${currency}`);
    }

    // Get user profile for customer details
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const subscriptionId = `sub_${user.id}_${Date.now()}`;

    // Create Cashfree subscription
    const subscriptionRequest = {
      subscription_id: subscriptionId,
      customer_details: {
        customer_name: profile?.full_name || user.email?.split('@')[0] || 'Customer',
        customer_email: user.email || '',
        customer_phone: profile?.phone_number || '0000000000',
      },
      plan_details: {
        plan_type: 'PERIODIC',
        plan_interval_type: 'MONTH',
        plan_intervals: 1,
        plan_amount: pricing.base_price,
        plan_currency: currency,
        plan_max_cycles: 0, // Unlimited
      },
      authorization_details: {
        authorization_amount: pricing.base_price,
        payment_methods: ['card', 'upi'],
      },
      subscription_meta: {
        return_url: return_url || `${Deno.env.get('APP_URL')}/billing`,
        notification_channel: ['EMAIL'],
      },
    };

    console.log('Creating Cashfree subscription:', subscriptionRequest);

    // Call Cashfree API directly (no SDK needed for edge functions)
    const baseUrl = Deno.env.get('CASHFREE_ENVIRONMENT') === 'PRODUCTION'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';

    const response = await fetch(`${baseUrl}/pg/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
        'x-client-id': Deno.env.get('CASHFREE_CLIENT_ID') ?? '',
        'x-client-secret': Deno.env.get('CASHFREE_CLIENT_SECRET') ?? '',
      },
      body: JSON.stringify(subscriptionRequest),
    });

    const subscriptionData = await response.json();

    if (!response.ok) {
      console.error('Cashfree error:', subscriptionData);
      throw new Error(`Cashfree error: ${subscriptionData.message || 'Unknown error'}`);
    }

    console.log('Cashfree subscription created:', subscriptionData);

    // Save subscription to database
    const { error: dbError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: user.id,
        subscription_id: subscriptionId,
        cf_subscription_id: subscriptionData.cf_subscription_id,
        cf_plan_id: subscriptionData.plan_id,
        status: 'INITIALISED',
        plan_amount: pricing.base_price,
        plan_currency: currency,
        included_calls: pricing.base_calls,
        authorization_url: subscriptionData.authorization_details?.authorization_url,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save subscription');
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: subscriptionData.authorization_details?.authorization_url,
        subscription_id: subscriptionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
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
