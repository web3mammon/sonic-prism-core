import { useState } from "react";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Shield, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Activity,
  Database,
  Cloud
} from "lucide-react";

export default function System() {
  const { systemStatus, loading, error, refresh } = useSystemStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoScaling, setAutoScaling] = useState(true);

  // Use real system data from API
  const systemOverview = systemStatus?.system.overview || {
    status: "unknown",
    uptime_percentage: 0,
    last_restart: "",
    version: ""
  };

  const systemMetrics = systemStatus?.system.metrics ? {
    cpu: {
      usage: systemStatus.system.metrics.cpu.usage_percent,
      cores: systemStatus.system.metrics.cpu.cores,
      temperature: systemStatus.system.metrics.cpu.temperature
    },
    memory: {
      usage: systemStatus.system.metrics.memory.usage_percent,
      total: systemStatus.system.metrics.memory.total_gb,
      used: systemStatus.system.metrics.memory.used_gb
    },
    storage: {
      usage: systemStatus.system.metrics.storage.usage_percent,
      total: systemStatus.system.metrics.storage.total_gb,
      used: systemStatus.system.metrics.storage.used_gb
    },
    network: {
      inbound: systemStatus.system.metrics.network.recv_mb_total,
      outbound: systemStatus.system.metrics.network.sent_mb_total,
      latency: systemStatus.system.metrics.network.latency_ms
    }
  } : {
    cpu: { usage: 0, cores: 0, temperature: 0 },
    memory: { usage: 0, total: 0, used: 0 },
    storage: { usage: 0, total: 0, used: 0 },
    network: { inbound: 0, outbound: 0, latency: 0 }
  };

  const services = systemStatus?.system.services || [];
  const integrations = systemStatus?.system.integrations || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
      case "connected":
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
      case "disconnected":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
      case "connected":
      case "healthy":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">{status}</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">{status}</Badge>;
      case "error":
      case "disconnected":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading system status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <span className="ml-2 text-red-500">Error loading system status: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage your AI agent infrastructure
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(systemOverview.status)}
              <div>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
                <p className="text-sm text-muted-foreground">System Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{systemOverview.uptime_percentage}%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-bold">Jan 10</p>
                <p className="text-sm text-muted-foreground">Last Restart</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Cloud className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-lg font-bold">{systemOverview.version}</p>
                <p className="text-sm text-muted-foreground">Version</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
            <CardDescription>
              Real-time system resource utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">CPU Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {systemMetrics.cpu.usage}% • {systemMetrics.cpu.cores} cores • {systemMetrics.cpu.temperature}°C
                </span>
              </div>
              <Progress value={systemMetrics.cpu.usage} className="h-2" />
            </div>

            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Memory Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {systemMetrics.memory.used}GB / {systemMetrics.memory.total}GB
                </span>
              </div>
              <Progress value={systemMetrics.memory.usage} className="h-2" />
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Storage Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {systemMetrics.storage.used}GB / {systemMetrics.storage.total}GB
                </span>
              </div>
              <Progress value={systemMetrics.storage.usage} className="h-2" />
            </div>

            {/* Network */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wifi className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Network I/O</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ↓{systemMetrics.network.inbound}MB/s ↑{systemMetrics.network.outbound}MB/s • {systemMetrics.network.latency}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Controls */}
        <Card>
          <CardHeader>
            <CardTitle>System Controls</CardTitle>
            <CardDescription>
              Manage system settings and maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable incoming calls
                </p>
              </div>
              <Switch 
                checked={maintenanceMode} 
                onCheckedChange={setMaintenanceMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Scaling</p>
                <p className="text-sm text-muted-foreground">
                  Automatically scale resources based on demand
                </p>
              </div>
              <Switch 
                checked={autoScaling} 
                onCheckedChange={setAutoScaling}
              />
            </div>

            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart Services
              </Button>
              <Button className="w-full" variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                Run Security Scan
              </Button>
              <Button className="w-full" variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Backup Database
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>
              Monitor individual service health and uptime
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">Port {service.port}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{service.health}%</span>
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* External Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>External Integrations</CardTitle>
            <CardDescription>
              Monitor third-party service connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrations.map((integration, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(integration.status)}
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">Last sync: {integration.last_sync}</p>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}