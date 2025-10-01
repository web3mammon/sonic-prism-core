import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RoleBasedRedirectProps {
  children: React.ReactNode;
}

export const RoleBasedRedirect = ({ children }: RoleBasedRedirectProps) => {
  const { user, profile, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user || !profile) return;

    const currentPath = location.pathname;
    const isRootPath = currentPath === '/';
    const isTenantPath = /^\/[a-z]{2}\/[a-z]{3,4}\/[a-zA-Z0-9-]+/.test(currentPath);
    const isBusinessSetupPath = currentPath === '/business-setup';
    
    // Check if user needs to complete onboarding
    const extendedProfile = profile as any;
    if (!extendedProfile?.onboarding_completed && !isBusinessSetupPath) {
      navigate('/business-setup', { replace: true });
      return;
    }

    // If user has completed onboarding but is on business setup page, redirect them
    if (extendedProfile?.onboarding_completed && isBusinessSetupPath) {
      if (hasRole('client')) {
        navigate('/au/plmb/acmeplumbing', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    // If user is a client (not admin/team_member) and onboarding is complete
    if (hasRole('client') && extendedProfile?.onboarding_completed) {
      // Clients should only access their tenant dashboard, not Central HQ
      if (isRootPath) {
        // For now, redirect to a demo tenant path (in production, this would come from user's profile)
        navigate('/au/plmb/acmeplumbing', { replace: true });
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