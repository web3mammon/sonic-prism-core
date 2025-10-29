import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Phone, Volume2, VolumeX, Mic, MicOff, Clock, Users } from 'lucide-react';
import { useCallSessions } from '@/hooks/useVoiceAI';
import { SentimentIndicator } from '@/components/analytics/SentimentIndicator';

interface LiveCallMonitorProps {
  clientId?: string;
  showAll?: boolean;
}

export const LiveCallMonitor: React.FC<LiveCallMonitorProps> = ({ 
  clientId, 
  showAll = false 
}) => {
  const { sessions, loading } = useCallSessions(clientId);
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const activeCalls = sessions.filter(call => 
    call.status === 'ringing' || call.status === 'in-progress'
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (number?: string) => {
    if (!number) return 'Unknown';
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'ringing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-green-100 text-green-800 border-green-200 animate-pulse';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeCalls.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
          <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Calls</h3>
          <p className="text-muted-foreground text-sm">
            All Voice AI clients are ready to receive calls
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeCalls.map((call) => (
            <Card
              key={call.id}
              className={`bg-muted/50 border-l-4 ${
                call.status === 'ringing' ? 'border-l-blue-500' : 'border-l-green-500'
              } hover:shadow-md transition-shadow cursor-pointer`}
              onClick={() => setSelectedCall(call)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className={getCallStatusColor(call.status)}>
                      {call.status === 'ringing' ? 'RINGING' : 'LIVE'}
                    </Badge>
                    <div className="text-lg font-mono font-semibold">
                      {formatPhoneNumber(call.caller_number)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(call.duration_seconds)}</span>
                  </div>
                </div>
                
                <CardDescription>
                  Call ID: {call.call_sid} • Started: {new Date(call.start_time).toLocaleTimeString()}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Call Progress Bar */}
                  {call.status === 'in-progress' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Call in progress</span>
                        <span>{formatDuration(call.duration_seconds)}</span>
                      </div>
                      <Progress value={Math.min((call.duration_seconds / 300) * 100, 100)} />
                    </div>
                  )}

                  {/* Call Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" disabled>
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled>
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>Client: {call.client_id}</span>
                    </div>
                  </div>

                  {/* Sentiment & Conversation Flow */}
                  {call.sentiment_score !== null && (
                    <div className="flex items-center justify-between">
                      <SentimentIndicator score={call.sentiment_score} showLabel size="sm" />
                      {call.conversation_stage && (
                        <Badge variant="outline" className="text-xs">
                          {call.conversation_stage}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Transfer Alert */}
                  {call.transfer_requested && (
                    <Badge variant="destructive" className="w-full justify-center">
                      Transfer Requested
                    </Badge>
                  )}

                  {/* Recent Transcript Preview */}
                  {call.transcript && call.transcript.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs font-medium mb-1">Recent Activity:</div>
                      <div className="text-sm">
                        {call.transcript.slice(-2).map((msg: any, idx: number) => (
                          <div key={idx} className="flex items-start space-x-2 mb-1 last:mb-0">
                            <span className={`font-medium text-xs ${
                              msg.role === 'user' ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {msg.role === 'user' ? 'Caller:' : 'AI:'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {msg.content?.substring(0, 100)}
                              {msg.content?.length > 100 ? '...' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call Details Modal/Sidebar could go here */}
      {selectedCall && (
        <CallDetailsModal 
          call={selectedCall} 
          onClose={() => setSelectedCall(null)} 
        />
      )}
    </div>
  );
};

// Call Details Modal Component
const CallDetailsModal: React.FC<{ call: any; onClose: () => void }> = ({ 
  call, 
  onClose 
}) => {
  return (
    <Card className="fixed right-4 top-4 w-96 max-h-[80vh] z-50 shadow-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Call Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        <CardDescription>
          {call.caller_number} • {call.call_sid}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {/* Call Info */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant="outline" className={
                  call.status === 'ringing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }>
                  {call.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-mono">{formatDuration(call.duration_seconds)}</span>
              </div>
              <div className="flex justify-between">
                <span>Client:</span>
                <span>{call.client_id}</span>
              </div>
            </div>

            {/* Live Transcript */}
            {call.transcript && call.transcript.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Live Transcript</h4>
                <div className="space-y-2 bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {call.transcript.map((msg: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <span className={`font-medium ${
                        msg.role === 'user' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {msg.role === 'user' ? 'Caller' : 'AI'}:
                      </span>
                      <span className="ml-2">{msg.content}</span>
                      <div className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};