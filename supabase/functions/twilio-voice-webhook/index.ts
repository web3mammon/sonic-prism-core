import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const url = new URL(req.url);
  const callSid = url.searchParams.get('call_sid');
  const callerNumber = url.searchParams.get('caller');
  const calledNumber = url.searchParams.get('called');

  if (!callSid || !calledNumber) {
    console.error('Missing required parameters');
    socket.close();
    return response;
  }

  console.log(`Twilio WebSocket connected - Call: ${callSid}, From: ${callerNumber}, To: ${calledNumber}`);

  // Database lookup to get client configuration (replaces port-based routing)
  const { data: client, error: clientError } = await supabaseClient
    .from('voice_ai_clients')
    .select('*')
    .eq('phone_number', calledNumber)
    .eq('status', 'active')
    .single();

  if (clientError || !client) {
    console.error('Client not found for phone number:', calledNumber);
    socket.close();
    return response;
  }

  console.log(`✅ Client identified: ${client.business_name} (${client.client_id})`);

  // Create call session record
  const { data: callSession, error: sessionError } = await supabaseClient
    .from('call_sessions')
    .insert({
      call_sid: callSid,
      client_id: client.client_id,
      caller_number: callerNumber,
      status: 'in-progress',
      start_time: new Date().toISOString(),
      metadata: {
        called_number: calledNumber,
        business_name: client.business_name
      }
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Failed to create call session:', sessionError);
  }

  // Initialize Voice AI session
  const voiceSession = new VoiceAISession(
    client,
    callSid,
    callerNumber || 'unknown',
    supabaseClient
  );
  
  socket.onopen = () => {
    console.log(`WebSocket opened for ${client.business_name}`);
    voiceSession.start(socket);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      await voiceSession.handleMessage(message, socket);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log(`WebSocket closed for ${client.business_name}`);
    voiceSession.cleanup();
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    voiceSession.cleanup();
  };

  return response;
});

class VoiceAISession {
  private client: any;
  private callSid: string;
  private callerNumber: string;
  private supabase: any;
  private transcript: any[] = [];
  private conversationLog: any[] = [];
  private isActive: boolean = false;
  private audioBuffer: Uint8Array[] = [];
  private sessionStartTime: number;

  constructor(client: any, callSid: string, callerNumber: string, supabase: any) {
    this.client = client;
    this.callSid = callSid;
    this.callerNumber = callerNumber;
    this.supabase = supabase;
    this.sessionStartTime = Date.now();
  }

  async start(socket: WebSocket) {
    this.isActive = true;
    console.log(`🎙️ Starting Voice AI session for ${this.client.business_name}`);
    
    // Send greeting if configured
    if (this.client.greeting_message) {
      await this.generateAndSendSpeech(this.client.greeting_message, socket);
      
      this.conversationLog.push({
        speaker: 'assistant',
        content: this.client.greeting_message,
        timestamp: new Date().toISOString(),
        message_type: 'greeting'
      });
    }
  }

  async handleMessage(message: any, socket: WebSocket) {
    if (!this.isActive) return;

    switch (message.event) {
      case 'connected':
        console.log('Twilio Media Stream connected');
        break;

      case 'start':
        console.log('Media Stream started');
        break;

      case 'media':
        await this.handleAudioData(message, socket);
        break;

      case 'stop':
        console.log('Media Stream stopped');
        await this.handleStreamStop();
        break;

      default:
        console.log('Unknown message event:', message.event);
    }
  }

