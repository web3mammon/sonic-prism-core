import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// FlexPrice API configuration
const FLEXPRICE_API_KEY = Deno.env.get('FLEXPRICE_API_KEY');
const FLEXPRICE_BASE_URL = Deno.env.get('FLEXPRICE_BASE_URL') || 'https://api.cloud.flexprice.io/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[GetBillingData] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = user.id;
    console.log('[GetBillingData] Fetching billing data for user:', userId);

    // Fetch FlexPrice data in parallel
    const [walletData, subscriptionData, usageData] = await Promise.all([
      getWalletBalance(userId),
      getSubscription(userId),
      getUsageEvents(userId),
    ]);

    console.log('[GetBillingData] Wallet:', walletData);
    console.log('[GetBillingData] Subscription:', subscriptionData);
    console.log('[GetBillingData] Usage:', usageData);

    // Calculate billing data (with trial logic)
    const billingData = await calculateBillingData(walletData, subscriptionData, usageData, userId, supabaseClient);

    console.log('[GetBillingData] Final billing data:', billingData);

    return new Response(JSON.stringify(billingData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[GetBillingData] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to get wallet balance
async function getWalletBalance(userId: string): Promise<any> {
  try {
    const response = await fetch(
      `${FLEXPRICE_BASE_URL}/wallets?external_customer_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': FLEXPRICE_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      console.error('[GetBillingData] Wallet API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    console.log('[GetBillingData] ✅ Wallet data fetched:', data);
    return data;
  } catch (error) {
    console.error('[GetBillingData] ❌ Error fetching wallet:', error);
    return null;
  }
}

// Helper function to get subscription
async function getSubscription(userId: string): Promise<any> {
  try {
    const response = await fetch(
      `${FLEXPRICE_BASE_URL}/subscriptions?external_customer_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': FLEXPRICE_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      console.error('[GetBillingData] Subscription API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    console.log('[GetBillingData] ✅ Subscription data fetched:', data);
    return data;
  } catch (error) {
    console.error('[GetBillingData] ❌ Error fetching subscription:', error);
    return null;
  }
}

// Helper function to get usage events
async function getUsageEvents(userId: string): Promise<any> {
  try {
    // Calculate current billing period (start of month to now)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startDate = startOfMonth.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const response = await fetch(
      `${FLEXPRICE_BASE_URL}/events/usage?external_customer_id=${userId}&start_date=${startDate}&end_date=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': FLEXPRICE_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      console.error('[GetBillingData] Usage API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    console.log('[GetBillingData] ✅ Usage data fetched:', data);
    return data;
  } catch (error) {
    console.error('[GetBillingData] ❌ Error fetching usage:', error);
    return null;
  }
}

// Helper function to calculate billing data
async function calculateBillingData(walletData: any, subscriptionData: any, usageData: any, userId: string, supabaseClient: any) {
  // Get client data (including per-client credits from database)
  const { data: client } = await supabaseClient
    .from('voice_ai_clients')
    .select('created_at, credits, client_id, channel_type')
    .eq('user_id', userId)
    .single();

  // Extract credits from DATABASE (per-client, not FlexPrice wallet)
  const credits_remaining = client?.credits || 0;

  // Extract subscription plan (FlexPrice - for paid plans)
  let subscription_plan = null;
  let subscription_status = null;
  let next_billing_date = null;

  if (subscriptionData && subscriptionData.data && subscriptionData.data.length > 0) {
    const activeSub = subscriptionData.data.find((sub: any) => sub.status === 'active');
    if (activeSub) {
      subscription_plan = activeSub.plan_id || activeSub.plan?.id || null;
      subscription_status = activeSub.status;
      next_billing_date = activeSub.current_period_end || activeSub.next_billing_date || null;
    }
  }

  let trial_active = false;
  let trial_days_remaining = 0;
  let trial_credits_remaining = credits_remaining;
  let trial_expired_reason = null;

  if (client && !subscription_status) {
    // Only show trial if no active subscription
    const accountAge = Date.now() - new Date(client.created_at).getTime();
    const daysSinceSignup = accountAge / (1000 * 60 * 60 * 24);
    trial_days_remaining = Math.max(0, 3 - Math.floor(daysSinceSignup));

    if (credits_remaining >= 1 && daysSinceSignup <= 3) {
      trial_active = true;
    } else if (credits_remaining < 1) {
      trial_expired_reason = 'credits_exhausted';
    } else if (daysSinceSignup > 3) {
      trial_expired_reason = 'time_expired';
    }
  }

  // Plan to included amounts mapping
  const planIncludes: Record<string, { calls: number; chats: number }> = {
    'phone_only': { calls: 20, chats: 0 },
    'web_only': { calls: 0, chats: 20 },
    'phone_and_web': { calls: 20, chats: 20 },
  };

  const included = subscription_plan && planIncludes[subscription_plan]
    ? planIncludes[subscription_plan]
    : { calls: 0, chats: 0 };

  // Count usage events
  let total_calls = 0;
  let total_chats = 0;

  if (usageData && usageData.data && Array.isArray(usageData.data)) {
    usageData.data.forEach((event: any) => {
      if (event.event_name === 'voice_call') {
        total_calls++;
      } else if (event.event_name === 'web_chat') {
        total_chats++;
      }
    });
  }

  // Calculate overage
  const overage_calls = Math.max(0, total_calls - included.calls);
  const overage_chats = Math.max(0, total_chats - included.chats);

  return {
    // Trial status
    trial_active,
    trial_days_remaining,
    trial_credits_remaining,
    trial_credits_used: 10 - credits_remaining,
    trial_expired_reason,

    // Subscription status
    subscription_plan,
    subscription_status,
    next_billing_date,

    // Usage data
    total_calls,
    total_chats,
    included_calls: included.calls,
    included_chats: included.chats,
    overage_calls,
    overage_chats,

    // Credits (for both trial and paid users)
    credits_remaining,
  };
}
