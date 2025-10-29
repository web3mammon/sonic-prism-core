import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildVoiceOptimizedPrompt, normalizeForTTS } from "../_shared/voice-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FlexPrice API configuration
const FLEXPRICE_API_KEY = Deno.env.get('FLEXPRICE_API_KEY');
const FLEXPRICE_BASE_URL = Deno.env.get('FLEXPRICE_BASE_URL') || 'https://api.cloud.flexprice.io/v1';

interface TwilioVoiceSession {
  client: any;
  voiceProfile: any; // Voice profile from voice_profiles table
  callSid: string;
  callerNumber: string;
  streamSid: string | null;
  supabase: any;
  conversationHistory: Array<{ role: string; content: string }>;
  conversationLog: Array<{ speaker: string; content: string; timestamp: string; message_type: string }>;
  deepgramConnection: WebSocket | null;
  isProcessing: boolean;
  sessionStartTime: number;
  // Session management (from FastAPI session.py)
  sessionMemory: {
    intro_played: boolean;
    pricing_discussed: boolean;
    service_explained: boolean;
  };
  sessionVariables: Record<string, any>;
  // Audio chunk queue (like nlc-demo AudioPlayer)
  audioChunkBuffer: { [index: number]: Uint8Array };
  nextChunkToSend: number;
  currentSocket: WebSocket | null;
  // Keepalive timers
  deepgramKeepaliveTimer: number | null;
  supabaseKeepaliveTimer: number | null;
}

const sessions = new Map<string, TwilioVoiceSession>();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;

  // ========================================
  // COMPREHENSIVE CONNECTION DEBUGGING
  // ========================================
  console.log(`[Twilio] ========================================`);
  console.log(`[Twilio] NEW CONNECTION ATTEMPT`);
  console.log(`[Twilio] Timestamp: ${new Date().toISOString()}`);
  console.log(`[Twilio] Full URL: ${req.url}`);
  console.log(`[Twilio] Method: ${req.method}`);

  // Log all headers
  const headerObj: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerObj[key] = value;
  });
  console.log(`[Twilio] Headers:`, JSON.stringify(headerObj, null, 2));

  const upgradeHeader = headers.get("upgrade") || "";
  console.log(`[Twilio] Upgrade header: "${upgradeHeader}"`);

  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.error(`[Twilio] ❌ NOT A WEBSOCKET REQUEST (upgrade: "${upgradeHeader}")`);
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  console.log(`[Twilio] ✅ Valid WebSocket upgrade request`);

  const { socket, response } = Deno.upgradeWebSocket(req);
  console.log(`[Twilio] ✅ WebSocket upgraded successfully`);

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const callSid = pathParts[pathParts.length - 1];

  console.log(`[Twilio] Path segments:`, pathParts);
  console.log(`[Twilio] Extracted callSid: "${callSid}"`);

  if (!callSid) {
    console.error('[Twilio] ❌ Missing callSid in URL path');
    socket.close();
    return response;
  }

  console.log(`[Twilio] ✅ WebSocket connection established for call: ${callSid}`);
  console.log(`[Twilio] Waiting for 'start' event with parameters...`);
  console.log(`[Twilio] ========================================`);

  // Don't create session yet - wait for 'start' event with parameters from TwiML

  socket.onopen = () => {
    console.log(`[Twilio] WebSocket opened for call: ${callSid}`);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      // Only log important events (not media events - they happen every 20ms)
      if (message.event !== 'media') {
        console.log(`[Twilio] Received event: ${message.event} for call ${callSid}`);
      }
      await handleTwilioMessage(callSid, message, socket, supabaseClient);
    } catch (error) {
      console.error('[Twilio] Message handling error:', error);
      console.error('[Twilio] Error details:', error);
    }
  };

  socket.onclose = async () => {
    console.log(`[Twilio] WebSocket closed for call: ${callSid}`);
    await cleanupSession(callSid);
  };

  socket.onerror = (error) => {
    console.error('[Twilio] WebSocket error:', error);
  };

  return response;
});