  private async handleAudioData(message: any, socket: WebSocket) {
    // Accumulate audio data (μ-law encoded from Twilio)
    const audioData = new Uint8Array(
      atob(message.media.payload)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    this.audioBuffer.push(audioData);

    // Process audio in chunks (adjust based on STT requirements)
    if (this.audioBuffer.length >= 50) {
      await this.processAudioBuffer(socket);
      this.audioBuffer = [];
    }
  }

  private async processAudioBuffer(socket: WebSocket) {
    try {
      const totalLength = this.audioBuffer.reduce((acc, arr) => acc + arr.length, 0);
      const combinedAudio = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const buffer of this.audioBuffer) {
        combinedAudio.set(buffer, offset);
        offset += buffer.length;
      }

      const audioBase64 = btoa(String.fromCharCode(...combinedAudio));

      // Call STT function to transcribe
      const { data: sttResult, error: sttError } = await this.supabase.functions.invoke(
        'voice-stt',
        {
          body: {
            audio: audioBase64,
            client_id: this.client.client_id,
            format: 'mulaw'
          }
        }
      );

      if (sttError || !sttResult?.text) {
        console.error('STT error:', sttError);
        return;
      }

      const transcription = sttResult.text.trim();
      
      if (transcription) {
        console.log('👤 User said:', transcription);
        
        this.conversationLog.push({
          speaker: 'user',
          content: transcription,
          timestamp: new Date().toISOString(),
          message_type: 'transcription'
        });

        // Generate AI response using router function
        const { data: responseData, error: routerError } = await this.supabase.functions.invoke(
          'voice-router',
          {
            body: {
              user_input: transcription,
              client_id: this.client.client_id,
              call_sid: this.callSid,
              conversation_history: this.conversationLog
            }
          }
        );

        if (routerError || !responseData) {
          console.error('Router error:', routerError);
          return;
        }

        console.log('🤖 AI Response:', responseData);

        // Handle response (could be audio snippet or generated speech)
        if (responseData.type === 'audio') {
          // Use pre-recorded audio snippet
          await this.sendAudioSnippet(responseData.audio_files, socket);
        } else {
          // Generate speech from text
          await this.generateAndSendSpeech(responseData.text, socket);
        }

        this.conversationLog.push({
          speaker: 'assistant',
          content: responseData.text || responseData.audio_files,
          timestamp: new Date().toISOString(),
          message_type: responseData.type
        });
      }
    } catch (error) {
      console.error('Error processing audio buffer:', error);
    }
  }

  private async sendAudioSnippet(audioFiles: string, socket: WebSocket) {
    // TODO: Implement audio file retrieval from storage/CDN
    console.log('📢 Playing audio snippet:', audioFiles);
    
    // For now, fallback to TTS
    await this.generateAndSendSpeech(`Playing pre-recorded message: ${audioFiles}`, socket);
  }

  private async generateAndSendSpeech(text: string, socket: WebSocket) {
    try {
      console.log('🔊 Generating speech:', text);

      const { data: ttsResult, error: ttsError } = await this.supabase.functions.invoke(
        'voice-tts',
        {
          body: {
            text: text,
            client_id: this.client.client_id,
            voice_id: this.client.voice_id
          }
        }
      );

      if (ttsError || !ttsResult?.audio) {
        console.error('TTS error:', ttsError);
        return;
      }

      // Send audio to Twilio (convert back to μ-law if needed)
      const mediaMessage = {
        event: 'media',
        streamSid: this.callSid,
        media: {
          payload: ttsResult.audio
        }
      };
      
      socket.send(JSON.stringify(mediaMessage));
    } catch (error) {
      console.error('Speech generation error:', error);
    }
  }

  private async handleStreamStop() {
    this.isActive = false;
    
    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    // Log all conversation entries
    for (const log of this.conversationLog) {
      await this.supabase.from('conversation_logs').insert({
        call_sid: this.callSid,
        client_id: this.client.client_id,
        speaker: log.speaker,
        content: log.content,
        message_type: log.message_type,
        created_at: log.timestamp
      });
    }

    // Update call session with final data
    await this.supabase
      .from('call_sessions')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        duration_seconds: duration,
        transcript: this.conversationLog,
        transcript_summary: this.generateTranscriptSummary()
      })
      .eq('call_sid', this.callSid);

    console.log(`✅ Call session completed: ${duration}s`);
  }

  private generateTranscriptSummary(): string {
    const userMessages = this.conversationLog
      .filter(msg => msg.speaker === 'user')
      .map(msg => msg.content)
      .join(' ');
    
    return userMessages.length > 200 
      ? userMessages.substring(0, 200) + '...'
      : userMessages;
  }

  cleanup() {
    this.isActive = false;
    console.log(`🧹 Cleaned up Voice AI session for ${this.client.business_name}`);
  }
}
