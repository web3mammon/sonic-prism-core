import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { toast } from "sonner";
import {
  Plug,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Loader2
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'available' | 'connected' | 'coming_soon';
  comingSoon?: boolean;
}

export default function Integrations() {
  const { client, loading } = useCurrentClient();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'square',
      name: 'Square',
      description: 'Connect your Square account to automatically trigger confirmation calls for bookings and orders.',
      icon: '□',
      status: 'available'
    },
    {
      id: 'toast',
      name: 'Toast POS',
      description: 'Sync restaurant orders and reservations to provide real-time phone support.',
      icon: '🍞',
      status: 'coming_soon',
      comingSoon: true
    },
    {
      id: 'servicetitan',
      name: 'ServiceTitan',
      description: 'Integrate with ServiceTitan to handle service job bookings and customer calls.',
      icon: '🔧',
      status: 'coming_soon',
      comingSoon: true
    }
  ]);

  // TODO: Fetch connection status from integration project
  // Need to get correct anon key or create edge function proxy
  // For now, just check URL params for success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'square') {
      setIntegrations(prev => prev.map(int =>
        int.id === 'square' ? { ...int, status: 'connected' as const } : int
      ));
    }
  }, []);

  const handleConnect = (integrationId: string) => {
    if (!client?.client_id) {
      toast.error("Client not found. Please refresh the page.");
      return;
    }

    if (integrationId === 'square') {
      // Build Square OAuth URL
      const SQUARE_APP_ID = 'sandbox-sq0idb-ieeSN9F2L0MWzbm4pn0dmw';
      const redirectUri = encodeURIComponent('https://txrjaexyoyzcxyyugsno.supabase.co/functions/v1/square-oauth-callback');
      const state = client.client_id; // Pass client_id via state
      const scopes = 'CUSTOMERS_READ+CUSTOMERS_WRITE+ORDERS_READ+APPOINTMENTS_READ+APPOINTMENTS_WRITE+MERCHANT_PROFILE_READ';

      const oauthUrl = `https://connect.squareupsandbox.com/oauth2/authorize?client_id=${SQUARE_APP_ID}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

      // Open OAuth flow
      window.location.href = oauthUrl;
    } else {
      toast.info(`${integrationId} integration coming soon!`);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    toast.info(`Disconnect ${integrationId} - Coming soon!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 font-manrope">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your business tools to automate voice AI workflows
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id} className="relative overflow-hidden bg-muted/50">
            {integration.comingSoon && (
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-muted">
                  Coming Soon
                </Badge>
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-2xl">
                  {integration.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{integration.name}</CardTitle>
                </div>
              </div>
              <CardDescription className="mt-2">
                {integration.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {integration.status === 'connected' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Connected</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      Disconnect
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Settings
                    </Button>
                  </div>
                </div>
              ) : integration.status === 'available' ? (
                <Button
                  className="w-full"
                  onClick={() => handleConnect(integration.id)}
                >
                  <Plug className="h-4 w-4 mr-2" />
                  Connect {integration.name}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled
                >
                  Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <hr className="border-border" />

      {/* Need Help Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Need Help?
          </h2>
          <p className="text-muted-foreground">
            Having trouble connecting an integration? Check out our setup guides or contact support.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          View Documentation
        </Button>
      </div>
    </div>
  );
}
