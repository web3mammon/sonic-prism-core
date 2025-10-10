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
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronRight
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
  const lowBalanceThreshold = creditData.lowBalanceThreshold;
  const currency = creditData.currencySymbol;
  const clientName = client?.business_name || '';
  const balancePercentage = Math.min((creditData.balance / 100) * 100, 100);
  const callsPercentage = creditData.callsThisMonth > 0
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
    <div className="space-y-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Low Balance Alert */}
      {isLowBalance && (
        <div className="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold text-sm">Low Balance Alert</h4>
              <p className="text-slate-400 text-sm">Your credit balance is below ${lowBalanceThreshold}. Top up to continue using Voice AI services.</p>
            </div>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Top Up Now
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-white">{clientName}</h2>
              {client?.status && (
                <span className={`px-3 py-1 ${
                  client.status === 'active' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                } border rounded-full text-xs font-medium capitalize`}>
                  {client.status}
                </span>
              )}
              {client?.client_id && (
                <span className="px-3 py-1 bg-slate-800/50 text-slate-400 border border-slate-700/50 rounded-full text-xs font-medium">
                  ID: {client.client_id}
                </span>
              )}
            </div>
            <p className="text-slate-400">
              {isClient && "24/7 Voice AI Services"}
              {isAdmin && "Administrative dashboard"}
              {isTeamMember && "Team member access"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleTestCall}
              className="flex items-center gap-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 px-4 py-2 rounded-lg border border-violet-500/20 transition-all"
            >
              <Play className="w-4 h-4" />
              <span className="font-medium">Test Call</span>
            </button>
            <button 
              onClick={handleCustomerData}
              className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg border border-slate-700/50 transition-all"
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Call History</span>
            </button>
            {isInternal && (
              <button 
                onClick={handleSystemSettings}
                className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg border border-slate-700/50 transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Credit Balance */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-violet-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">Credit Balance</span>
            <div className={`flex items-center gap-1 text-xs font-medium ${isLowBalance ? 'text-red-400' : 'text-green-400'}`}>
              {isLowBalance ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{currency}{creditData.balance.toFixed(2)}</div>
          <div className="text-slate-400 text-sm mb-4">~{creditData.callsRemaining} calls remaining</div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${isLowBalance ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-purple-600'}`} style={{width: `${Math.min(balancePercentage, 100)}%`}}></div>
          </div>
        </div>

        {/* Calls This Month */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-violet-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">Calls This Month</span>
            <div className="flex items-center gap-1 text-xs font-medium text-green-400">
              <TrendingUp className="w-3 h-3" />
              12%
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <div className="text-3xl font-bold text-white">{creditData.callsThisMonth}</div>
            <Phone className="w-5 h-5 text-violet-400" />
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full" style={{width: `${Math.min(callsPercentage, 100)}%`}}></div>
          </div>
        </div>

        {/* Calls Remaining */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-violet-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">Calls Remaining</span>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{creditData.callsRemaining}</div>
          <div className="text-slate-400 text-sm mb-4">Based on current balance</div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full" style={{width: `${Math.min(balancePercentage, 100)}%`}}></div>
          </div>
        </div>
      </div>



      {/* Live Call Monitor */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Live Call Monitoring</h3>
              <p className="text-slate-400 text-sm">Real-time active calls with AI sentiment analysis</p>
            </div>
          </div>
        </div>
        <LiveCallMonitor clientId={client?.client_id} />
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">Recent Activity</h3>
          <button className="text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {(isClient ? [
            { id: 1, type: 'call', message: 'Call completed successfully', cost: '$2.00', time: '5 min ago', status: 'success' },
            { id: 2, type: 'credit', message: 'Credit top-up - $100.00', time: '2 hours ago', status: 'info' },
            { id: 3, type: 'test', message: 'Test call executed', time: '3 hours ago', status: 'info' },
            { id: 4, type: 'warning', message: 'Low balance warning', time: '1 day ago', status: 'warning' },
          ] : [
            { id: 5, type: 'system', message: 'System health check completed', time: '10 min ago', status: 'info' },
            { id: 6, type: 'call', message: 'Client call processed', time: '15 min ago', status: 'success' },
          ]).map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                activity.status === 'success' ? 'bg-green-400' :
                activity.status === 'warning' ? 'bg-yellow-400' :
                'bg-blue-400'
              }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium mb-1">{activity.message}</p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">{activity.time}</span>
                  {activity.cost && (
                    <span className="text-violet-400 text-xs font-medium">{activity.cost}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}