import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
  const clientId = url.searchParams.get('client_id');
  const callSid = url.searchParams.get('call_sid');

  if (!clientId || !callSid) {
    console.error('Missing client_id or call_sid in WebSocket connection');
    socket.close();
    return response;
  }

  console.log(`Voice AI WebSocket connected: ${clientId}, Call: ${callSid}`);

  // Get client configuration
  const { data: client, error: clientError } = await supabaseClient
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (clientError || !client) {
    console.error('Client not found:', clientId);
    socket.close();
    return response;
  }

  // Initialize AI session
  const aiSession = new VoiceAISession(client, callSid, supabaseClient);
  
  socket.onopen = () => {
    console.log(`WebSocket opened for client ${clientId}`);
    aiSession.start();
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      await aiSession.handleMessage(message, socket);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log(`WebSocket closed for client ${clientId}`);
    aiSession.cleanup();
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    aiSession.cleanup();
  };

  return response;
});

class VoiceAISession {
  private client: any;
  private callSid: string;
  private supabase: any;
  private transcript: any[] = [];
  private isActive: boolean = false;
  private audioBuffer: Uint8Array[] = [];

  constructor(client: any, callSid: string, supabase: any) {
    this.client = client;
    this.callSid = callSid;
    this.supabase = supabase;
  }

  async start() {
    this.isActive = true;
    console.log(`Starting Voice AI session for ${this.client.client_id}`);
    
    // Update call session status
    await this.supabase
      .from('call_sessions')
      .update({
        status: 'in-progress',
        updated_at: new Date().toISOString()
      })
      .eq('call_sid', this.callSid);
  }

  async handleMessage(message: any, socket: WebSocket) {
    if (!this.isActive) return;

    switch (message.event) {
      case 'connected':
        console.log('Twilio Media Stream connected');
        break;

      case 'start':
        console.log('Media Stream started');
        await this.handleStreamStart(message, socket);
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

  private async handleStreamStart(message: any, socket: WebSocket) {
    // Send initial greeting
    const greeting = this.client.config?.system_prompt || 
      `Hello! I'm the AI assistant for ${this.client.business_name}. How can I help you today?`;
    
    await this.generateAndSendSpeech(greeting, socket);
    
    // Add to transcript
    this.transcript.push({
      role: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString()
    });
  }

  private async handleAudioData(message: any, socket: WebSocket) {
    // Accumulate audio data
    const audioData = new Uint8Array(
      atob(message.media.payload)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    this.audioBuffer.push(audioData);

    // Process audio in chunks (e.g., every 1 second)
    if (this.audioBuffer.length >= 50) { // Adjust based on your needs
      await this.processAudioBuffer(socket);
      this.audioBuffer = [];
    }
  }

  private async processAudioBuffer(socket: WebSocket) {
    try {
      // Combine audio buffer
      const totalLength = this.audioBuffer.reduce((acc, arr) => acc + arr.length, 0);
      const combinedAudio = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const buffer of this.audioBuffer) {
        combinedAudio.set(buffer, offset);
        offset += buffer.length;
      }

      // Convert to base64 for Deepgram
      const audioBase64 = btoa(String.fromCharCode(...combinedAudio));

      // Transcribe with Deepgram
      const transcription = await this.transcribeAudio(audioBase64);
      
      if (transcription && transcription.trim()) {
        console.log('User said:', transcription);
        
        // Add to transcript
        this.transcript.push({
          role: 'user',
          content: transcription,
          timestamp: new Date().toISOString()
        });

        // Generate AI response
        const response = await this.generateAIResponse(transcription);
        
        if (response) {
          // Add to transcript
          this.transcript.push({
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString()
          });

          // Generate and send speech
          await this.generateAndSendSpeech(response, socket);
        }
      }
    } catch (error) {
      console.error('Error processing audio buffer:', error);
    }
  }

  private async transcribeAudio(audioBase64: string): Promise<string> {
    try {
      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${Deno.env.get('DEEPGRAM_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: { buffer: audioBase64 },
          model: 'nova-2',
          language: 'en-US',
          punctuate: true,
          diarize: false
        })
      });

      if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.statusText}`);
      }

      const data = await response.json();
      const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      
      return transcript;
    } catch (error) {
      console.error('Transcription error:', error);
      return '';
    }
  }

  private async generateAIResponse(userInput: string): Promise<string> {
    try {
      const systemPrompt = this.client.config?.system_prompt || 
        `You are a helpful AI assistant for ${this.client.business_name}. Be professional, friendly, and helpful.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.transcript.slice(-10), // Include recent conversation history
        { role: 'user', content: userInput }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('AI response generation error:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  private async generateAndSendSpeech(text: string, socket: WebSocket) {
    try {
      const voiceId = this.client.config?.voice_id || 'alloy';
      
      // Generate speech with ElevenLabs or OpenAI TTS
      const audioData = await this.generateSpeech(text, voiceId);
      
      if (audioData) {
        // Send audio to Twilio
        const mediaMessage = {
          event: 'media',
          streamSid: this.callSid,
          media: {
            payload: btoa(String.fromCharCode(...audioData))
          }
        };
        
        socket.send(JSON.stringify(mediaMessage));
      }
    } catch (error) {
      console.error('Speech generation error:', error);
    }
  }

  private async generateSpeech(text: string, voiceId: string): Promise<Uint8Array | null> {
    try {
      // Try ElevenLabs first
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || ''
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return new Uint8Array(audioBuffer);
      }

      // Fallback to OpenAI TTS
      const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy',
          response_format: 'mp3'
        })
      });

      if (openaiResponse.ok) {
        const audioBuffer = await openaiResponse.arrayBuffer();
        return new Uint8Array(audioBuffer);
      }

      throw new Error('Both TTS services failed');
    } catch (error) {
      console.error('TTS generation error:', error);
      return null;
    }
  }

  private async handleStreamStop() {
    this.isActive = false;
    
    // Update call session with final transcript
    await this.supabase
      .from('call_sessions')
      .update({
        transcript: this.transcript,
        transcript_summary: this.generateTranscriptSummary(),
        updated_at: new Date().toISOString()
      })
      .eq('call_sid', this.callSid);
  }

  private generateTranscriptSummary(): string {
    const userMessages = this.transcript
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');
    
    return userMessages.length > 200 
      ? userMessages.substring(0, 200) + '...'
      : userMessages;
  }

  cleanup() {
    this.isActive = false;
    console.log(`Cleaned up Voice AI session for ${this.client.client_id}`);
  }
}