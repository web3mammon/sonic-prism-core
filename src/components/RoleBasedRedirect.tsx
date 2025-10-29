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

    // If user is a client (not admin/team_member)
    if (hasRole('client')) {
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