import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'provisioning' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // 1. Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Email verification failed. Please try again or contact support.');
      }

      console.log('[AuthCallback] User authenticated:', user.id);

      // 2. Get user profile with onboarding data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Could not find your account. Please contact support.');
      }

      console.log('[AuthCallback] Profile loaded:', profile);

      // 3. Check if already provisioned
      if (profile.onboarding_completed) {
        console.log('[AuthCallback] Already onboarded, checking for client...');

        // Find their client and redirect
        const { data: clients } = await supabase
          .from('voice_ai_clients')
          .select('client_slug')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (clients && clients.length > 0) {
          const client = clients[0];
          // Use client_slug and replace underscores with slashes
          const url = `/${client.client_slug.replace(/_/g, '/')}`;
          console.log('[AuthCallback] Redirecting to existing dashboard:', url);
          navigate(url);
          return;
        }
      }

      // 4. Get onboarding data from user metadata
      const onboardingData = user.user_metadata?.onboarding_data;
      if (!onboardingData) {
        console.error('[AuthCallback] User metadata:', user.user_metadata);
        throw new Error('Onboarding data not found. Please restart the onboarding process.');
      }

      console.log('[AuthCallback] Onboarding data retrieved:', onboardingData);

      setStatus('provisioning');
      console.log('[AuthCallback] Starting provisioning...');

      // 5. Call client-provisioning edge function
      const { data, error: provisionError } = await supabase.functions.invoke('client-provisioning', {
        body: {
          business_name: onboardingData.business_name,
          region: onboardingData.business_location,
          industry: onboardingData.industry,
          phone_number: onboardingData.phone_number || user.user_metadata?.phone_number || '',
          user_id: user.id,
          system_prompt: onboardingData.system_prompt || '',
          channel_type: onboardingData.channel_type || 'phone',
          voice_id: onboardingData.voice_id,
          // NEW: Pass all business context fields
          website_url: onboardingData.website_url || '',
          services_offered: onboardingData.services_offered || [],
          pricing_info: onboardingData.pricing_info || '',
          target_audience: onboardingData.target_audience || '',
          tone: onboardingData.tone || 'professional',
        }
      });

      if (provisionError) {
        console.error('[AuthCallback] Provisioning error:', provisionError);
        throw new Error(provisionError.message || 'Failed to set up your AI receptionist');
      }

      console.log('[AuthCallback] Provisioning successful:', data);

      // 6. Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);

      // 7. Fetch the newly created client to get the client_slug
      const { data: newClient, error: clientError } = await supabase
        .from('voice_ai_clients')
        .select('client_slug')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (clientError || !newClient) {
        console.error('[AuthCallback] Error fetching newly created client:', clientError);
        throw new Error('Failed to retrieve your dashboard URL. Please contact support.');
      }

      // Build dashboard URL using client_slug (replace underscores with slashes)
      const dashboardUrl = `/${newClient.client_slug.replace(/_/g, '/')}`;
      console.log('[AuthCallback] Redirecting to dashboard:', dashboardUrl);

      // Celebrate with confetti
      if (typeof window !== 'undefined' && (window as any).confetti) {
        (window as any).confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      navigate(dashboardUrl);

    } catch (err: any) {
      console.error('[AuthCallback] Error:', err);
      setStatus('error');
      setError(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl mx-auto text-center space-y-8 p-6"
      >
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extralight">
                Verifying your email...
              </h1>
              <p className="text-lg text-muted-foreground">
                Just a moment while we confirm your account
              </p>
            </div>
          </>
        )}

        {status === 'provisioning' && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extralight">
                Setting up your AI receptionist...
              </h1>
              <p className="text-lg text-muted-foreground">
                This usually takes 10-15 seconds
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <span className="text-5xl">⚠️</span>
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extralight">
                Something went wrong
              </h1>
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg max-w-xl mx-auto">
                <p className="text-sm text-red-500">{error}</p>
              </div>
              <div className="flex gap-4 justify-center pt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={() => window.location.href = 'mailto:hello@klariqo.com'}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition"
                >
                  📧 Contact Support
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
