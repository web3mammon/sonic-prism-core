import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Clock, DollarSign, FileText, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CallSession {
  id: string;
  client_id: string;
  call_sid: string;
  caller_number?: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  transcript: any;
  transcript_summary?: string;
  recording_url?: string;
  cost_amount: number;
  metadata: any;
}

interface VoiceAIClient {
  client_id: string;
  business_name: string;
  region: string;
  industry: string;
}

export const CallSessionsMonitor: React.FC = () => {
  const { toast } = useToast();
  const [callSessions, setCallSessions] = useState<CallSession[]>([]);
  const [clients, setClients] = useState<Record<string, VoiceAIClient>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallSessions();
    fetchClients();

    // Set up real-time subscription for call sessions
    const subscription = supabase
      .channel('call-sessions-monitor')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_sessions' }, 
        () => {
          fetchCallSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCallSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCallSessions(data || []);
    } catch (error) {
      console.error('Error fetching call sessions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_ai_clients')
        .select('client_id, business_name, region, industry');

      if (error) throw error;
      
      const clientsMap = (data || []).reduce((acc, client) => {
        acc[client.client_id] = client;
        return acc;
      }, {} as Record<string, VoiceAIClient>);
      
      setClients(clientsMap);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ringing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no-answer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (number?: string) => {
    if (!number) return 'Unknown';
    // Simple phone number formatting
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeCalls = callSessions.filter(call => 
    call.status === 'ringing' || call.status === 'in-progress'
  );
  
  const recentCalls = callSessions.filter(call => 
    call.status === 'completed' || call.status === 'failed' || call.status === 'no-answer'
  );

  return (
    <div className="space-y-6">
      {/* Active Calls Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Active Calls ({activeCalls.length})</h3>
        {activeCalls.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No active calls</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeCalls.map((call) => (
              <Card key={call.id} className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getStatusColor(call.status)}>
                        {call.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {clients[call.client_id]?.business_name || call.client_id}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(call.duration_seconds)}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg">
                    {formatPhoneNumber(call.caller_number)}
                  </CardTitle>
                  <CardDescription>
                    Started: {new Date(call.start_time).toLocaleTimeString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{call.call_sid}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Transcript
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Calls Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Calls</h3>
        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
            <CardDescription>Recent completed calls across all clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {recentCalls.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent calls</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className={getStatusColor(call.status)}>
                          {call.status}
                        </Badge>
                        <div>
                          <p className="font-medium">{formatPhoneNumber(call.caller_number)}</p>
                          <p className="text-sm text-muted-foreground">
                            {clients[call.client_id]?.business_name || call.client_id}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(call.duration_seconds)}</span>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${call.cost_amount.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <div className="text-muted-foreground">
                          {new Date(call.start_time).toLocaleDateString()}
                        </div>
                        
                        {call.recording_url && (
                          <Button variant="ghost" size="sm">
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};