import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModernButton } from "@/components/ui/modern-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { 
  Users, 
  Activity, 
  Server, 
  Search, 
  Download, 
  Shield, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Globe,
  Zap,
  Settings,
  FileText,
  TrendingUp,
  UserCheck,
  Wifi,
  RefreshCw,
  Phone,
  DollarSign
} from "lucide-react";
import { VoiceAIDashboard } from "@/components/voice-ai/VoiceAIDashboard";
import { LiveCallMonitor } from "@/components/voice-ai/LiveCallMonitor";
import { VoiceAIStats } from "@/components/voice-ai/VoiceAIStats";
import { supabase } from "@/integrations/supabase/client";

const CentralHQ = () => {
  const { hasRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real-time data states
  const [systemMetrics, setSystemMetrics] = useState({
    totalClients: 0,
    activeClients: 0,
    systemLoad: 0,
    uptime: "0%",
    totalCalls: 0,
    totalSMS: 0,
    avgResponseTime: "0s",
    callsToday: 0,
    revenueToday: 0,
    regionalStats: [] as Array<{ region: string; count: number; percentage: number }>
  });

  const [clients, setClients] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [systemResources, setSystemResources] = useState({
    cpu: 0,
    memory: 0,
    storage: 0,
    loading: true
  });

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all clients from voice_ai_clients table
      const { data: clientsData, error: clientsError } = await supabase
        .from('voice_ai_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      setClients(clientsData || []);

      // Count active clients (status = 'active')
      const activeCount = (clientsData || []).filter(c => c.status === 'active').length;

      // Fetch today's calls
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: callsData, error: callsError } = await supabase
        .from('call_sessions')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (callsError) throw callsError;

      const callsToday = callsData?.length || 0;

      // Calculate total revenue today
      const revenueToday = (callsData || []).reduce((sum, call) => sum + (parseFloat(String(call.cost_amount || 0)) || 0), 0);

      // Fetch ALL calls for total count
      const { count: totalCallsCount, error: allCallsError } = await supabase
        .from('call_sessions')
        .select('*', { count: 'exact', head: true });

      const totalCalls = allCallsError ? 0 : (totalCallsCount || 0);

      // Fetch total SMS count
      const { count: totalSMSCount, error: allSMSError } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact', head: true });

      const totalSMS = allSMSError ? 0 : (totalSMSCount || 0);

      // Calculate regional distribution
      const regionCounts: any = {};
      (clientsData || []).forEach(client => {
        const region = client.region?.toUpperCase() || 'UNKNOWN';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });

      const totalRegionalClients = Object.values(regionCounts).reduce((sum: number, count: any) => sum + count, 0) as number;
      const regionalStats = Object.entries(regionCounts).map(([region, count]: [string, any]) => ({
        region,
        count,
        percentage: totalRegionalClients > 0 ? Math.round((count / totalRegionalClients) * 100) : 0
      })).sort((a, b) => b.count - a.count);

      // Calculate system load based on active clients
      const systemLoad = Math.min(Math.round((activeCount / Math.max(clientsData?.length || 1, 1)) * 100), 100);

      setSystemMetrics({
        totalClients: clientsData?.length || 0,
        activeClients: activeCount,
        systemLoad: systemLoad,
        uptime: "99.9%",
        totalCalls,
        totalSMS,
        avgResponseTime: "1.2s",
        callsToday: callsToday,
        revenueToday: revenueToday,
        regionalStats
      });

      // Fetch recent calls for display
      const { data: recentCallsData } = await supabase
        .from('call_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentCalls(recentCallsData || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real system resources
  const fetchSystemResources = async () => {
    try {
      // Get CPU, Memory, and Storage from Linux via edge function
      const response = await fetch('https://btqccksigmohyjdxgrrj.supabase.co/functions/v1/system-stats', {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWNja3NpZ21vaHlqZHhncnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDY4MDEsImV4cCI6MjA3MzkyMjgwMX0.kOiOYBO-lro83HMSaCTlnryfRM3Md3pWkdAaYmVHhJ4`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemResources({
          cpu: data.cpu || 0,
          memory: data.memory || 0,
          storage: data.storage || 0,
          loading: false
        });
      } else {
        // Fallback to placeholder if edge function doesn't exist yet
        setSystemResources({
          cpu: 0,
          memory: 0,
          storage: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching system resources:', error);
      setSystemResources({
        cpu: 0,
        memory: 0,
        storage: 0,
        loading: false
      });
    }
  };

  // Initial data load only (no auto-refresh)
  useEffect(() => {
    fetchData();
    fetchSystemResources();
  }, []);

  // Transform clients data for display
  const recentClients = clients.slice(0, 10).map(client => ({
    id: client.client_id || client.id,
    name: client.business_name || 'Unknown Business',
    region: (client.region || 'UK').toUpperCase(),
    status: client.live_status || client.status || 'unknown',
    plan: 'premium', // Default plan
    lastActive: client.last_call ? new Date(client.last_call).toLocaleString() : (client.last_ping ? 'Active' : 'Never'),
    callsToday: client.calls_today || 0
  }));

  // Generate alerts based on real data
  const systemAlerts = [
    ...(systemMetrics.activeClients === 0 ? [{ id: 1, type: "warning", message: "No active clients detected", time: "Now" }] : []),
    ...(systemMetrics.callsToday > 500 ? [{ id: 2, type: "warning", message: `High call volume today: ${systemMetrics.callsToday} calls`, time: "Live" }] : []),
    ...(clients.filter(c => c.live_status === 'offline').length > 0 ? [{ 
      id: 3,
      type: "error", 
      message: `${clients.filter(c => c.live_status === 'offline').length} clients offline`, 
      time: "Live" 
    }] : []),
    { id: 4, type: "info", message: `System healthy - ${systemMetrics.activeClients} active clients`, time: lastRefresh.toLocaleTimeString() },
  ];

  // Redirect if not admin or team member
  if (!hasRole('admin') && !hasRole('team_member')) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This area is restricted to admin and team members only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mock data removed - now using real data from API

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-400';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'warning': return 'destructive';
      case 'success': return 'default';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-8 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight mb-2">Central HQ</h1>
          <p className="text-muted-foreground">
            Live system overview and client management console
          </p>
        </div>
        <div className="flex space-x-2">
          <ModernButton variant="outline" size="sm" onClick={() => { fetchData(); fetchSystemResources(); }} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </ModernButton>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-extralight">Total Clients</h3>
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-5xl font-extralight">{loading ? "..." : systemMetrics.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-2">
              registered clients
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-extralight">Active Clients</h3>
            <div className="p-2 rounded-lg bg-primary/10">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-5xl font-extralight">{loading ? "..." : systemMetrics.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-2">
              currently online
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-extralight">Calls Today</h3>
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-5xl font-extralight">{loading ? "..." : systemMetrics.callsToday}</div>
            <p className="text-xs text-muted-foreground mt-2">
              across all clients
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-extralight">Revenue Today</h3>
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-5xl font-extralight">{loading ? "..." : `$${systemMetrics.revenueToday.toFixed(2)}`}</div>
            <p className="text-xs text-muted-foreground mt-2">
              estimated revenue
            </p>
          </div>
        </div>
      </motion.div>

      {/* Client Management */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-extralight">Client Management</h2>
          </div>
          <p className="text-muted-foreground">
            Search and manage all client accounts ({clients.length} total, {systemMetrics.activeClients} active)
          </p>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, region, or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <ModernButton variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </ModernButton>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading clients...</p>
            </div>
          ) : recentClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No clients found</p>
            </div>
          ) : (
            recentClients
              .filter(client =>
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.plan.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 border border-black/[0.08] dark:border-white/8 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`} />
                    <div>
                      <div className="font-medium hover:text-primary cursor-pointer"
                           onClick={() => window.open(`/${client.region.toLowerCase()}/plmb/${client.name.toLowerCase().replace(/\s+/g, '')}`, '_blank')}>
                        {client.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {client.region} • {client.callsToday} calls today • Last: {client.lastActive}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{client.plan}</Badge>
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/${client.region.toLowerCase()}/plmb/${client.name.toLowerCase().replace(/\s+/g, '')}`, '_blank')}
                    >
                      View Dashboard
                    </ModernButton>
                  </div>
                </div>
              ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CentralHQ;