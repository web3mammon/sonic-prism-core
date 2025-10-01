import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Play, Square, Settings, Phone, ExternalLink, MoreVertical } from 'lucide-react';

interface VoiceAIClient {
  id: string;
  client_id: string;
  region: string;
  industry: string;
  business_name: string;
  port: number;
  status: 'active' | 'inactive' | 'starting' | 'stopping' | 'error';
  phone_number?: string;
  config: any;
  created_at: string;
  updated_at: string;
}

interface VoiceAIClientCardProps {
  client: VoiceAIClient;
  onStatusChange: (clientId: string, newStatus: string) => void;
}

export const VoiceAIClientCard: React.FC<VoiceAIClientCardProps> = ({ 
  client, 
  onStatusChange 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'starting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'stopping':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>;
      case 'starting':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'stopping':
        return <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  const handleStart = () => {
    onStatusChange(client.client_id, 'starting');
    // In a real implementation, this would trigger the backend to start the Voice AI server
  };

  const handleStop = () => {
    onStatusChange(client.client_id, 'stopping');
    // In a real implementation, this would trigger the backend to stop the Voice AI server
  };

  const handleRestart = () => {
    onStatusChange(client.client_id, 'starting');
    // In a real implementation, this would restart the Voice AI server
  };

  return (
    <Card className="relative group hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(client.status)}
            <Badge variant="outline" className={getStatusColor(client.status)}>
              {client.status.toUpperCase()}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Logs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRestart}>
                <Play className="h-4 w-4 mr-2" />
                Restart
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <CardTitle className="text-lg">{client.business_name}</CardTitle>
        <CardDescription>
          {client.region.toUpperCase()}/{client.industry.toUpperCase()}/{client.client_id}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Port:</span>
            <p className="font-mono">{client.port}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone:</span>
            <p className="font-mono">{client.phone_number || 'Not assigned'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {client.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleStart}
              disabled={client.status === 'starting' || client.status === 'stopping'}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {client.status === 'starting' ? 'Starting...' : 
               client.status === 'stopping' ? 'Stopping...' : 'Start'}
            </Button>
          )}
          
          {client.phone_number && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`tel:${client.phone_number}`, '_blank')}
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Created: {new Date(client.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};