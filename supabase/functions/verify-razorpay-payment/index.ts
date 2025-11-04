import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FLEXPRICE_API_KEY = Deno.env.get('FLEXPRICE_API_KEY') ?? '';
const FLEXPRICE_BASE_URL = 'https://api.flexprice.io/v1';

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
    const {
      order_id,
      payment_id,
      razorpay_signature,
      plan_id,
      user_id,
      client_id
    } = await req.json();

    console.log('[VerifyPayment] Request:', { order_id, payment_id, plan_id, user_id, client_id });

    // Validate inputs
    if (!order_id || !payment_id || !razorpay_signature || !plan_id || !user_id || !client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment signature
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
    const signString = `${order_id}|${payment_id}`;

    // Use Web Crypto API for HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keySecret);
    const messageData = encoder.encode(signString);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('[VerifyPayment] Signature verification:', {
      provided: razorpay_signature,
      expected: expectedSignature,
      match: razorpay_signature === expectedSignature
    });

    // Verify signature (Razorpay SDK integration complete)
    if (razorpay_signature !== expectedSignature) {
      console.error('[VerifyPayment] ❌ Signature mismatch - payment verification failed');
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[VerifyPayment] ✅ Signature verified successfully');

    // Determine plan details (monthly + yearly)
    const planDetails: Record<string, { minutes: number; price: number; cycle_days: number }> = {
      // Monthly plans
      'website_500': { minutes: 500, price: 99, cycle_days: 30 },
      'phone_500': { minutes: 500, price: 129, cycle_days: 30 },
      'complete_1000': { minutes: 1000, price: 179, cycle_days: 30 },
      // Yearly plans (10 months price, 12 months minutes)
      'website_500_yearly': { minutes: 6000, price: 990, cycle_days: 365 },
      'phone_500_yearly': { minutes: 6000, price: 1290, cycle_days: 365 },
      'complete_1000_yearly': { minutes: 12000, price: 1790, cycle_days: 365 }
    };

    const plan = planDetails[plan_id];
    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update database: Set user to paid plan
    const billingCycleStart = new Date();
    const billingCycleEnd = new Date();
    billingCycleEnd.setDate(billingCycleEnd.getDate() + plan.cycle_days); // 30 or 365 days

    const { error: updateError } = await supabaseClient
      .from('voice_ai_clients')
      .update({
        paid_plan: true,
        plan_id: plan_id,  // Store the plan_id (e.g., 'website_500_yearly')
        paid_minutes_included: plan.minutes,
        paid_minutes_used: 0,
        billing_cycle_start: billingCycleStart.toISOString(),
        billing_cycle_end: billingCycleEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('client_id', client_id);

    if (updateError) {
      console.error('[VerifyPayment] ❌ Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[VerifyPayment] ✅ Database updated: paid_plan = TRUE');

    // Create FlexPrice subscription
    try {
      console.log('[VerifyPayment] Creating FlexPrice subscription...');

      const flexpriceResponse = await fetch(`${FLEXPRICE_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': FLEXPRICE_API_KEY
        },
        body: JSON.stringify({
          external_customer_id: user_id,
          plan_id: plan_id,
          start_date: billingCycleStart.toISOString().split('T')[0] // YYYY-MM-DD
        })
      });

      if (!flexpriceResponse.ok) {
        const errorText = await flexpriceResponse.text();
        console.error('[VerifyPayment] FlexPrice subscription creation failed:', errorText);
        // Don't fail the whole payment if FlexPrice fails
      } else {
        const flexpriceData = await flexpriceResponse.json();
        console.log('[VerifyPayment] ✅ FlexPrice subscription created:', flexpriceData);
      }
    } catch (flexpriceError) {
      console.error('[VerifyPayment] FlexPrice error (non-fatal):', flexpriceError);
      // Continue even if FlexPrice fails
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and subscription activated',
        plan_id: plan_id,
        minutes_included: plan.minutes,
        billing_cycle_end: billingCycleEnd.toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[VerifyPayment] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error verifying payment'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
