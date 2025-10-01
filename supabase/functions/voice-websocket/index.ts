import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Session state management
const activeSessions = new Map<string, VoiceSession>();

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

  console.log(`🔌 Voice WebSocket connected: ${clientId}, Call: ${callSid}`);

  // Get client configuration
  const { data: client, error: clientError } = await supabaseClient
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (clientError || !client) {
    console.error('❌ Client not found:', clientId);
    socket.close();
    return response;
  }

  // Initialize session
  const session = new VoiceSession(client, callSid, supabaseClient, socket);
  activeSessions.set(callSid, session);
  
  socket.onopen = () => {
    console.log(`✅ WebSocket opened for client ${clientId}`);
    session.start();
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      await session.handleTwilioMessage(message);
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log(`🔌 WebSocket closed for client ${clientId}`);
    session.cleanup();
    activeSessions.delete(callSid);
  };

  socket.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
    session.cleanup();
    activeSessions.delete(callSid);
  };

  return response;
});

class VoiceSession {
  private client: any;
  private callSid: string;
  private supabase: any;
  private twilioSocket: WebSocket;
  private deepgramSocket: WebSocket | null = null;
  private elevenLabsSocket: WebSocket | null = null;
  private transcript: any[] = [];
  private isActive: boolean = false;
  private audioBuffer: Uint8Array[] = [];
  private streamSid: string | null = null;
  private interimTranscript: string = '';
  private isSpeaking: boolean = false;

  constructor(client: any, callSid: string, supabase: any, twilioSocket: WebSocket) {
    this.client = client;
    this.callSid = callSid;
    this.supabase = supabase;
    this.twilioSocket = twilioSocket;
  }

  async start() {
    this.isActive = true;
    console.log(`🚀 Starting Voice AI session for ${this.client.client_id}`);
    
    // Create call session in DB
    await this.supabase
      .from('call_sessions')
      .insert({
        call_sid: this.callSid,
        client_id: this.client.client_id,
        business_name: this.client.business_name,
        status: 'in-progress',
        start_time: new Date().toISOString()
      });

    // Initialize Deepgram WebSocket
    await this.initDeepgram();
    
    // Initialize ElevenLabs WebSocket
    await this.initElevenLabs();

    // Send greeting
    await this.sendGreeting();
  }

