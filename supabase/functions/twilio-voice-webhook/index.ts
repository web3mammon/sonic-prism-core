import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioVoiceSession {
  client: any;
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

  // Build system prompt (from FastAPI router.py logic)
  const systemPrompt = buildSystemPrompt(session);

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
        max_tokens: 150,  // ⚡ FASTER: Shorter responses (was 200)
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

  try {
    const startTime = Date.now();
    console.log(`[ElevenLabs #${chunkIndex}] Generating TTS for: "${text.substring(0, 50)}..."`);

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
          text: text,
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

function buildSystemPrompt(session: TwilioVoiceSession): string {
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
