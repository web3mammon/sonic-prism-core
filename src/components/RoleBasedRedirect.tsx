import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoleBasedRedirectProps {
  children: React.ReactNode;
}

export const RoleBasedRedirect = ({ children }: RoleBasedRedirectProps) => {
  const { user, profile, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [clientData, setClientData] = useState<any>(null);
  const [fetchingClient, setFetchingClient] = useState(false);

  useEffect(() => {
    if (loading || !user || !profile) return;

    const currentPath = location.pathname;
    const isRootPath = currentPath === '/';

    // If user is a client (not admin/team_member)
    if (hasRole('client')) {
      // Clients should only access their tenant dashboard, not Central HQ
      if (isRootPath && !fetchingClient && !clientData) {
        // Fetch client data to get actual dashboard URL
        setFetchingClient(true);

        supabase
          .from('voice_ai_clients')
          .select('region, industry, clientname, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              console.error('Error fetching client:', error);
              toast({
                title: "No active client found",
                description: "Please complete onboarding to create your client.",
                variant: "destructive",
              });
              navigate('/onboarding', { replace: true });
            } else {
              setClientData(data);
              const dashboardUrl = `/${data.region}/${data.industry}/${data.clientname}`;
              navigate(dashboardUrl, { replace: true });
            }
          })
          .finally(() => {
            setFetchingClient(false);
          });

        return;
      }
    }

    // If user is admin/team_member
    if (hasRole('admin') || hasRole('team_member')) {
      // Internal users can access both Central HQ and tenant dashboards
      // No redirect needed, they have full access
      return;
    }

  }, [user, profile, loading, hasRole, navigate, location.pathname]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};