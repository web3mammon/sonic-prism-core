import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Razorpay from "npm:razorpay@2";

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

    // Get request body
    const { plan_id, currency, user_id, client_id } = await req.json();

    console.log('[CreateOrder] Request:', { plan_id, currency, user_id, client_id });

    // Validate inputs
    if (!plan_id || !currency || !user_id || !client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine pricing server-side (SECURITY: Don't trust client)
    const planPricing: Record<string, number> = {
      // Monthly plans (in dollars)
      'website_500': 99,
      'phone_500': 129,
      'complete_1000': 179,
      // Yearly plans (10 months price)
      'website_500_yearly': 990,
      'phone_500_yearly': 1290,
      'complete_1000_yearly': 1790
    };

    const priceUSD = planPricing[plan_id];
    if (!priceUSD) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to cents/paise (multiply by 100)
    const amount = priceUSD * 100;

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
    });

    // Generate unique receipt
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create order
    const options = {
      amount: amount, // Amount in paise/cents (calculated server-side)
      currency: currency,
      receipt: receipt,
      notes: {
        plan_id: plan_id,
        user_id: user_id,
        client_id: client_id
      }
    };

    console.log('[CreateOrder] Creating Razorpay order with options:', options);

    const order = await razorpay.orders.create(options);

    console.log('[CreateOrder] ✅ Order created successfully:', order.id);

    // Return order details
    return new Response(
      JSON.stringify({
        order_id: order.id,
        currency: order.currency,
        amount: order.amount,
        receipt: order.receipt
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[CreateOrder] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error creating order'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
