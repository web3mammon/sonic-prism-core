import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { NotificationBanner } from "@/components/NotificationBanner";
import { LiveDemoSection } from "@/components/LiveDemoSection";
import { BusinessInfoSection } from "@/components/BusinessInfoSection";
import { LiveCallMonitor } from "@/components/voice-ai/LiveCallMonitor";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useClientDashboardStats } from "@/hooks/useClientDashboardStats";
import { useTenant } from "@/hooks/useTenant";
import { useNavigate } from "react-router-dom";
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
  const { region } = useTenant();
  const navigate = useNavigate();


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
      'nz': { code: 'NZD', symbol: '$' }
    };
    return currencyMap[region.toLowerCase()] || { code: 'USD', symbol: '$' };
  };

  const currencyInfo = getCurrencyByRegion(region);

  // Use dynamic data from database or fallback to defaults
  const creditData = {
    balance: stats?.currentBalance || 0,
    currency: currencyInfo.code,
    currencySymbol: currencyInfo.symbol,
    callsRemaining: stats?.callsRemaining || 0,
    callsThisMonth: stats?.callsThisMonth || 0,
    averageCallCost: 2.00, // Always $2 per call (USP)
    lowBalanceThreshold: 10,
    lastTopUp: "2024-01-15", // TODO: Add to database
    nextBillingDate: "2024-02-01" // TODO: Add to database
  };

  const isLowBalance = creditData.balance <= creditData.lowBalanceThreshold;
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

  const handleSystemSettings = () => {
    navigate('./system');
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
    <div className="space-y-6 font-manrope">
      {/* Dynamic Notification Banner */}
      <NotificationBanner />
      
      {/* Low Balance Warning */}
      {isLowBalance && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            <span className="text-destructive">Low balance warning:</span> You have {creditData.currencySymbol}{creditData.balance.toFixed(2)} remaining (approx. {Math.floor(creditData.balance / creditData.averageCallCost)} calls). 
            <Button variant="link" className="text-destructive font-medium p-0 ml-1 h-auto">
              Top up now to continue service
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {client.business_name} Dashboard
          </h1>
          <p className="text-muted-foreground">
            {isClient 
              ? "Monitor your AI assistant performance and manage your business"
              : `Managing voice AI client: ${client.business_name}`
            }
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
              {client.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Client ID: {client.client_id}
            </span>
          </div>
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
          {isInternal && (
            <Button variant="outline" size="sm" onClick={handleSystemSettings}>
              <Settings className="mr-2 h-4 w-4" />
              System Settings
            </Button>
          )}
        </div>
      </div>

      {/* Live Demo Section - Only for clients */}
      {isClient && <LiveDemoSection />}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricsCard
          title="Credit Balance"
          value={`${creditData.currencySymbol}${creditData.balance.toFixed(2)} ${creditData.currency}`}
          subtitle={`≈ ${Math.floor(creditData.balance / 2.00)} calls remaining`}
          icon={DollarSign}
          changeType={isLowBalance ? "negative" : undefined}
        />
        <MetricsCard
          title="Calls This Month"
          value={creditData.callsThisMonth.toLocaleString()}
          change="+12%"
          changeType="positive"
          icon={Phone}
          subtitle="vs last month"
        />
        <MetricsCard
          title="Calls Remaining"
          value={Math.floor(creditData.balance / 2.00).toLocaleString()}
          subtitle="at $2.00 per call"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Credit Balance & Usage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Credit Balance
              {isLowBalance && <Badge variant="destructive" className="text-xs">Low Balance</Badge>}
            </CardTitle>
            <CardDescription>
              Your current credit balance and call usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credit Balance Display */}
            <div className="text-center p-6 bg-card/50 rounded-lg border">
              <div className="text-3xl font-light text-foreground mb-2">
                {creditData.currencySymbol}{creditData.balance.toFixed(2)} {creditData.currency}
              </div>
              <div className="text-sm text-muted-foreground">
                Approximately {Math.floor(creditData.balance / creditData.averageCallCost)} calls remaining at {creditData.currencySymbol}{creditData.averageCallCost}/call
              </div>
            </div>

            {/* Usage Overview */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Monthly Usage</span>
                  <span>{creditData.callsThisMonth} calls ({creditData.currencySymbol}{(creditData.callsThisMonth * creditData.averageCallCost).toFixed(2)})</span>
                </div>
                <Progress value={callsUsedPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {callsUsedPercentage.toFixed(1)}% of projected monthly usage
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Pay As You Go</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Credit System</Badge>
                    <span className="text-sm text-muted-foreground">
                      ${creditData.averageCallCost}/call
                    </span>
                  </div>
                </div>
                <div className="space-x-2">
                  {isClient ? (
                    <>
                      <Button variant="outline" size="sm">
                        View Usage History
                      </Button>
                      <Button 
                        size="sm" 
                        className={isLowBalance ? "bg-destructive hover:bg-destructive/90" : ""}
                      >
                        Top Up Credits
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Future: Credit Management functionality */}
                      {/*
                      <Button variant="outline" size="sm">
                        Manage Credits
                      </Button>
                      */}
                      <Button size="sm">
                        View All Clients
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              {isClient ? "Manage your AI agent" : "Test and manage AI agents"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={handleTestCall}>
              <Play className="mr-2 h-4 w-4" />
              Make Test Call
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={handleCustomerData}>
              <Users className="mr-2 h-4 w-4" />
              {isClient ? "View Call History" : "View Customer Data"}
            </Button>
            {isInternal && (
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Maintenance
              </Button>
            )}
            {/* Future: Credit Management functionality */}
            {/*
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              {isClient ? "Top Up Credits" : "Credit Management"}
            </Button>
            */}
            {isInternal && (
              <Button className="w-full justify-start" variant="outline" onClick={handleSystemSettings}>
                <Activity className="mr-2 h-4 w-4" />
                System Health
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Business Information Section - Only for clients */}
        {isClient && <BusinessInfoSection />}

        {/* Live Call Monitor - Shows active calls with sentiment analysis */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Live Call Monitoring</CardTitle>
            <CardDescription>
              Real-time call tracking with AI sentiment analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveCallMonitor clientId={client?.client_id} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {isClient ? "Your recent calls and account activity" : "Latest calls and system events"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(isClient ? [
                { time: "2 min ago", event: "Incoming call handled - $2.00 deducted", status: "success" },
                { time: "8 min ago", event: "Test call completed", status: "success" },
                { time: "15 min ago", event: "Credits topped up - $50.00 added", status: "info" },
                { time: "32 min ago", event: "Low balance warning sent", status: "warning" },
                { time: "1 hour ago", event: "Call completed - $2.00 deducted", status: "success" },
              ] : [
                { time: "2 min ago", event: "Incoming call handled", status: "success" },
                { time: "8 min ago", event: "Test call completed", status: "success" },
                { time: "15 min ago", event: "Customer data updated", status: "info" },
                { time: "32 min ago", event: "New client onboarded", status: "info" },
                { time: "1 hour ago", event: "System maintenance completed", status: "success" },
              ]).map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === "success" ? "bg-green-500" : 
                    activity.status === "info" ? "bg-blue-500" : 
                    activity.status === "warning" ? "bg-yellow-500" : "bg-gray-400"
                  }`} />
                  <div className="flex-1 space-y-1">
                    <p>{activity.event}</p>
                    <p className="text-muted-foreground text-xs">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}