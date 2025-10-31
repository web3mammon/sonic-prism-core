import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VoiceAIClient } from '@/types/voice-ai';

interface CurrentClientData {
  client: VoiceAIClient | null;
  loading: boolean;
  error: string | null;
}

export function useCurrentClient(): CurrentClientData {
  const { region, industry, clientname } = useParams();
  const [client, setClient] = useState<VoiceAIClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCurrentClient() {
      if (!region || !industry || !clientname) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use the database function to get client by URL params
        const { data, error: rpcError } = await supabase.rpc('get_client_by_url_params', {
          p_region: region,
          p_industry: industry,
          p_clientname: clientname
        });

        if (rpcError) {
          console.error('Error fetching client:', rpcError);
          setError(rpcError.message);
          return;
        }

        if (data && data.length > 0) {
          const clientData = data[0] as any; // Type assertion until types regenerate
          console.log('[useCurrentClient] Raw data from RPC:', clientData);
          setClient({
            id: clientData.client_id || '',
            user_id: clientData.user_id,
            client_id: clientData.client_id,
            region: clientData.region || region,
            industry: clientData.industry || industry,
            business_name: clientData.business_name,
            phone_number: clientData.phone_number,
            channel_type: clientData.channel_type,
            voice_id: clientData.voice_id,  // Top-level voice_id
            status: (clientData.status as 'active' | 'inactive' | 'starting' | 'stopping' | 'error') || 'inactive',

            // Actual database fields (config column dropped)
            system_prompt: clientData.system_prompt,
            greeting_message: clientData.greeting_message,
            business_hours: clientData.business_hours,
            timezone: clientData.timezone,

            // Business context fields (added November 2025)
            website_url: clientData.website_url,
            business_address: clientData.business_address,
            services_offered: clientData.services_offered,
            pricing_info: clientData.pricing_info,
            target_audience: clientData.target_audience,
            tone: clientData.tone,

            // Call transfer fields
            call_transfer_number: clientData.call_transfer_number,
            call_transfer_enabled: clientData.call_transfer_enabled,

            created_at: clientData.created_at,
            updated_at: clientData.created_at,
            // Trial tracking fields
            trial_calls: clientData.trial_calls,
            trial_calls_used: clientData.trial_calls_used || 0,
            trial_conversations: clientData.trial_conversations,
            trial_conversations_used: clientData.trial_conversations_used || 0,
            trial_starts_at: clientData.trial_starts_at,
            trial_ends_at: clientData.trial_ends_at,
          });
        } else {
          setClient(null);
          setError('Client not found for this URL');
        }
      } catch (err) {
        console.error('Error in useCurrentClient:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchCurrentClient();
  }, [region, industry, clientname]);

  return { client, loading, error };
}