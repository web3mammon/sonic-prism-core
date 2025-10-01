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
    // If already onboarded but no clientInfo, redirect to a default dashboard
    // TODO: In future, we could query voice_ai_clients table to get their actual client URL
    return <Navigate to="/au/plmb/jamesonplumbing" replace />;
  }

  // Redirect to newly created client dashboard after successful setup
  if (clientInfo) {
    const dashboardUrl = `/${clientInfo.region}/${clientInfo.industry}/${clientInfo.clientSlug}`;
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