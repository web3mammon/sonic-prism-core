import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Download, 
  RefreshCw, 
  Filter, 
  Calendar,
  MessageSquare,
  User,
  Bot,
  Clock,
  Loader2,
  Phone
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { supabase } from "@/integrations/supabase/client";
import { SentimentIndicator } from "@/components/analytics/SentimentIndicator";

interface ConversationLog {
  id: string;
  call_sid: string;
  speaker: string;
  message_type: string;
  content: string;
  created_at: string;
  response_time_ms?: number;
  audio_files_used?: string[];
}

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCallSid, setSelectedCallSid] = useState<string | null>(null);

  const { client } = useCurrentClient();

  useEffect(() => {
    if (client?.client_id) {
      fetchLogs();
    }
  }, [client?.client_id]);

  const fetchLogs = async () => {
    if (!client?.client_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_logs')
        .select('*')
        .eq('client_id', client.client_id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching conversation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
    setIsRefreshing(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.call_sid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpeaker = speakerFilter === "all" || log.speaker === speakerFilter;
    const matchesCall = !selectedCallSid || log.call_sid === selectedCallSid;
    return matchesSearch && matchesSpeaker && matchesCall;
  });

  // Get unique call sids for filtering
  const uniqueCallSids = [...new Set(logs.map(log => log.call_sid))];

  // Group logs by call
  const callsWithLogs = uniqueCallSids.map(callSid => ({
    callSid,
    logs: logs.filter(log => log.call_sid === callSid),
    timestamp: logs.find(log => log.call_sid === callSid)?.created_at || ''
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="space-y-2">
        <h1 className="text-5xl font-extralight mb-2">Call Conversation Logs</h1>
        <p className="text-muted-foreground">
          View detailed conversation transcripts and interactions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-5xl font-extralight">{uniqueCallSids.length}</p>
                <p className="text-sm text-muted-foreground mt-2">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-5xl font-extralight">{logs.length}</p>
                <p className="text-sm text-muted-foreground mt-2">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-5xl font-extralight">{logs.filter(l => l.speaker === 'user').length}</p>
                <p className="text-sm text-muted-foreground mt-2">User Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Bot className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-5xl font-extralight">{logs.filter(l => l.speaker === 'assistant').length}</p>
                <p className="text-sm text-muted-foreground mt-2">AI Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <hr className="border-border" />

      {/* Log Viewer */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-extralight">Conversation Logs</h2>
          <p className="text-muted-foreground">
            Real-time conversation transcripts from your Voice AI calls
          </p>
        </div>
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by message or call ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={speakerFilter} onValueChange={setSpeakerFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by speaker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Speakers</SelectItem>
                <SelectItem value="user">User Only</SelectItem>
                <SelectItem value="assistant">AI Only</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={selectedCallSid || "all"} 
              onValueChange={(val) => setSelectedCallSid(val === "all" ? null : val)}
            >
              <SelectTrigger className="w-64">
                <Phone className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by call" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Calls</SelectItem>
                {uniqueCallSids.slice(0, 10).map(callSid => (
                  <SelectItem key={callSid} value={callSid}>
                    {callSid.substring(0, 20)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Conversation Logs by Call */}
          {selectedCallSid ? (
            // Show detailed view for selected call
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`flex gap-4 p-4 border rounded-lg ${
                      log.speaker === 'user' ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-green-50 dark:bg-green-950/20'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {log.speaker === 'user' ? (
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={log.speaker === 'user' ? 'secondary' : 'default'}>
                          {log.speaker === 'user' ? 'User' : 'AI Assistant'}
                        </Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleTimeString()}
                          {log.response_time_ms && (
                            <span>• {log.response_time_ms}ms</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed">{log.content}</p>
                      {log.audio_files_used && log.audio_files_used.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Audio snippet used
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            // Show call list view
            <div className="space-y-3">
              {callsWithLogs.map((call) => (
                <Card
                  key={call.callSid}
                  className="cursor-pointer hover:shadow-md transition-shadow bg-muted/50"
                  onClick={() => setSelectedCallSid(call.callSid)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{call.callSid}</p>
                          <p className="text-sm text-muted-foreground">
                            {call.logs.length} messages • {new Date(call.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredLogs.length === 0 && !selectedCallSid && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No conversation logs found for {client?.business_name || 'this client'}.</p>
              <p className="text-sm mt-1">Logs will appear here as calls are handled.</p>
            </div>
          )}

          {selectedCallSid && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setSelectedCallSid(null)}>
                ← Back to All Calls
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
