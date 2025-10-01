import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  Phone, 
  DollarSign, 
  MessageSquare, 
  Download,
  ExternalLink,
  User,
  Calendar
} from "lucide-react";

interface CallDetailModalProps {
  call: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallDetailModal({ call, open, onOpenChange }: CallDetailModalProps) {
  if (!call) return null;

  const { rawData } = call;
  const transcript = rawData?.transcript || [];
  const metadata = rawData?.metadata || {};
  const recordingUrl = rawData?.recording_url;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Call Details</DialogTitle>
              <DialogDescription>
                Call ID: {call.id}
              </DialogDescription>
            </div>
            {getStatusBadge(call.status)}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Call Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Call Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Date & Time</p>
                    <p className="text-sm text-muted-foreground">{formatDate(rawData.start_time)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{call.duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Cost</p>
                    <p className="text-sm text-muted-foreground">{call.cost}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Intent</p>
                    <p className="text-sm text-muted-foreground">{call.intent}</p>
                  </div>
                </div>
                {rawData.prospect_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Caller Name</p>
                      <p className="text-sm text-muted-foreground">{rawData.prospect_name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            {rawData.transcript_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Call Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rawData.transcript_summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Transcript */}
            {transcript.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transcript.map((entry: any, index: number) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <Badge variant={entry.speaker === 'ai' ? 'default' : 'secondary'}>
                            {entry.speaker === 'ai' ? 'AI' : 'Caller'}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">{entry.text}</p>
                          {entry.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            {Object.keys(metadata).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    {Object.entries(metadata).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className="text-sm text-muted-foreground mt-1">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Recording */}
            {recordingUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recording</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <audio controls className="w-full">
                    <source src={recordingUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in New Tab
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={recordingUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
