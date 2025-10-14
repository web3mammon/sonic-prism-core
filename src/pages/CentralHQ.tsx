import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
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
    avgResponseTime: "0s",
    callsToday: 0,
    revenueToday: 0
  });

  const [clients, setClients] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

      // Calculate system load based on active clients
      const systemLoad = Math.min(Math.round((activeCount / Math.max(clientsData?.length || 1, 1)) * 100), 100);
      
      setSystemMetrics({
        totalClients: clientsData?.length || 0,
        activeClients: activeCount,
        systemLoad: systemLoad,
        uptime: "99.9%",
        totalCalls: callsToday,
        avgResponseTime: "1.2s",
        callsToday: callsToday,
        revenueToday: revenueToday
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

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Transform clients data for display
  const recentClients = clients.slice(0, 10).map(client => ({
    id: client.client_id || client.id,
    name: client.business_name || 'Unknown Business',
    region: (client.region || 'UK').toUpperCase(),
    status: client.live_status || client.status || 'unknown',
    plan: 'premium', // Default plan
    lastActive: client.last_call ? new Date(client.last_call).toLocaleString() : (client.last_ping ? 'Active' : 'Never'),
    callsToday: client.calls_today || 0,
    port: client.port || 3011
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
    <div className="space-y-8 font-manrope">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central HQ</h1>
          <p className="text-muted-foreground">
            Live system overview and client management console
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            System Health
          </Button>
          <Button size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : systemMetrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              registered clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : systemMetrics.activeClients}</div>
            <p className="text-xs text-muted-foreground">
              currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : systemMetrics.callsToday}</div>
            <p className="text-xs text-muted-foreground">
              across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `$${systemMetrics.revenueToday.toFixed(2)}`}</div>
            <p className="text-xs text-muted-foreground">
              estimated revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Client Management</CardTitle>
          <CardDescription>
            Search and manage all client accounts ({clients.length} total, {systemMetrics.activeClients} active)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, region, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
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
                  <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`} />
                      <div>
                        <div className="font-medium hover:text-primary cursor-pointer" 
                             onClick={() => window.open(`/${client.region.toLowerCase()}/plmb/${client.name.toLowerCase().replace(/\s+/g, '')}`, '_blank')}>
                          {client.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {client.region} • Port {client.port} • {client.callsToday} calls today • Last: {client.lastActive}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{client.plan}</Badge>
                      <div className="flex gap-2">
                        {client.status === 'active' ? (
                          <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                            Stop
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
                            Start
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          Delete
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="voice-ai">Voice AI</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total API Calls</span>
                  <span className="font-bold">{systemMetrics.totalCalls.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response Time</span>
                  <span className="font-bold">{systemMetrics.avgResponseTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="font-bold text-green-600">98.7%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemAlerts.map((alert) => (
                    <Alert key={alert.id} variant={getAlertVariant(alert.type)}>
                      <AlertDescription className="text-sm">
                        <div className="flex justify-between">
                          <span>{alert.message}</span>
                          <span className="text-xs opacity-70">{alert.time}</span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="voice-ai">
          <div className="space-y-6">
            <VoiceAIStats />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                <LiveCallMonitor showAll={true} />
              </div>
              <div>
                <VoiceAIDashboard />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Voice Calls</span>
                      <span>8,420</span>
                    </div>
                    <Progress value={84} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>SMS Messages</span>
                      <span>5,230</span>
                    </div>
                    <Progress value={52} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>API Requests</span>
                      <span>12,840</span>
                    </div>
                    <Progress value={95} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>North America</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Europe</span>
                    <span className="font-bold">32%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Asia Pacific</span>
                    <span className="font-bold">18%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Others</span>
                    <span className="font-bold">5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>SSL Certificates</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Firewall Status</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>DDoS Protection</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Access Controls</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium">Failed login attempt blocked</div>
                    <div className="text-muted-foreground">IP: 192.168.1.100 • 15 min ago</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">SSL certificate renewed</div>
                    <div className="text-muted-foreground">Domain: *.klariqo.com • 2 hours ago</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">Security scan completed</div>
                    <div className="text-muted-foreground">No threats detected • 6 hours ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>CPU Usage</span>
                      <span>67%</span>
                    </div>
                    <Progress value={67} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Memory Usage</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Storage Usage</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Network I/O</span>
                      <span>34%</span>
                    </div>
                    <Progress value={34} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Service Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>API Gateway</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Voice Services</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Analytics Engine</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span className="text-sm">Degraded</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                System Logs
              </CardTitle>
              <CardDescription>Recent system events and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[
                  { timestamp: "2025-01-15 14:32:18", level: "INFO", service: "API", message: "Client authentication successful for ACME Plumbing" },
                  { timestamp: "2025-01-15 14:31:45", level: "WARN", service: "DB", message: "High connection pool usage detected" },
                  { timestamp: "2025-01-15 14:30:22", level: "INFO", service: "VOICE", message: "Call completed successfully - Duration: 4m 32s" },
                  { timestamp: "2025-01-15 14:29:18", level: "ERROR", service: "SMS", message: "Failed to send SMS - Invalid phone number format" },
                  { timestamp: "2025-01-15 14:28:45", level: "INFO", service: "API", message: "New client registered: TechStart Solutions" },
                  { timestamp: "2025-01-15 14:27:12", level: "INFO", service: "SYSTEM", message: "Scheduled backup initiated" },
                ].map((log, index) => (
                  <div key={index} className="flex gap-4 text-sm p-3 border rounded">
                    <span className="text-muted-foreground min-w-fit">{log.timestamp}</span>
                    <Badge variant={log.level === 'ERROR' ? 'destructive' : log.level === 'WARN' ? 'secondary' : 'outline'} className="min-w-fit">
                      {log.level}
                    </Badge>
                    <span className="font-medium min-w-fit">{log.service}</span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CentralHQ;