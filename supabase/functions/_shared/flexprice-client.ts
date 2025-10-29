/**
 * FlexPrice API Client Configuration
 *
 * Centralized FlexPrice SDK setup for all edge functions.
 * Handles authentication and provides typed API instances.
 */

// @ts-ignore: Deno npm imports
import FlexPrice from 'npm:@flexprice/sdk@latest';

// Initialize FlexPrice API client
const defaultClient = FlexPrice.ApiClient.instance;
defaultClient.basePath = Deno.env.get('FLEXPRICE_BASE_URL') || 'https://api.cloud.flexprice.io/v1';

// Configure API key authentication
const apiKeyAuth = defaultClient.authentications['ApiKeyAuth'];
apiKeyAuth.apiKey = Deno.env.get('FLEXPRICE_API_KEY');
apiKeyAuth.in = 'header';
apiKeyAuth.name = 'x-api-key';

// Export API instances for use in edge functions
export const eventsApi = new FlexPrice.EventsApi();
export const customersApi = new FlexPrice.CustomersApi();
export const subscriptionsApi = new FlexPrice.SubscriptionsApi();
export const walletsApi = new FlexPrice.WalletsApi();

// Export the client instance for custom API calls if needed
export const flexpriceClient = defaultClient;

/**
 * Helper function to track usage events with error handling
 *
 * @param eventName - 'voice_call' | 'web_chat'
 * @param userId - Supabase user ID (external_customer_id)
 * @param properties - Additional event properties
 * @returns boolean - true if tracked successfully
 */
export async function trackUsageEvent(
  eventName: 'voice_call' | 'web_chat',
  userId: string,
  properties: Record<string, any> = {}
): Promise<boolean> {
  try {
    const eventRequest = {
      event_name: eventName,
      external_customer_id: userId,
      properties: {
        ...properties,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'klariqo_edge_function'
    };

    await eventsApi.eventsPost(eventRequest);
    console.log(`[FlexPrice] ✅ Event tracked: ${eventName} for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[FlexPrice] ❌ Event tracking FAILED: ${eventName}`, error);
    // TODO: Send to monitoring service (Sentry/Datadog)
    return false;
  }
}

/**
 * Helper function to check user's credit balance
 *
 * @param userId - Supabase user ID (external_customer_id)
 * @returns number - Credit balance (0 if error)
 */
export async function checkUserBalance(userId: string): Promise<number> {
  try {
    const wallet = await walletsApi.walletsGet({
      external_customer_id: userId
    });

    const balance = wallet?.balance || 0;
    console.log(`[FlexPrice] User ${userId} balance: ${balance} credits`);
    return balance;
  } catch (error) {
    console.error(`[FlexPrice] Failed to check balance for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Example usage:
 *
 * import { trackUsageEvent, checkUserBalance } from '../_shared/flexprice-client.ts';
 *
 * // Check balance before allowing call/chat
 * const balance = await checkUserBalance(userId);
 * if (balance < 1) {
 *   // Reject - no credits
 * }
 *
 * // Track usage after call/chat ends
 * await trackUsageEvent('voice_call', userId, {
 *   call_sid: callSid,
 *   duration_seconds: 120
 * });
 */