async function initializeDeepgram(callSid: string, twilioSocket: WebSocket): Promise<boolean> {
  const session = sessions.get(callSid);
  if (!session) return false;

  const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
  if (!DEEPGRAM_API_KEY) {
    console.error('[Deepgram] API key not configured');
    return false;
  }

  try {
    // For Twilio: μ-law, 8kHz (NOT linear16/24kHz like web widget)
    const deepgramWs = new WebSocket(
      'wss://api.deepgram.com/v1/listen?' + new URLSearchParams({
        encoding: 'mulaw',           // Twilio uses μ-law
        sample_rate: '8000',          // Twilio uses 8kHz
        channels: '1',
        interim_results: 'true',
        punctuate: 'true',
        endpointing: '300',           // ⚡ FASTER: 300ms like nlc-demo (was 400ms)
        vad_events: 'true',            // Voice activity detection for faster responses
      }),
      ['token', DEEPGRAM_API_KEY]
    );

    const connectionPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        console.error('[Deepgram] Connection timeout');
        resolve(false);
      }, 10000);

      deepgramWs.onopen = () => {
        clearTimeout(timeout);
        console.log('[Deepgram] Connected (μ-law 8kHz for Twilio)');
        session.deepgramConnection = deepgramWs;

        // Start keepalive to prevent Deepgram timeout (send every 5 seconds)
        session.deepgramKeepaliveTimer = setInterval(() => {
          if (deepgramWs.readyState === WebSocket.OPEN) {
            try {
              deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
              console.log('[Deepgram] Keepalive sent');
            } catch (error) {
              console.error('[Deepgram] Keepalive error:', error);
            }
          }
        }, 5000); // Every 5 seconds

        resolve(true);
      };

      deepgramWs.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[Deepgram] Connection error:', error);
        resolve(false);
      };
    });

    deepgramWs.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'Results') {
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          const isFinal = data.is_final;

          if (transcript && transcript.trim() && isFinal && !session.isProcessing) {
            console.log(`[Deepgram] Final transcript: ${transcript}`);

            session.isProcessing = true;

            session.conversationLog.push({
              speaker: 'user',
              content: transcript,
              timestamp: new Date().toISOString(),
              message_type: 'transcription'
            });

            // Process with GPT streaming
            await processWithGPTStreaming(callSid, transcript, twilioSocket);
          }
        }
      } catch (error) {
        console.error('[Deepgram] Message parsing error:', error);
      }
    };

    deepgramWs.onclose = () => {
      console.log('[Deepgram] Connection closed');
    };

    return await connectionPromise;
  } catch (error) {
    console.error('[Deepgram] Connection error:', error);
    return false;
  }
}

