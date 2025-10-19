import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentClient } from '@/hooks/useCurrentClient';
import { useToast } from '@/hooks/use-toast';

export function LiveDemoSection() {
  const { profile } = useAuth();
  const { client } = useCurrentClient();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const extendedProfile = profile as any;

  const handleDemoClick = () => {
    if (isListening) {
      setIsListening(false);
      // Stop recording logic here
    } else {
      setIsListening(true);
      // Start recording logic here
      toast({
        title: "Voice Demo",
        description: "Voice demo feature coming soon. Use the 'Test Call' button for live testing.",
      });
      setTimeout(() => setIsListening(false), 2000);
    }
  };

  const playDemoResponse = async () => {
    if (isPlaying) {
      // Stop playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    // Check if client has intro audio file configured
    // Expected format: {client_id}_intro.ulaw (e.g., au_plmb_jamesonplumbing_001_intro.ulaw)
    if (!client?.intro_audio_file) {
      toast({
        title: "No intro audio configured",
        description: "Intro audio will be generated automatically during client provisioning. For now, use 'Test Call' button to hear the live AI.",
      });
      return;
    }

    try {
      setIsPlaying(true);

      // Construct Supabase storage URL
      // Bucket: audio-snippets, File: {client_id}_intro.ulaw
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/audio-snippets/${client.intro_audio_file}`;

      console.log('[LiveDemo] Attempting to play audio:', audioUrl);

      // Create and play audio
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = (e) => {
        console.error('[LiveDemo] Audio playback error:', e);
        setIsPlaying(false);
        toast({
          title: "Playback error",
          description: "Intro audio file not found. It will be generated during next client provisioning.",
          variant: "destructive",
        });
      };

      await audioRef.current.play();
      console.log('[LiveDemo] Audio playing successfully');

    } catch (error) {
      console.error('[LiveDemo] Audio playback exception:', error);
      setIsPlaying(false);
      toast({
        title: "Playback failed",
        description: "Could not play audio. Please try again or use Test Call button.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="font-manrope">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Live AI Demo
        </CardTitle>
        <p className="text-muted-foreground">
          Test your AI agent with your business information. This is how your customers will experience it.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Demo Button */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Button
              onClick={handleDemoClick}
              data-demo-button
              size="lg"
              className={`w-20 h-20 rounded-full p-0 transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/50' 
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isListening ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
            
            {isListening && (
              <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
            )}
          </div>
          
          <div className="text-center">
            <p className="font-medium">
              {isListening ? 'Listening...' : 'Click to start demo'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isListening 
                ? 'Speak naturally - ask about your services!' 
                : 'Test how customers will interact with your AI'
              }
            </p>
          </div>
        </div>

        {/* Demo Response Player */}
        {(isPlaying || isListening) && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">AI Response</span>
              </div>
              
              <Button
                onClick={playDemoResponse}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isPlaying ? (
                  <>
                    <VolumeX className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    Play
                  </>
                )}
              </Button>
            </div>
            
            <div className="mt-3 text-sm text-muted-foreground">
              {isListening ? (
                'AI is processing your request...'
              ) : (
                `Hello! Thank you for calling ${extendedProfile?.business_name || 'your business'}. 
                I'm your AI assistant. I can help schedule appointments, provide pricing information, 
                and answer questions about our ${extendedProfile?.business_type?.replace('-', ' ') || ''} services. 
                How can I help you today?`
              )}
            </div>
          </div>
        )}

        {/* Quick Test Suggestions */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Try asking:</h4>
          <div className="grid grid-cols-1 gap-2">
            {[
              "What are your business hours?",
              `How much does a service call cost?`,
              "Do you offer emergency services?",
              "What areas do you service?",
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2 px-3 text-xs"
                onClick={() => {
                  // Auto-fill suggestion logic
                  console.log('Suggestion clicked:', suggestion);
                }}
              >
                "{suggestion}"
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}