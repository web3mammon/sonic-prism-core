import { useState } from "react";
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

export default function Testing() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testScript, setTestScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { client: apiClient } = useClientAPI();
  const { client: currentClient } = useCurrentClient();
  const { profile } = useAuth();

  // Real test call using actual voice AI pipeline
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
      setIsCallActive(true);

      // Call edge function that uses Deepgram → GPT → TTS pipeline
      const { data, error } = await supabase.functions.invoke('test-voice-call', {
        body: {
          clientId: currentClient.client_id,
          phoneNumber: testNumber,
          testScenario: testScript || 'General voice AI test',
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge function error: ${error.message || JSON.stringify(error)}`);
      }

      if (data?.error) {
        console.error('API error:', data.error);
        throw new Error(data.error);
      }

      toast.success(`Test call initiated! Call SID: ${data.callSid}`);
      console.log('Test call details:', data);

      // Monitor call status
      setTimeout(() => {
        setIsCallActive(false);
        toast.info("Test call completed - check call history for results");
      }, 30000); // 30 seconds for actual conversation test

    } catch (error) {
      console.error('Test call failed:', error);
      toast.error(`Test call failed: ${error.message}`);
      setIsCallActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock test history for now - TODO: Pull from call_sessions table
  const testHistory = [
    { id: 1, date: "2024-01-15 14:30", number: "+1234567890", duration: "2:34", status: "completed", score: 95 },
    { id: 2, date: "2024-01-15 12:15", number: "+1987654321", duration: "1:42", status: "completed", score: 88 },
    { id: 3, date: "2024-01-14 16:45", number: "+1555123456", duration: "3:12", status: "failed", score: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Testing Suite</h1>
        <p className="text-muted-foreground">
          Test your voice AI agent with custom scenarios and phone numbers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Call Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Test Call</CardTitle>
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

        {/* Recent Test Calls - moved from bottom to replace Quick Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Calls</CardTitle>
            <CardDescription>
              History of your test calls with performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testHistory.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      test.status === "completed" ? "bg-green-500" : "bg-red-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{test.number}</p>
                      <p className="text-xs text-muted-foreground">{test.date}</p>
                    </div>
                    <Badge variant={test.status === "completed" ? "secondary" : "destructive"} className="text-xs">
                      {test.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-xs font-medium">{test.duration}</p>
                      <p className="text-xs text-muted-foreground">Score: {test.score}%</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Volume2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}