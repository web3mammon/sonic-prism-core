import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Phone, Square, Volume2, Download } from "lucide-react";
import { useClientAPI } from "@/hooks/useClientAPI";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TestCall {
  id: string;
  date: string;
  number: string;
  duration: string;
  status: string;
  callSid: string;
}

export default function Testing() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testScript, setTestScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<TestCall[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { client: apiClient } = useClientAPI();
  const { client: currentClient } = useCurrentClient();
  const { profile } = useAuth();

  // Fetch real test call history from database
  useEffect(() => {
    if (!currentClient?.client_id) {
      setTestHistory([]);
      setHistoryLoading(false);
      return;
    }

    const fetchTestHistory = async () => {
      try {
        setHistoryLoading(true);

        // Fetch recent call sessions for this client
        const { data: callSessions, error } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('client_id', currentClient.client_id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching test history:', error);
          return;
        }

        // Transform to TestCall format
        const formattedHistory: TestCall[] = (callSessions || []).map(call => ({
          id: call.id,
          date: new Date(call.created_at).toLocaleString(),
          number: call.caller_number || 'Unknown',
          duration: formatDuration(call.duration_seconds || 0),
          status: call.status,
          callSid: call.call_sid,
        }));

        setTestHistory(formattedHistory);
        setCurrentPage(1); // Reset to first page when data changes
      } catch (error) {
        console.error('Error fetching test history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchTestHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('test-call-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
          filter: `client_id=eq.${currentClient.client_id}`,
        },
        () => {
          // Refetch when data changes
          fetchTestHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentClient?.client_id]);

  // Helper function to format duration
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Real test call using actual voice AI pipeline via Twilio
  const handleStartTest = async () => {
    if (!testNumber) {
      toast.error("Please enter a test phone number");
      return;
    }

    if (!currentClient?.client_id) {
      toast.error("No client selected");
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Initiating test call...');
      console.log('Client ID:', currentClient.client_id);
      console.log('Phone Number:', testNumber);
      console.log('Test Scenario:', testScript);

      // Call the test-voice-call edge function to make REAL Twilio call
      const { data: { session } } = await supabase.auth.getSession();

      const SUPABASE_URL = 'https://btqccksigmohyjdxgrrj.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWNja3NpZ21vaHlqZHhncnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDY4MDEsImV4cCI6MjA3MzkyMjgwMX0.kOiOYBO-lro83HMSaCTlnryfRM3Md3pWkdAaYmVHhJ4';

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/test-voice-call`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            clientId: currentClient.client_id,
            phoneNumber: testNumber,
            testScenario: testScript || 'Manual test call from dashboard',
          }),
        }
      );

      const result = await response.json();
      console.log('🔍 Test call response:', result);

      if (!response.ok || result.error) {
        throw new Error(result.error || result.details || 'Failed to initiate test call');
      }

      toast.success(`📞 Real test call initiated! Call SID: ${result.callSid}`);
      console.log('✅ Test call initiated successfully');
      console.log('Call SID:', result.callSid);
      console.log('Session ID:', result.sessionId);
      console.log('Webhook URL:', result.webhookUrl);
      console.log('Message:', result.message);

      setIsCallActive(true);

      // Auto-complete after 30 seconds (real calls take time)
      setTimeout(async () => {
        setIsCallActive(false);
        toast.info("Test call window completed. Check call logs for results.");
      }, 30000);

    } catch (error) {
      console.error('❌ Test call failed:', error);
      toast.error(`Test call failed: ${error.message}`);
      setIsCallActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(testHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCalls = testHistory.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="space-y-2">
        <h1 className="text-5xl font-extralight mb-2">Testing Suite</h1>
        <p className="text-muted-foreground">
          Test your voice AI agent with custom scenarios and phone numbers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Test Call Interface */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="font-extralight">Manual Test Call</CardTitle>
            <CardDescription>
              Initiate a test call to validate your AI agent's performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testNumber">Test Phone Number</Label>
              <Input
                id="testNumber"
                placeholder="+1 (555) 123-4567"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testScript">Test Scenario (Optional)</Label>
              <Textarea
                id="testScript"
                placeholder="Describe the test scenario or specific prompts to test..."
                value={testScript}
                onChange={(e) => setTestScript(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleStartTest}
              disabled={isCallActive || !testNumber || isLoading}
            >
              {isCallActive || isLoading ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Call in Progress...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Test Call
                </>
              )}
            </Button>

            {isCallActive && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Test call active to {testNumber}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Test Calls */}
        <div className="space-y-6 pt-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extralight">Recent Test Calls</h2>
            <p className="text-muted-foreground">
              History of your test calls - updates in real-time
            </p>
          </div>
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : testHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No test calls yet</p>
                <p className="text-xs mt-1">Start a test call to see it appear here</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {currentCalls.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          test.status === "completed" ? "bg-green-500" :
                          test.status === "in-progress" ? "bg-blue-500 animate-pulse" :
                          test.status === "ringing" ? "bg-yellow-500 animate-pulse" :
                          "bg-red-500"
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{test.number}</p>
                          <p className="text-xs text-muted-foreground">{test.date}</p>
                        </div>
                        <Badge
                          variant={
                            test.status === "completed" ? "secondary" :
                            test.status === "in-progress" || test.status === "ringing" ? "default" :
                            "destructive"
                          }
                          className="text-xs"
                        >
                          {test.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-xs font-medium">{test.duration}</p>
                          <p className="text-xs text-muted-foreground">SID: {test.callSid.slice(-8)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, testHistory.length)} of {testHistory.length} calls
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}