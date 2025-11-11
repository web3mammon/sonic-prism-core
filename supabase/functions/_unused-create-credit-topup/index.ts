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

    const { calls, currency = 'USD', return_url } = await req.json();

    console.log('[create-credit-topup] Received return_url:', return_url);

    if (!calls || calls < 1) {
      throw new Error('Invalid number of calls');
    }

    // Get pricing for currency
    const { data: pricing, error: pricingError } = await supabaseClient
      .from('pricing_config')
      .select('*')
      .eq('currency', currency)
      .single();

    if (pricingError || !pricing) {
      throw new Error(`No pricing found for currency: ${currency}`);
    }

    // Calculate amount
    const amount = calls * pricing.per_call_price;
    const orderId = `topup_${user.id}_${Date.now()}`;

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Create Cashfree order
    const orderRequest = {
      order_id: orderId,
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: user.id,
        customer_name: profile?.full_name || user.email?.split('@')[0] || 'Customer',
        customer_email: user.email || '',
        customer_phone: profile?.phone_number || '0000000000',
      },
      order_meta: {
        return_url: return_url || `${Deno.env.get('APP_URL')}/billing?payment=success`,
        notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cashfree-webhook`,
        payment_methods: 'cc,dc', // Enable Credit Card and Debit Card
      },
      order_note: `Credit top-up: ${calls} calls`,
    };

    console.log('Creating Cashfree order:', orderRequest);

    const baseUrl = Deno.env.get('CASHFREE_ENVIRONMENT') === 'PRODUCTION'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';

    console.log('Calling Cashfree API:', `${baseUrl}/pg/orders`);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': Deno.env.get('CASHFREE_CLIENT_ID') ?? '',
    });

    const response = await fetch(`${baseUrl}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': Deno.env.get('CASHFREE_CLIENT_ID') ?? '',
        'x-client-secret': Deno.env.get('CASHFREE_CLIENT_SECRET') ?? '',
      },
      body: JSON.stringify(orderRequest),
    });

    const orderData = await response.json();

    console.log('Cashfree response status:', response.status);
    console.log('Cashfree response:', orderData);

    if (!response.ok) {
      console.error('Cashfree error details:', JSON.stringify(orderData, null, 2));
      throw new Error(`Cashfree API error (${response.status}): ${JSON.stringify(orderData)}`);
    }

    console.log('Cashfree order created:', orderData);

    // Save transaction to database
    const { error: dbError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'credit_topup',
        amount: Math.round(amount * 100), // Store as cents
        currency: currency,
        credits_added: calls,
        cashfree_order_id: orderId,
        payment_status: 'PENDING',
        metadata: {
          order_data: orderData,
        },
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save transaction');
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_session_id: orderData.payment_session_id,
        order_id: orderId,
        amount: amount,
        currency: currency,
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