  private async initDeepgram() {
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    if (!DEEPGRAM_API_KEY) {
      console.error('❌ DEEPGRAM_API_KEY not set');
      return;
    }

    // Twilio sends μ-law encoded audio at 8kHz, mono
    const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&encoding=mulaw&sample_rate=8000&channels=1&punctuate=true&interim_results=true&utterance_end_ms=1000&vad_events=true`;
    
    this.deepgramSocket = new WebSocket(deepgramUrl, {
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`
      }
    });

    this.deepgramSocket.onopen = () => {
      console.log('🎤 Deepgram WebSocket connected');
    };

    this.deepgramSocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'UtteranceEnd') {
        // User finished speaking, process the transcript
        if (this.interimTranscript.trim()) {
          console.log(`👤 User said: ${this.interimTranscript}`);
          await this.processUserInput(this.interimTranscript);
          this.interimTranscript = '';
        }
      } else if (data.channel?.alternatives?.[0]?.transcript) {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript.trim()) {
          if (data.is_final) {
            this.interimTranscript += ' ' + transcript;
          } else {
            // Interim results - update UI if needed
            console.log(`🎤 Interim: ${transcript}`);
          }
        }
      }
    };

    this.deepgramSocket.onerror = (error) => {
      console.error('❌ Deepgram error:', error);
    };

    this.deepgramSocket.onclose = () => {
      console.log('🎤 Deepgram WebSocket closed');
    };
  }

  private async initElevenLabs() {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY not set');
      return;
    }

    const voiceId = this.client.voice_id || '6FINSXmstr7jTeJkpd2r';
    const ttsConfig = this.client.tts_config || {};
    
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${ttsConfig.model || 'eleven_turbo_v2_5'}`;
    
    this.elevenLabsSocket = new WebSocket(wsUrl);

    this.elevenLabsSocket.onopen = () => {
      console.log('🔊 ElevenLabs WebSocket connected');
      
      // Send BOS (Beginning of Stream)
      this.elevenLabsSocket?.send(JSON.stringify({
        text: ' ',
        voice_settings: {
          stability: ttsConfig.stability || 0.5,
          similarity_boost: ttsConfig.similarity_boost || 0.75,
          style: 0,
          use_speaker_boost: true
        },
        xi_api_key: ELEVENLABS_API_KEY,
      }));
    };

    this.elevenLabsSocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.audio) {
        // Stream audio chunk to Twilio
        this.sendAudioToTwilio(data.audio);
      }
      
      if (data.isFinal) {
        this.isSpeaking = false;
        console.log('✅ TTS complete');
      }
    };

    this.elevenLabsSocket.onerror = (error) => {
      console.error('❌ ElevenLabs error:', error);
    };

    this.elevenLabsSocket.onclose = () => {
      console.log('🔊 ElevenLabs WebSocket closed');
    };
  }

  async handleTwilioMessage(message: any) {
    if (!this.isActive) return;

    switch (message.event) {
      case 'connected':
        console.log('📞 Twilio Media Stream connected');
        break;

      case 'start':
        console.log('▶️ Media Stream started');
        this.streamSid = message.start.streamSid;
        break;

      case 'media':
        // Forward audio to Deepgram for STT
        if (this.deepgramSocket?.readyState === WebSocket.OPEN && !this.isSpeaking) {
          const audioData = new Uint8Array(
            atob(message.media.payload)
              .split('')
              .map(c => c.charCodeAt(0))
          );
          this.deepgramSocket.send(audioData);
        }
        break;

      case 'stop':
        console.log('⏹️ Media Stream stopped');
        await this.handleStreamStop();
        break;

      default:
        console.log('Unknown message event:', message.event);
    }
  }

  private async sendGreeting() {
    const greeting = this.client.greeting_message || 
      `Hello! I'm the AI assistant for ${this.client.business_name}. How can I help you today?`;
    
    await this.speakText(greeting);
    
    // Add to transcript
    this.transcript.push({
      role: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString()
    });
  }

  private async processUserInput(userInput: string) {
    // Add to transcript
    this.transcript.push({
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    });

    // Log conversation
    await this.supabase
      .from('conversation_logs')
      .insert({
        call_sid: this.callSid,
        client_id: this.client.client_id,
        speaker: 'user',
        message_type: 'text',
        content: userInput
      });

    // Check for audio snippet match first
    const audioSnippet = await this.checkAudioSnippets(userInput);
    
    if (audioSnippet) {
      console.log(`🎵 Using audio snippet: ${audioSnippet}`);
      await this.playAudioSnippet(audioSnippet);
      return;
    }

    // Generate AI response with streaming
    await this.generateStreamingResponse(userInput);
  }

  private async checkAudioSnippets(userInput: string): Promise<string | null> {
    const audioSnippets = this.client.audio_snippets || {};
    const inputLower = userInput.toLowerCase().trim();

    for (const [intent, audioFile] of Object.entries(audioSnippets)) {
      const keywords = intent.toLowerCase().split('_');
      if (keywords.some(keyword => inputLower.includes(keyword))) {
        return audioFile as string;
      }
    }

    return null;
  }

  private async playAudioSnippet(audioFile: string) {
    try {
      // Fetch audio snippet from the serve-audio-snippet edge function
      const snippetUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/serve-audio-snippet?client_id=${this.client.client_id}&filename=${audioFile}`;
      
      const response = await fetch(snippetUrl);
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch audio snippet: ${response.status}`);
        return;
      }

      const audioData = await response.text(); // base64 μ-law audio
      
      // Send audio snippet to Twilio
      if (this.streamSid && this.twilioSocket.readyState === WebSocket.OPEN) {
        const mediaMessage = {
          event: 'media',
          streamSid: this.streamSid,
          media: {
            payload: audioData
          }
        };
        
        this.twilioSocket.send(JSON.stringify(mediaMessage));
        console.log(`🎵 Playing audio snippet: ${audioFile}`);
      }
    } catch (error) {
      console.error('❌ Error playing audio snippet:', error);
    }
  }

  private async generateStreamingResponse(userInput: string) {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set');
      return;
    }

    const systemPrompt = this.client.system_prompt || 
      `You are an AI assistant for ${this.client.business_name}. Be professional, friendly, and helpful. Keep responses concise (under 50 words for voice).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.transcript.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const conversationConfig = this.client.conversation_config || {};

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: conversationConfig.model || 'gpt-4',
          messages: messages,
          max_tokens: conversationConfig.max_tokens || 150,
          temperature: conversationConfig.temperature || 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  fullResponse += content;
                  
                  // Stream to TTS as we get chunks
                  if (this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
                    this.elevenLabsSocket.send(JSON.stringify({
                      text: content,
                      try_trigger_generation: true
                    }));
                  }
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      }

      // Send EOS (End of Stream) to ElevenLabs
      if (this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
        this.elevenLabsSocket.send(JSON.stringify({
          text: ''
        }));
      }

      console.log(`🤖 AI Response: ${fullResponse}`);

      // Add to transcript
      this.transcript.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString()
      });

      // Log conversation
      await this.supabase
        .from('conversation_logs')
        .insert({
          call_sid: this.callSid,
          client_id: this.client.client_id,
          speaker: 'assistant',
          message_type: 'text',
          content: fullResponse
        });

    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      await this.speakText('I apologize, but I encountered an error. Please try again.');
    }
  }

  private async speakText(text: string) {
    this.isSpeaking = true;
    
    if (this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
      // Stream text to ElevenLabs
      const words = text.split(' ');
      for (const word of words) {
        this.elevenLabsSocket.send(JSON.stringify({
          text: word + ' ',
          try_trigger_generation: true
        }));
        // Small delay to allow streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Send EOS
      this.elevenLabsSocket.send(JSON.stringify({
        text: ''
      }));
    }
  }

  private sendAudioToTwilio(base64Audio: string) {
    if (!this.streamSid) return;

    // ElevenLabs returns MP3/MPEG, but Twilio expects μ-law at 8kHz
    // For now, we'll convert the audio format
    // Note: This is a simplified conversion. In production, use proper audio codec library
    
    try {
      // Decode base64 MP3 audio
      const mp3Binary = atob(base64Audio);
      const mp3Bytes = new Uint8Array(mp3Binary.length);
      for (let i = 0; i < mp3Binary.length; i++) {
        mp3Bytes[i] = mp3Binary.charCodeAt(i);
      }

      // TODO: Implement proper MP3 to μ-law conversion
      // For now, we're passing through the audio as-is
      // This may cause audio quality issues that need proper codec conversion
      
      const mediaMessage = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: base64Audio
        }
      };
      
      if (this.twilioSocket.readyState === WebSocket.OPEN) {
        this.twilioSocket.send(JSON.stringify(mediaMessage));
      }
    } catch (error) {
      console.error('❌ Error sending audio to Twilio:', error);
    }
  }

  private async handleStreamStop() {
    this.isActive = false;
    
    // Update call session with final transcript
    const endTime = new Date();
    const { data: session } = await this.supabase
      .from('call_sessions')
      .select('start_time')
      .eq('call_sid', this.callSid)
      .single();

    const durationSeconds = session 
      ? Math.floor((endTime.getTime() - new Date(session.start_time).getTime()) / 1000)
      : 0;

    await this.supabase
      .from('call_sessions')
      .update({
        transcript: this.transcript,
        transcript_summary: this.generateTranscriptSummary(),
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('call_sid', this.callSid);

    console.log(`✅ Call session completed: ${this.callSid}`);
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
    
    if (this.deepgramSocket) {
      this.deepgramSocket.close();
      this.deepgramSocket = null;
    }
    
    if (this.elevenLabsSocket) {
      this.elevenLabsSocket.close();
      this.elevenLabsSocket = null;
    }
    
    console.log(`🧹 Cleaned up Voice AI session for ${this.client.client_id}`);
  }
}
