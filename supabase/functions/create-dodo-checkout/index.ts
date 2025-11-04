import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DodoPayments Product IDs
const DODO_PRODUCT_IDS: Record<string, string> = {
  // Monthly plans
  'website_500': 'pdt_ABqx90dGsO2YehkmU2ttv',
  'phone_500': 'pdt_e2IyQOH03s1enigxdDGoE',
  'complete_1000': 'pdt_qZS77xzZNszAlFRgI6633',

  // Yearly plans
  'website_500_yearly': 'pdt_ld4wnP3zQyXjxttRV2Isc',
  'phone_500_yearly': 'pdt_s8K0Jh96YZvJiPGnpwbvV',
  'complete_1000_yearly': 'pdt_rpaQU3uc22UJ0VgrD3ewA'
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
    const { plan_id, user_id } = await req.json();

    console.log('[CreateDodoCheckout] Request:', { plan_id, user_id });

    // Validate inputs
    if (!plan_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get DodoPayments product ID
    const dodoProductId = DODO_PRODUCT_IDS[plan_id];
    if (!dodoProductId) {
      return new Response(
        JSON.stringify({ error: `Invalid plan ID: ${plan_id}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user info
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(user_id);
    if (userError || !user) {
      console.error('[CreateDodoCheckout] User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info for customer name and routing
    const { data: client } = await supabaseClient
      .from('voice_ai_clients')
      .select('business_name, client_id, client_slug')
      .eq('user_id', user_id)
      .single();

    console.log('[CreateDodoCheckout] Creating checkout for product:', dodoProductId);

    // Create checkout session with DodoPayments
    const dodoApiKey = Deno.env.get('DODO_API_TEST_KEY') ?? '';
    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.klariqo.com';

    // Build client-specific return URL
    const clientPath = client?.client_slug ? `/${client.client_slug.replace(/_/g, '/')}` : '';
    const returnUrl = `${appUrl}${clientPath}/billing?payment=success`;

    console.log('[CreateDodoCheckout] Return URL:', returnUrl);

    const checkoutRequest = {
      product_cart: [{
        product_id: dodoProductId,
        quantity: 1
      }],
      customer: {
        email: user.email || `${user_id}@klariqo.com`,
        name: client?.business_name || user.email || 'Customer'
      },
      return_url: returnUrl,
      metadata: {
        user_id: user_id,
        client_id: client?.client_id,
        plan_id: plan_id
      },
      customization: {
        theme: 'dark',                      // Match Klariqo's dark theme
        show_order_details: true,           // Show plan details
        show_on_demand_tag: false           // Hide unnecessary tags
      },
      feature_flags: {
        allow_currency_selection: false,    // USD only
        allow_discount_code: true,          // Allow promo codes
        allow_tax_id: false,                // Don't collect tax ID
        allow_phone_number_collection: false, // Don't collect phone (we have it)
        always_create_new_customer: false
      }
    };

    console.log('[CreateDodoCheckout] DodoPayments API request:', JSON.stringify(checkoutRequest, null, 2));

    // Use test.dodopayments.com for test mode
    const apiUrl = 'https://test.dodopayments.com/checkouts';
    console.log('[CreateDodoCheckout] API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dodoApiKey}`,
      },
      body: JSON.stringify(checkoutRequest),
    });

    const responseData = await response.json();

    console.log('[CreateDodoCheckout] DodoPayments response status:', response.status);
    console.log('[CreateDodoCheckout] DodoPayments response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('[CreateDodoCheckout] DodoPayments error:', responseData);
      throw new Error(`DodoPayments API error: ${JSON.stringify(responseData)}`);
    }

    console.log('[CreateDodoCheckout] ✅ Checkout session created');
    console.log('[CreateDodoCheckout] Checkout URL:', responseData.checkout_url);

    // Return checkout URL for frontend redirect
    return new Response(
      JSON.stringify({
        checkout_url: responseData.checkout_url,
        session_id: responseData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[CreateDodoCheckout] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error creating checkout'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
