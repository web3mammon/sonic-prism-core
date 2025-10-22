import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { LiveDemoSection } from "@/components/LiveDemoSection";
import { BusinessInfoSection } from "@/components/BusinessInfoSection";
import { LiveCallMonitor } from "@/components/voice-ai/LiveCallMonitor";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useClientDashboardStats } from "@/hooks/useClientDashboardStats";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { useTenant } from "@/hooks/useTenant";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone,
  TrendingUp,
  Calendar,
  CreditCard,
  Play,
  Users,
  Clock,
  DollarSign,
  Settings,
  Activity,
  AlertTriangle
} from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const { client, loading: clientLoading, error: clientError } = useCurrentClient();
  const { stats, loading: statsLoading, error: statsError } = useClientDashboardStats(client?.client_id || null);
  const { activities, loading: activitiesLoading } = useRecentActivity(client?.client_id || null);
  const { region } = useTenant();
  const navigate = useNavigate();

  const [pricingConfig, setPricingConfig] = useState<any>(null);

  const isClient = profile?.role === 'client';
  const isAdmin = profile?.role === 'admin';
  const isTeamMember = profile?.role === 'team_member';
  const isInternal = isAdmin || isTeamMember;

  // Get region-specific currency
  const getCurrencyByRegion = (region: string) => {
    const currencyMap: Record<string, { code: string; symbol: string }> = {
      'au': { code: 'AUD', symbol: '$' },
      'uk': { code: 'GBP', symbol: '£' },
      'gb': { code: 'GBP', symbol: '£' },
      'us': { code: 'USD', symbol: '$' },
      'ca': { code: 'CAD', symbol: '$' },
      'in': { code: 'INR', symbol: '₹' },
      'nz': { code: 'NZD', symbol: '$' }
    };
    return currencyMap[region.toLowerCase()] || { code: 'USD', symbol: '$' };
  };

  const currencyInfo = getCurrencyByRegion(region);

  // Fetch pricing config from database based on region currency
  useEffect(() => {
    async function fetchPricing() {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('currency', currencyInfo.code)
        .single();

      if (error) {
        console.error('Error fetching pricing:', error);
      } else if (data) {
        setPricingConfig(data);
      }
    }

    if (currencyInfo.code) {
      fetchPricing();
    }
  }, [currencyInfo.code]);

  // Use dynamic data from database with real pricing
  const creditData = {
    balance: stats?.currentBalance || 0,
    currency: currencyInfo.code,
    currencySymbol: currencyInfo.symbol,
    callsRemaining: stats?.callsRemaining || 0,
    callsThisMonth: stats?.callsThisMonth || 0,
    averageCallCost: pricingConfig?.per_call_price || 2.00, // Fetch from pricing_config
    lowBalanceThreshold: 5 // Warn when 5 or fewer calls remaining
  };

  const isLowBalance = creditData.callsRemaining <= creditData.lowBalanceThreshold;
  const balancePercentage = Math.min((creditData.balance / 100) * 100, 100);
  const callsUsedPercentage = creditData.callsThisMonth > 0
    ? ((creditData.callsThisMonth / (creditData.callsThisMonth + creditData.callsRemaining)) * 100)
    : 0;

  // Navigation handlers
  const handleTestCall = () => {
    navigate('./testing');
  };

  const handleCustomerData = () => {
    navigate('./call-data');
  };

  const handleTopUp = () => {
    navigate('./billing');
  };

  const handleViewUsage = () => {
    navigate('./call-data');  // Same as call history for now
  };

  const handleViewAllClients = () => {
    navigate('/');  // Navigate to Central HQ
  };

  const handleScheduleMaintenance = () => {
    // TODO: Implement maintenance scheduling
    alert('Maintenance scheduling coming soon');
  };

  // Show loading state
  if (clientLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (clientError || statsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading dashboard</p>
          <p className="text-muted-foreground text-sm">{clientError || statsError}</p>
        </div>
      </div>
    );
  }

  // Show message if no client found
  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">No client configuration found for this URL</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure the region, industry, and client name in the URL are correct
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      {/* Low Balance Warning */}
      {isLowBalance && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            <span className="text-destructive">Call limits approaching.</span> You have {creditData.callsRemaining} call{creditData.callsRemaining !== 1 ? 's' : ''} remaining.{' '}
            <Button variant="link" className="text-destructive font-medium p-0 ml-1 h-auto underline" onClick={handleTopUp}>
              Please top up to continue using your AI Receptionist
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-extralight mb-6">
            {client.business_name} Dashboard
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleTestCall}>
            <Play className="mr-2 h-4 w-4" />
            Test Call
          </Button>
          <Button size="sm" onClick={handleCustomerData}>
            <Users className="mr-2 h-4 w-4" />
            {isClient ? "Call History" : "Customer Data"}
          </Button>
        </div>
      </div>

      {/* Live Demo Section - Only for clients */}
      {isClient && <LiveDemoSection />}

      {/* Main Dashboard Grid: 2x2 Cards + Credit Balance */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: 2x2 Metrics Cards */}
        <div className="lg:col-span-2 grid gap-4 grid-cols-2 animate-fade-in">
        {/* Calls This Month - Blue */}
        <Card className="font-manrope border-l-4 border-l-blue-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-blue-50/75 dark:bg-blue-950/30 flex flex-col justify-between min-h-[160px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calls This Month
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-extralight text-blue-700 dark:text-blue-300">
              {creditData.callsThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">total calls</p>
          </CardContent>
        </Card>

        {/* Calls Remaining - Green */}
        <Card className="font-manrope border-l-4 border-l-green-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-green-50/75 dark:bg-green-950/30 flex flex-col justify-between min-h-[160px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calls Remaining
            </CardTitle>
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-extralight text-green-700 dark:text-green-300">
              {Math.floor(creditData.balance / creditData.averageCallCost).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">at {creditData.currencySymbol}{creditData.averageCallCost.toFixed(2)} per call</p>
          </CardContent>
        </Card>

        {/* Avg Call Duration - Purple */}
        <Card className="font-manrope border-l-4 border-l-purple-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-purple-50/75 dark:bg-purple-950/30 flex flex-col justify-between min-h-[160px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Call Duration
            </CardTitle>
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-extralight text-purple-700 dark:text-purple-300">
              {stats?.avgDurationSeconds ? `${(stats.avgDurationSeconds / 60).toFixed(1)} min` : '0 min'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">average duration</p>
          </CardContent>
        </Card>

        {/* Next Billing Date - Amber */}
        <Card className="font-manrope border-l-4 border-l-amber-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-amber-50/75 dark:bg-amber-950/30 flex flex-col justify-between min-h-[160px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Billing Date
            </CardTitle>
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-extralight text-amber-700 dark:text-amber-300">
              {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">upcoming charge</p>
          </CardContent>
        </Card>
        </div>

        {/* Right: Credit Balance Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-2xl font-extralight flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Credit Balance
              {isLowBalance && <Badge variant="destructive" className="text-xs animate-pulse">Low Balance</Badge>}
            </CardTitle>
            <CardDescription>
              Your current credit balance and call usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credit Balance Display */}
            <div className="text-center p-8 rounded-lg bg-background/50">
              <div className="text-5xl font-extralight text-primary mb-3">
                {creditData.currencySymbol}{creditData.balance.toFixed(2)}
              </div>
              <div className="text-lg text-muted-foreground mb-1">{creditData.currency}</div>
              <div className="text-sm text-muted-foreground">
                Approximately <span className="font-semibold text-primary">{Math.floor(creditData.balance / creditData.averageCallCost)} calls</span> remaining at {creditData.currencySymbol}{creditData.averageCallCost}/call
              </div>
            </div>

            {/* Usage Overview */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Monthly Usage
                  </span>
                  <span className="text-primary">{creditData.callsThisMonth} calls ({creditData.currencySymbol}{(creditData.callsThisMonth * creditData.averageCallCost).toFixed(2)})</span>
                </div>
                <div className="relative">
                  <Progress value={callsUsedPercentage} className="h-3" />
                  <div
                    className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                    style={{ width: `${callsUsedPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {callsUsedPercentage.toFixed(1)}% of projected monthly usage
                </p>
              </div>

              {isClient && (
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleViewUsage}>
                    View Usage History
                  </Button>
                  <Button
                    size="sm"
                    className={isLowBalance ? "bg-destructive hover:bg-destructive/90" : ""}
                    onClick={handleTopUp}
                  >
                    Top Up Credits
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Information Section - Only for clients */}
      {isClient && <BusinessInfoSection />}

      <hr className="border-border" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Live Call Monitor - Shows active calls with sentiment analysis */}
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-2 pt-8">
            <h2 className="text-2xl font-extralight flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live Call Monitoring
            </h2>
            <p className="text-muted-foreground">
              Real-time call tracking with AI sentiment analysis
            </p>
          </div>
          <LiveCallMonitor clientId={client?.client_id} />
        </div>

        {/* Recent Activity - Real Data from Database */}
        <div className="space-y-6">
          <div className="space-y-2 pt-8">
            <h2 className="text-2xl font-extralight flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </h2>
            <p className="text-muted-foreground">
              {isClient ? "Your recent calls and account activity" : "Latest calls and system events"}
            </p>
          </div>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity yet</p>
              <p className="text-xs mt-2">Activity will appear here once calls are made</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        activity.status === "success" ? "bg-green-500" :
                        activity.status === "info" ? "bg-blue-500" :
                        activity.status === "warning" ? "bg-yellow-500" :
                        activity.status === "error" ? "bg-red-500" : "bg-gray-400"
                      }`} />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{activity.details?.caller || 'Unknown'}</p>
                          <Badge variant={activity.status === "success" ? "secondary" : "destructive"} className={
                            activity.status === "success"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : ""
                          }>
                            {activity.status === "success" ? "Completed" : "Failed"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.details?.duration ? `${Math.floor(activity.details.duration / 60)}m ${activity.details.duration % 60}s` : 'N/A'}
                          </span>
                          {activity.details?.cost > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${activity.details.cost.toFixed(2)}
                            </span>
                          )}
                          <span className="ml-auto">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}