async function handleTwilioMessage(callSid: string, message: any, socket: WebSocket, supabaseClient: any) {
  const session = sessions.get(callSid);
  // Session might not exist yet (waiting for 'start' event)
  if (!session && message.event !== 'start' && message.event !== 'connected') return;

  switch (message.event) {
    case 'connected':
      console.log('[Twilio] Media Stream connected');
      break;

    case 'start':
      console.log(`[Twilio] ========================================`);
      console.log('[Twilio] START EVENT RECEIVED');
      console.log(`[Twilio] Full message:`, JSON.stringify(message, null, 2));

      const streamSid = message.start?.streamSid || null;
      const customParams = message.start?.customParameters || {};

      console.log(`[Twilio] Stream SID: ${streamSid}`);
      console.log('[Twilio] Custom parameters:', JSON.stringify(customParams, null, 2));

      // Extract parameters from TwiML
      const clientId = customParams.client_id;
      const caller = customParams.caller;
      const called = customParams.called;
      const direction = customParams.direction;

      console.log(`[Twilio] Extracted values:`);
      console.log(`  - client_id: "${clientId}"`);
      console.log(`  - caller: "${caller}"`);
      console.log(`  - called: "${called}"`);
      console.log(`  - direction: "${direction}"`);

      if (!clientId) {
        console.error('[Twilio] ❌ No client_id in start event - cannot proceed');
        socket.close();
        return;
      }

      // Look up client
      const { data: client, error: clientError } = await supabaseClient
        .from('voice_ai_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .single();

      if (clientError || !client) {
        console.error('[Twilio] Client not found:', clientId, clientError);
        socket.close();
        return;
      }

      console.log(`[Twilio] ✅ Client loaded: ${client.business_name}`);

      // Check user access (trial + subscription logic)
      const accessCheck = await checkUserAccess(client);

      if (!accessCheck.allowed) {
        console.log(`[Access] ❌ Access denied - ${accessCheck.reason}`);

        // Determine rejection message based on reason
        let rejectionMessage = "Thank you for calling. ";
        if (accessCheck.reason === 'trial_expired_time') {
          rejectionMessage += "Your 3-day free trial has expired. Please visit your dashboard to upgrade your plan and continue using our service.";
        } else if (accessCheck.reason === 'trial_expired_credits') {
          rejectionMessage += "You have used all 10 free trial calls. Please visit your dashboard to upgrade your plan and continue making calls.";
        } else {
          rejectionMessage += "Your account has run out of credits. Please visit your dashboard to add more credits or upgrade your plan.";
        }

        // Load voice profile first to get correct voice for rejection message
        let rejectionVoiceId = client.voice_id || 'pNInz6obpgDQGcFmaJgB'; // Default to Adam

        try {
          const audioResponse = await generateTTS(rejectionMessage, rejectionVoiceId);
          if (audioResponse && streamSid) {
            socket.send(JSON.stringify({
              event: 'media',
              streamSid: streamSid,
              media: { payload: audioResponse }
            }));

            // Wait a bit for audio to play, then hang up
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds for longer message
          }
        } catch (error) {
          console.error('[Twilio] Error playing rejection message:', error);
        }

        // Hang up the call
        socket.send(JSON.stringify({
          event: 'stop',
          streamSid: streamSid
        }));
        socket.close();
        return;
      }

      console.log(`[Access] ✅ Access granted - ${accessCheck.reason}`);

      // Load voice profile
      let voiceProfile = null;
      if (client.voice_id) {
        const { data: profile, error: profileError } = await supabaseClient
          .from('voice_profiles')
          .select('*')
          .eq('voice_id', client.voice_id)
          .single();

        if (profileError) {
          console.error('[Twilio] Failed to load voice profile:', profileError);
        } else {
          voiceProfile = profile;
          console.log(`[Twilio] ✅ Voice profile loaded: ${profile.name} (${profile.accent})`);
        }
      }

      // Check if database session already exists (from test-voice-call or webhook)
      const { data: existingSession } = await supabaseClient
        .from('call_sessions')
        .select('id')
        .eq('call_sid', callSid)
        .maybeSingle();

      if (existingSession) {
        console.log('[Twilio] ✅ Database session already exists (from test-voice-call)');
        // Just update the status
        await supabaseClient
          .from('call_sessions')
          .update({
            status: 'in-progress',
            metadata: {
              direction,
              called_number: called,
              stream_sid: streamSid
            }
          })
          .eq('call_sid', callSid);
      } else {
        console.log('[Twilio] Creating new database session');
        // Create database session
        const { error: dbError } = await supabaseClient
          .from('call_sessions')
          .insert({
            call_sid: callSid,
            client_id: clientId,
            caller_number: caller || '',
            status: 'in-progress',
            start_time: new Date().toISOString(),
            metadata: {
              direction,
              called_number: called,
              stream_sid: streamSid
            }
          });

        if (dbError) {
          console.error('[Twilio] Failed to create DB session:', dbError);
          // Continue anyway
        } else {
          console.log('[Twilio] ✅ Database session created');
        }
      }

      // Create in-memory session
      const newSession: TwilioVoiceSession = {
        client,
        voiceProfile, // Voice profile from database
        callSid,
        callerNumber: caller || '',
        streamSid,
        supabase: supabaseClient,
        conversationHistory: [],
        conversationLog: [],
        deepgramConnection: null,
        isProcessing: false,
        sessionStartTime: Date.now(),
        sessionMemory: {
          intro_played: false,
          pricing_discussed: false,
          service_explained: false,
        },
        sessionVariables: {},
        // Audio chunk queue (like nlc-demo)
        audioChunkBuffer: {},
        nextChunkToSend: 0,
        currentSocket: socket,
        // Keepalive timers
        deepgramKeepaliveTimer: null,
        supabaseKeepaliveTimer: null,
      };

      sessions.set(callSid, newSession);
      console.log('[Twilio] ✅ In-memory session created');

      // Initialize Deepgram
      const deepgramReady = await initializeDeepgram(callSid, socket);
      if (!deepgramReady) {
        console.error('[Twilio] Failed to initialize Deepgram');
        socket.close();
        return;
      }

      // Start Supabase keepalive to prevent 150s idle timeout (send ping every 30s)
      const currentSession = sessions.get(callSid);
      if (currentSession) {
        currentSession.supabaseKeepaliveTimer = setInterval(() => {
          try {
            socket.send(JSON.stringify({
              event: 'ping',
              timestamp: Date.now()
            }));
            console.log('[Supabase] Keepalive ping sent to prevent timeout');
          } catch (error) {
            console.error('[Supabase] Keepalive ping error:', error);
          }
        }, 30000); // Every 30 seconds
      }

      // Play pre-recorded intro immediately (instant, pre-warms connections)
      if (client.intro_audio_file) {
        console.log('[Twilio] Playing pre-recorded intro audio');
        await playPreRecordedAudio(callSid, socket, client.intro_audio_file);
      } else {
        console.log('[Twilio] No intro audio configured - silence during warmup');
      }
      break;

    case 'media':
      await handleTwilioAudio(callSid, message.media.payload);
      break;

    case 'stop':
      console.log('[Twilio] Media Stream stopped');
      await finalizeCallSession(callSid);
      break;

    default:
      // Silently ignore unknown events
      break;
  }
}

async function handleTwilioAudio(callSid: string, audioPayloadBase64: string) {
  const session = sessions.get(callSid);
  if (!session || !session.deepgramConnection) return;

  try {
    // Decode μ-law audio from Twilio
    const audioData = Uint8Array.from(atob(audioPayloadBase64), c => c.charCodeAt(0));

    // Forward to Deepgram
    if (session.deepgramConnection.readyState === WebSocket.OPEN) {
      session.deepgramConnection.send(audioData);
    }
  } catch (error) {
    console.error('[Twilio] Error processing audio:', error);
  }
}

async function playPreRecordedAudio(callSid: string, socket: WebSocket, audioFileName: string) {
  const session = sessions.get(callSid);
  if (!session) return;

  try {
    const startTime = Date.now();
    console.log(`[PreRecorded] Fetching ${audioFileName} from Supabase Storage`);

    // Fetch pre-recorded μ-law audio from Supabase Storage
    const storageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/audio-snippets/${audioFileName}`;

    const response = await fetch(storageUrl);
    if (!response.ok) {
      console.error('[PreRecorded] Failed to fetch audio:', response.status);
      return;
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);
    console.log(`[PreRecorded] Fetched ${audioBytes.length} bytes in ${Date.now() - startTime}ms`);

    // Convert to base64
    let binary = '';
    for (let j = 0; j < audioBytes.length; j++) {
      binary += String.fromCharCode(audioBytes[j]);
    }
    const audioBase64 = btoa(binary);

    // Send to Twilio immediately
    const mediaMessage = {
      event: 'media',
      streamSid: session.streamSid,
      media: {
        payload: audioBase64
      }
    };

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(mediaMessage));
      console.log(`[PreRecorded] ✅ Sent intro audio (${audioBytes.length} bytes) in ${Date.now() - startTime}ms`);

      // Mark intro as played
      session.sessionMemory.intro_played = true;
    }
  } catch (error) {
    console.error('[PreRecorded] Error playing audio:', error);
  }
}

async function sendGreeting(callSid: string, socket: WebSocket) {
  const session = sessions.get(callSid);
  if (!session) return;

  const greeting = session.client.greeting_message;
  console.log(`[Greeting] Sending: ${greeting}`);

  await generateAndStreamTTS(callSid, greeting, socket, 0);

  session.conversationLog.push({
    speaker: 'assistant',
    content: greeting,
    timestamp: new Date().toISOString(),
    message_type: 'greeting'
  });

  session.sessionMemory.intro_played = true;
}

async function processWithGPTStreaming(callSid: string, userInput: string, socket: WebSocket) {
  const session = sessions.get(callSid);
  if (!session) return;

  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) {
    console.error('[GPT-OSS] Groq API key not configured');
    session.isProcessing = false;
    return;
  }

  // Build voice-optimized system prompt using voice profile
  const systemPrompt = session.voiceProfile
    ? buildVoiceOptimizedPrompt(
        {
          business_name: session.client.business_name,
          region: session.client.region,
          industry: session.client.industry,
          system_prompt: session.client.system_prompt,
          channel_type: 'phone',
          business_hours: session.client.business_hours,
          timezone: session.client.timezone
        },
        session.voiceProfile
      )
    : buildSystemPromptFallback(session); // Fallback if no voice profile

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...session.conversationHistory.slice(-10),
      { role: 'user', content: userInput }
    ];

    console.log('[GPT-OSS] Streaming request to Groq...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages,
        max_tokens: 150,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    // PROVEN STREAMING LOGIC from nlc-demo (lines 377-491)
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let textBuffer = '';
    let audioChunkIndex = 0;

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
              const delta = parsed.choices[0]?.delta;

              if (delta?.content) {
                const chunkText = delta.content;
                fullResponse += chunkText;
                textBuffer += chunkText;

                // Check for sentence endings (punctuation + space)
                const sentenceEndPattern = /[.!?]\s/;
                const hasSentenceEnding = sentenceEndPattern.test(textBuffer);

                if (hasSentenceEnding) {
                  let lastEndingPos = -1;

                  for (let i = 0; i < textBuffer.length - 1; i++) {
                    const char = textBuffer[i];
                    const nextChar = textBuffer[i + 1];

                    if ((char === '.' || char === '!' || char === '?') && /\s/.test(nextChar)) {
                      lastEndingPos = i;
                    }
                  }

                  if (lastEndingPos !== -1) {
                    const sentenceChunk = textBuffer.substring(0, lastEndingPos + 1).trim();
                    const remainingText = textBuffer.substring(lastEndingPos + 1).trim();

                    if (sentenceChunk) {
                      console.log(`[GPT-Stream] Sentence: "${sentenceChunk}"`);

                      // Generate TTS immediately (fire and forget for low latency)
                      generateAndStreamTTS(callSid, sentenceChunk, socket, audioChunkIndex++);
                      textBuffer = remainingText;
                    }
                  }
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    // Send any remaining text
    if (textBuffer.trim()) {
      console.log(`[GPT-Stream] Final chunk: "${textBuffer}"`);
      await generateAndStreamTTS(callSid, textBuffer.trim(), socket, audioChunkIndex++);
    }

    const aiResponse = fullResponse || 'I apologize, I didn\'t catch that.';

    // Update conversation history
    session.conversationHistory.push(
      { role: 'user', content: userInput },
      { role: 'assistant', content: aiResponse }
    );

    session.conversationLog.push({
      speaker: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      message_type: 'ai_response'
    });

    // Mark intro as played after first response
    if (!session.sessionMemory.intro_played) {
      session.sessionMemory.intro_played = true;
      console.log('[Session] Intro marked as played');
    }

    // Extract session variables (from FastAPI session.py logic)
    extractSessionVariables(session, userInput, aiResponse);

  } catch (error) {
    console.error('[GPT-OSS] Error:', error);
  } finally {
    session.isProcessing = false;
  }
}

function sendBufferedAudioChunks(callSid: string) {
  const session = sessions.get(callSid);
  if (!session || !session.currentSocket) return;

  // Send all sequential chunks that are buffered (like nlc-demo's playBufferedChunks)
  while (session.audioChunkBuffer[session.nextChunkToSend] !== undefined) {
    const audioBytes = session.audioChunkBuffer[session.nextChunkToSend];
    delete session.audioChunkBuffer[session.nextChunkToSend];

    console.log(`[AudioQueue] Sending chunk #${session.nextChunkToSend} in order (${audioBytes.length} bytes)`);

    // Convert to base64
    let binary = '';
    for (let j = 0; j < audioBytes.length; j++) {
      binary += String.fromCharCode(audioBytes[j]);
    }
    const audioBase64 = btoa(binary);

    // Send to Twilio
    const mediaMessage = {
      event: 'media',
      streamSid: session.streamSid,
      media: {
        payload: audioBase64
      }
    };

    if (session.currentSocket.readyState === WebSocket.OPEN) {
      session.currentSocket.send(JSON.stringify(mediaMessage));
      console.log(`[AudioQueue] ✅ Sent chunk #${session.nextChunkToSend}`);
    } else {
      console.error('[AudioQueue] WebSocket closed, cannot send chunk');
      break;
    }

    session.nextChunkToSend++;
  }
}

async function generateAndStreamTTS(callSid: string, text: string, socket: WebSocket, chunkIndex: number) {
  const session = sessions.get(callSid);
  if (!session) return;

  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  if (!ELEVENLABS_API_KEY) {
    console.error('[ElevenLabs] API key not configured');
    return;
  }

  const voiceId = session.client.voice_id || 'YhNmhaaLcHbuyfVn0UeL';

  // Normalize text for TTS (convert numbers to words, etc.)
  const normalizedText = normalizeForTTS(text);

  try {
    const startTime = Date.now();
    console.log(`[ElevenLabs #${chunkIndex}] Generating TTS for: "${normalizedText.substring(0, 50)}..."`);

    // Use STREAMING endpoint like FastAPI does
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=ulaw_8000`,
      {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: normalizedText,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: false
          }
        })
      }
    );

    if (!response.ok) {
      console.error('[ElevenLabs] API error:', await response.text());
      return;
    }

    const audioArrayBuffer = await response.arrayBuffer();
    let audioBytes = new Uint8Array(audioArrayBuffer);
    console.log(`[ElevenLabs #${chunkIndex}] Received ${audioBytes.length} bytes`);

    // Log first 20 bytes to diagnose headers
    const first20 = Array.from(audioBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`[ElevenLabs] First 20 bytes: ${first20}`);

    // Twilio says: "Should NOT include audio file type header bytes"
    // Check for common audio file headers and strip them

    // WAV/RIFF header (starts with "RIFF")
    if (audioBytes.length > 44 &&
        audioBytes[0] === 0x52 && audioBytes[1] === 0x49 &&
        audioBytes[2] === 0x46 && audioBytes[3] === 0x46) {
      console.log('[ElevenLabs] ⚠️ Detected RIFF/WAV header, stripping 44 bytes');
      audioBytes = audioBytes.slice(44);
    }

    // Check for .AU file header (starts with .snd)
    else if (audioBytes.length > 24 &&
        audioBytes[0] === 0x2e && audioBytes[1] === 0x73 &&
        audioBytes[2] === 0x6e && audioBytes[3] === 0x64) {
      console.log('[ElevenLabs] ⚠️ Detected .AU header, stripping 24 bytes');
      audioBytes = audioBytes.slice(24);
    }

    console.log(`[ElevenLabs #${chunkIndex}] Buffering audio (${audioBytes.length} bytes) for ordered playback`);

    // Reset buffer when chunk #0 arrives (new response)
    if (chunkIndex === 0 && session.nextChunkToSend !== 0) {
      console.log('[AudioQueue] New response detected - resetting queue');
      session.audioChunkBuffer = {};
      session.nextChunkToSend = 0;
    }

    // Buffer the chunk
    session.audioChunkBuffer[chunkIndex] = audioBytes;

    // Try to send buffered chunks in order
    sendBufferedAudioChunks(callSid);

    console.log(`[ElevenLabs #${chunkIndex}] ✅ Buffered in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`[ElevenLabs #${chunkIndex}] Error:`, error);
  }
}

function buildSystemPromptFallback(session: TwilioVoiceSession): string {
  const client = session.client;
  const businessName = client.business_name || 'the business';

  // Get session context
  const sessionContext = getSessionContext(session);

  return `You are the AI receptionist for ${businessName}, answering customer calls professionally over the phone.

IMPORTANT: If this is the first message (no intro done yet), start with a brief greeting introducing yourself and the business, then ask how you can help.

CONVERSATION STYLE:
- Keep responses under 40 words for voice clarity
- Be friendly, professional, and helpful
- Speak naturally like a real receptionist
- Don't mention URLs or technical terms

BUSINESS INFORMATION:
${client.system_prompt || `You help customers with ${businessName}'s services.`}

CURRENT CONVERSATION CONTEXT:
${sessionContext}

Remember: This is a phone call. Keep it conversational and brief.`;
}

function getSessionContext(session: TwilioVoiceSession): string {
  const parts: string[] = [];

  // Session memory flags
  if (session.sessionMemory.intro_played) parts.push('- Intro done');
  if (session.sessionMemory.pricing_discussed) parts.push('- Pricing already discussed');
  if (session.sessionMemory.service_explained) parts.push('- Services explained');

  // Session variables
  for (const [key, value] of Object.entries(session.sessionVariables)) {
    if (value) parts.push(`- ${key}: ${value}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No prior context';
}

function extractSessionVariables(session: TwilioVoiceSession, userInput: string, aiResponse: string) {
  const lower = userInput.toLowerCase();

  // Extract customer name
  if (lower.includes('my name is') || lower.includes('i\'m')) {
    const words = userInput.split(' ');
    for (let i = 0; i < words.length - 1; i++) {
      if (['name', 'i\'m', 'im'].includes(words[i].toLowerCase())) {
        const name = words[i + 1].replace(/[.,!?]/g, '');
        if (name.length > 1) {
          session.sessionVariables.customer_name = name;
          console.log(`[Session] Extracted customer_name: ${name}`);
        }
      }
    }
  }

  // Track pricing discussion
  if (lower.includes('price') || lower.includes('cost') || lower.includes('$')) {
    session.sessionMemory.pricing_discussed = true;
  }

  // Track service explanation
  if (lower.includes('service') || lower.includes('offer') || lower.includes('do you')) {
    session.sessionMemory.service_explained = true;
  }
}

async function finalizeCallSession(callSid: string) {
  const session = sessions.get(callSid);
  if (!session) return;

  // Clear keepalive timers
  if (session.deepgramKeepaliveTimer) {
    clearInterval(session.deepgramKeepaliveTimer);
    console.log('[Deepgram] Keepalive timer cleared');
  }
  if (session.supabaseKeepaliveTimer) {
    clearInterval(session.supabaseKeepaliveTimer);
    console.log('[Supabase] Keepalive timer cleared');
  }

  const duration = Math.floor((Date.now() - session.sessionStartTime) / 1000);

  // Save conversation logs
  for (const log of session.conversationLog) {
    await session.supabase.from('conversation_logs').insert({
      call_sid: callSid,
      client_id: session.client.client_id,
      speaker: log.speaker,
      content: log.content,
      message_type: log.message_type,
      created_at: log.timestamp
    });
  }

  // Update call session
  const transcriptSummary = session.conversationLog
    .filter(msg => msg.speaker === 'user')
    .map(msg => msg.content)
    .join(' ')
    .substring(0, 200);

  await session.supabase
    .from('call_sessions')
    .update({
      status: 'completed',
      end_time: new Date().toISOString(),
      duration_seconds: duration,
      transcript: session.conversationLog,
      transcript_summary: transcriptSummary
    })
    .eq('call_sid', callSid);

  console.log(`[Twilio] ✅ Call completed: ${duration}s`);

  // Extract and save lead information from conversation
  if (session && session.conversationLog.length > 0) {
    await extractAndSaveLead(session);
  }

  // Increment trial_calls_used (phone call completed)
  if (session && session.client) {
    try {
      const { error } = await session.supabase.rpc('increment', {
        table_name: 'voice_ai_clients',
        column_name: 'trial_calls_used',
        row_id: session.client.id
      });

      if (error) {
        // Fallback to manual increment if RPC doesn't exist
        const { data: clientData } = await session.supabase
          .from('voice_ai_clients')
          .select('trial_calls_used')
          .eq('client_id', session.client.client_id)
          .single();

        const newCount = (clientData?.trial_calls_used || 0) + 1;

        await session.supabase
          .from('voice_ai_clients')
          .update({ trial_calls_used: newCount })
          .eq('client_id', session.client.client_id);

        console.log(`[Trial] Incremented trial_calls_used for client ${session.client.client_id} → ${newCount}`);
      } else {
        console.log(`[Trial] Incremented trial_calls_used for client ${session.client.client_id}`);
      }
    } catch (error) {
      console.error('[Trial] Error incrementing trial_calls_used:', error);
    }
  }

  // Track usage event in FlexPrice (for paid plans analytics - future)
  await trackFlexPriceEvent(session.client.user_id, callSid, duration);
}

async function cleanupSession(callSid: string) {
  const session = sessions.get(callSid);
  if (!session) return;

  if (session.deepgramConnection) {
    session.deepgramConnection.close();
  }

  await finalizeCallSession(callSid);
  sessions.delete(callSid);

  console.log(`[Twilio] Session cleaned up: ${callSid}`);
}

// ============================================================================
// LEAD CAPTURE FUNCTIONS
// ============================================================================

/**
 * Extract lead information from conversation and save to database
 */
async function extractAndSaveLead(session: any) {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) {
    console.log('[Lead Capture] Groq API key not found, skipping lead extraction');
    return;
  }

  try {
    // Build conversation transcript for analysis
    const transcript = session.conversationLog
      .map((msg: any) => `${msg.speaker === 'user' ? 'Customer' : 'AI'}: ${msg.content}`)
      .join('\n');

    console.log('[Lead Capture] Analyzing conversation for lead information...');

    // Use LLM to extract lead information
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a lead extraction assistant. Analyze the phone conversation and extract any customer contact information mentioned.

Return ONLY a valid JSON object with these fields (use null if not found):
{
  "name": "customer name if mentioned",
  "email": "email address if mentioned",
  "phone": "phone number if mentioned (or caller's number if not explicitly stated)",
  "notes": "brief notes about what they were interested in or needed"
}

If NO contact information was shared at all, return: {"name": null, "email": null, "phone": null, "notes": null}

Examples:
- "Hi, I'm John calling about plumbing" → {"name": "John", "email": null, "phone": null, "notes": "interested in plumbing"}
- No info shared → {"name": null, "email": null, "phone": null, "notes": null}`
          },
          {
            role: 'user',
            content: `Extract lead information from this conversation:\n\n${transcript}`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      console.error('[Lead Capture] Groq API error:', response.status);
      return;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      console.log('[Lead Capture] No content returned from LLM');
      return;
    }

    // Parse JSON response
    let leadData;
    try {
      leadData = JSON.parse(content);
    } catch (e) {
      console.error('[Lead Capture] Failed to parse LLM response:', content);
      return;
    }

    // Use caller's phone if we have a name but no explicit phone
    if (leadData.name && !leadData.phone && session.from) {
      leadData.phone = session.from;
    }

    // Only save if we have at least some information
    if (!leadData.name && !leadData.email && !leadData.phone) {
      console.log('[Lead Capture] No contact information found in conversation');
      return;
    }

    // Save to database
    const { error } = await session.supabase
      .from('leads')
      .insert({
        client_id: session.client.client_id,
        name: leadData.name || null,
        email: leadData.email || null,
        phone: leadData.phone || null,
        notes: leadData.notes || null,
        source: 'phone',
        session_id: session.callSid || null,
        status: 'new'
      });

    if (error) {
      console.error('[Lead Capture] Failed to save lead:', error);
    } else {
      console.log(`[Lead Capture] ✅ Lead saved: ${leadData.name || 'Unknown'} (${leadData.phone || 'no phone'})`);
    }

  } catch (error) {
    console.error('[Lead Capture] Error during lead extraction:', error);
  }
}

// ============================================================================
// FLEXPRICE INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Check user access combining trial + subscription logic
 * Returns: { allowed: boolean, reason: string }
 */
async function checkUserAccess(client: any): Promise<{ allowed: boolean; reason: string }> {
  try {
    // 1. Check if user has active PAID subscription (FlexPrice - for future)
    if (FLEXPRICE_API_KEY) {
      const subscription = await getFlexPriceSubscription(client.user_id);
      if (subscription?.status === 'active') {
        console.log(`[Access] User has active subscription: ${subscription.plan_id || 'unknown plan'}`);
        return { allowed: true, reason: 'active_subscription' };
      }
    }

    // 2. No paid subscription → check TRIAL status (per-client credits in database)
    console.log('[Access] No active subscription - checking trial status...');

    // 2a. Check credits (from voice_ai_clients.credits - per-client, not per-user)
    const credits = client.credits || 0;
    if (credits < 1) {
      console.log(`[Access] Trial credits exhausted (${credits} remaining)`);
      return { allowed: false, reason: 'trial_expired_credits' };
    }

    // 2b. Check trial time limit (3 days from CLIENT creation)
    const accountAge = Date.now() - new Date(client.created_at).getTime();
    const daysSinceSignup = accountAge / (1000 * 60 * 60 * 24);

    if (daysSinceSignup > 3) {
      console.log(`[Access] Trial time expired (${Math.floor(daysSinceSignup)} days since client creation)`);
      return { allowed: false, reason: 'trial_expired_time' };
    }

    // 3. Trial is still valid
    const creditsUsed = 10 - credits;
    console.log(`[Access] Trial active: ${creditsUsed}/10 credits used, ${Math.floor(3 - daysSinceSignup)} days remaining`);
    return { allowed: true, reason: 'trial_active' };

  } catch (error) {
    console.error('[Access] Access check error:', error);
    // Fail open on errors
    return { allowed: true, reason: 'error_fail_open' };
  }
}

/**
 * Get user's active subscription from FlexPrice
 * Returns subscription object or null
 */
async function getFlexPriceSubscription(userId: string): Promise<any> {
  if (!FLEXPRICE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${FLEXPRICE_BASE_URL}/subscriptions?external_customer_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FLEXPRICE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('[FlexPrice] Subscription check failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Find active subscription
    if (data?.data && Array.isArray(data.data)) {
      const activeSub = data.data.find((sub: any) => sub.status === 'active');
      return activeSub || null;
    }

    return null;
  } catch (error) {
    console.error('[FlexPrice] Subscription check error:', error);
    return null;
  }
}

/**
 * Check user's credit balance in FlexPrice
 * Returns number of credits remaining (0 if error or no balance)
 */
async function checkFlexPriceBalance(userId: string): Promise<number> {
  if (!FLEXPRICE_API_KEY) {
    console.warn('[FlexPrice] API key not configured - skipping balance check');
    return 999; // Fail open - allow call if FlexPrice not configured
  }

  try {
    console.log(`[FlexPrice] Checking balance for user ${userId}...`);

    const response = await fetch(`${FLEXPRICE_BASE_URL}/wallets?external_customer_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FLEXPRICE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('[FlexPrice] Balance check failed:', response.status, await response.text());
      return 999; // Fail open on error
    }

    const data = await response.json();
    const balance = data?.balance || 0;

    console.log(`[FlexPrice] User ${userId} balance: ${balance} credits`);
    return balance;
  } catch (error) {
    console.error('[FlexPrice] Balance check error:', error);
    return 999; // Fail open on exception
  }
}

/**
 * Track voice_call event in FlexPrice after call ends
 */
async function trackFlexPriceEvent(userId: string, callSid: string, durationSeconds: number): Promise<boolean> {
  if (!FLEXPRICE_API_KEY) {
    console.warn('[FlexPrice] API key not configured - skipping event tracking');
    return false;
  }

  try {
    console.log(`[FlexPrice] Tracking voice_call event for user ${userId}...`);

    const response = await fetch(`${FLEXPRICE_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FLEXPRICE_API_KEY,
      },
      body: JSON.stringify({
        event_name: 'voice_call',
        external_customer_id: userId,
        properties: {
          call_sid: callSid,
          duration_seconds: durationSeconds,
          channel: 'phone'
        },
        timestamp: new Date().toISOString(),
        source: 'twilio_voice_webhook'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FlexPrice] Event tracking failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('[FlexPrice] ✅ voice_call event tracked:', data);
    return true;
  } catch (error) {
    console.error('[FlexPrice] Event tracking error:', error);
    return false;
  }
}
