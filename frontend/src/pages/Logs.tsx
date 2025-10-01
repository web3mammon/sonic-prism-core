import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Download, 
  RefreshCw, 
  Filter, 
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentClient } from "@/hooks/useCurrentClient";

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { client, loading } = useCurrentClient();

  // For now, we'll show a message that logs are not available yet
  // In the future, this would connect to a system logs table
  const logEntries: any[] = [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const filteredLogs = logEntries.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.callId && log.callId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "debug":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Warning</Badge>;
      case "info":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Info</Badge>;
      case "debug":
        return <Badge variant="outline">Debug</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Here you would fetch fresh logs from your backend
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const logLevelCounts = {
    error: 0,
    warning: 0,
    info: 0,
    debug: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Logs</h1>
        <p className="text-muted-foreground">
          Monitor system events, errors, and debugging information
        </p>
      </div>

      {/* Log Level Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{logLevelCounts.error}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{logLevelCounts.warning}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Info className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{logLevelCounts.info}</p>
                <p className="text-sm text-muted-foreground">Info</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold text-gray-600">{logLevelCounts.debug}</p>
                <p className="text-sm text-muted-foreground">Debug</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Live System Logs</CardTitle>
          <CardDescription>
            Real-time system events and debugging information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by message, source, or call ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Errors Only</SelectItem>
                <SelectItem value="warning">Warnings Only</SelectItem>
                <SelectItem value="info">Info Only</SelectItem>
                <SelectItem value="debug">Debug Only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Date Range
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Log Entries */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-4 p-3 border rounded-lg hover:bg-muted/50 text-sm">
                <div className="flex items-center space-x-2 w-32 flex-shrink-0">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {log.timestamp.split(' ')[1]}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 w-20 flex-shrink-0">
                  {getLevelIcon(log.level)}
                  {getLevelBadge(log.level)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">{log.source}</span>
                    {log.callId && (
                      <Badge variant="outline" className="text-xs">
                        {log.callId}
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground">{log.message}</p>
                  {log.details && (
                    <p className="text-muted-foreground text-xs mt-1">{log.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>System logs for {client?.business_name || 'this client'} will appear here when available.</p>
              <p className="text-sm mt-1">No log entries found at this time.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}