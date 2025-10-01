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
          setClient({
            id: clientData.client_id || '',
            user_id: clientData.user_id,
            client_id: clientData.client_id,
            region: clientData.region || region,
            industry: clientData.industry || industry,
            business_name: clientData.business_name,
            port: clientData.port || 3011,
            api_proxy_path: clientData.api_proxy_path || `/api/${clientname}`,
            phone_number: clientData.phone_number,
            status: (clientData.status as 'active' | 'inactive' | 'starting' | 'stopping' | 'error') || 'inactive',
            config: (clientData.config as any) || {},
            created_at: clientData.created_at,
            updated_at: clientData.created_at
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