import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BusinessSetupForm } from '@/components/BusinessSetupForm';
import { useAuth } from '@/hooks/useAuth';

export default function BusinessSetup() {
  const { user, profile, loading } = useAuth();
  const [clientInfo, setClientInfo] = useState<{ region: string; industry: string; clientSlug: string } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to dashboard if setup is already complete
  const extendedProfile = profile as any;
  if (extendedProfile?.onboarding_completed && !clientInfo) {
    // Query their actual client and redirect there
    return <Navigate to="/central-hq" replace />;
  }

  // Redirect to newly created client dashboard after successful setup
  if (clientInfo) {
    // Use client_slug directly (replace underscores with slashes)
    const dashboardUrl = `/${clientInfo.clientSlug.replace(/_/g, '/')}`;
    return <Navigate to={dashboardUrl} replace />;
  }

  const handleSetupComplete = (newClientInfo?: { region: string; industry: string; clientSlug: string }) => {
    if (newClientInfo) {
      setClientInfo(newClientInfo);
    }
  };

  return (
    <BusinessSetupForm
      onComplete={handleSetupComplete}
    />
  );
}