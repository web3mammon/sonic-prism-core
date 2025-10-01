import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, UserCheck } from 'lucide-react';
import { SentimentIndicator } from './SentimentIndicator';
import { ConversationFlowVisualization } from './ConversationFlowVisualization';

interface LiveConversationMonitorProps {
  call: any;
  onTransfer?: () => void;
}

export const LiveConversationMonitor: React.FC<LiveConversationMonitorProps> = ({
  call,
  onTransfer
}) => {
  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 animate-pulse text-green-500" />
            Live Call
          </CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20">
            {call.duration_seconds}s
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Caller Info */}
        <div>
          <p className="text-sm text-muted-foreground">Caller</p>
          <p className="font-medium">{call.caller_number || 'Unknown'}</p>
        </div>

        {/* Sentiment */}
        {call.sentiment_score !== null && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current Sentiment</p>
            <SentimentIndicator score={call.sentiment_score} showLabel size="md" />
          </div>
        )}

        {/* Conversation Stage */}
        {call.conversation_stage && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Conversation Progress</p>
            <ConversationFlowVisualization currentStage={call.conversation_stage} />
          </div>
        )}

        {/* Intent */}
        {call.primary_intent && (
          <div>
            <p className="text-sm text-muted-foreground">Detected Intent</p>
            <Badge variant="secondary" className="mt-1">
              {call.primary_intent.replace(/_/g, ' ')}
            </Badge>
          </div>
        )}

        {/* Transfer Button */}
        {call.sentiment_score < -0.3 && !call.transfer_requested && onTransfer && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onTransfer}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Transfer to Human Agent
          </Button>
        )}

        {call.transfer_requested && (
          <Badge variant="destructive" className="w-full justify-center py-2">
            Transfer in Progress
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
