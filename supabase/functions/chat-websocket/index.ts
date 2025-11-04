import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildVoiceOptimizedPrompt, normalizeForTTS } from "../_shared/voice-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FlexPrice API configuration
const FLEXPRICE_API_KEY = Deno.env.get('FLEXPRICE_API_KEY');
const FLEXPRICE_BASE_URL = Deno.env.get('FLEXPRICE_BASE_URL') || 'https://api.cloud.flexprice.io/v1';

interface VoiceSession {
  clientId: string;
  client: any;
  voiceProfile: any; // Voice profile from voice_profiles table
  chatId: string | null;
  transcript: Array<{ role: string; content: string; timestamp: string }>;
  startTime: number;
  conversationHistory: Array<{ role: string; content: string }>;
  deepgramConnection: WebSocket | null;
  isProcessing: boolean;
  deepgramKeepaliveTimer: number | null;
  supabaseKeepaliveTimer: number | null;
}

const sessions = new Map<string, VoiceSession>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id');

  if (!clientId) {
    return new Response("client_id parameter required", { status: 400 });
  }

  console.log(`[WebSocket] Connection request for client: ${clientId}`);

  // Load client from database
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: client, error: clientError } = await supabaseClient
    .from('voice_ai_clients')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .single();

  if (clientError || !client) {
    console.error('[WebSocket] Client not found or inactive:', clientId);
    return new Response("Client not found or inactive", { status: 404 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = crypto.randomUUID();

  socket.onopen = async () => {
    console.log(`[WebSocket] Connected - Session: ${sessionId}`);

    // Load voice profile
    let voiceProfile = null;
    if (client.voice_id) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('voice_profiles')
        .select('*')
        .eq('voice_id', client.voice_id)
        .single();

      if (profileError) {
        console.error('[WebSocket] Failed to load voice profile:', profileError);
      } else {
        voiceProfile = profile;
        console.log(`[WebSocket] ✅ Voice profile loaded: ${profile.name} (${profile.accent})`);
      }
    }

    // Check user access (trial + subscription logic)
    const accessCheck = await checkUserAccess(client);

    if (!accessCheck.allowed) {
      console.log(`[Access] ❌ Access denied - ${accessCheck.reason}`);

      // Determine rejection message based on reason
      let rejectionMessage = '';
      if (accessCheck.reason === 'trial_minutes_exhausted') {
        rejectionMessage = 'You have reached your trial limit. Please upgrade your account to continue.';
      } else if (accessCheck.reason === 'trial_expired_time') {
        rejectionMessage = 'Your 3-day free trial has expired. Please visit your dashboard to upgrade your plan and continue using our service.';
      } else if (accessCheck.reason === 'trial_expired_credits') {
        rejectionMessage = 'You have used all 10 free trial chats. Please visit your dashboard to upgrade your plan and continue chatting.';
      } else {
        rejectionMessage = 'Your account has run out of credits. Please visit your dashboard to add more credits or upgrade your plan.';
      }

      socket.send(JSON.stringify({
        type: 'error',
        message: rejectionMessage
      }));
      socket.close();
      return;
    }

    console.log(`[Access] ✅ Access granted - ${accessCheck.reason}`);

    const session: VoiceSession = {
      clientId: clientId,
      client: client,
      voiceProfile, // Voice profile from database
      chatId: null,
      transcript: [],
      startTime: Date.now(),
      conversationHistory: [],
      deepgramConnection: null,
      isProcessing: false,
      deepgramKeepaliveTimer: null,
      supabaseKeepaliveTimer: null,
    };

    sessions.set(sessionId, session);

    // Initialize Deepgram connection
    const deepgramReady = await initializeDeepgram(sessionId, socket);

    if (!deepgramReady) {
      console.error('[WebSocket] Failed to initialize Deepgram');
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to initialize voice recognition'
      }));
      socket.close();
      return;
    }

    socket.send(JSON.stringify({
      type: 'connection.established',
      sessionId,
      message: `${client.business_name} Voice AI ready`
    }));

    // Play intro audio (greeting message)
    await playIntroAudio(sessionId, socket, supabaseClient);

    console.log(`[WebSocket] Session initialized: ${sessionId}`);
  };

  socket.onmessage = async (event) => {
    try {
      const session = sessions.get(sessionId);
      if (!session) {
        console.error('[WebSocket] Session not found:', sessionId);
        return;
      }

      const data = JSON.parse(event.data);

      switch (data.type) {
        // NLC format
        case 'audio.chunk':
          await handleAudioChunk(sessionId, data.audio, socket);
          break;

        // Python backend format (marketingdemo compatibility)
        case 'audio_data':
          await handleAudioChunk(sessionId, data.audio, socket);
          break;

        case 'start_recording':
          console.log('[WebSocket] Recording started');
          // Deepgram already initialized, no action needed
          break;

        case 'stop_recording':
          console.log('[WebSocket] Recording stopped');
          // Audio continues to be processed as chunks arrive
          break;

        // Session end (both formats)
        case 'session.end':
        case 'end_session':
          await handleEndSession(sessionId, socket);
          break;

        default:
          console.warn('[WebSocket] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WebSocket] Message handling error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  socket.onclose = async () => {
    console.log(`[WebSocket] Connection closed - Session: ${sessionId}`);

    const session = sessions.get(sessionId);

    // Clear keepalive timers
    if (session?.deepgramKeepaliveTimer) {
      clearInterval(session.deepgramKeepaliveTimer);
      console.log('[Deepgram] Keepalive timer cleared');
    }
    if (session?.supabaseKeepaliveTimer) {
      clearInterval(session.supabaseKeepaliveTimer);
      console.log('[Supabase] Keepalive timer cleared');
    }

    await saveSessionToDatabase(sessionId);

    // Extract and save lead information from conversation
    if (session && session.conversationHistory.length > 0) {
      await extractAndSaveLead(session);
    }

    // Deduct 1 credit from client's balance (per-client credits in database)
    if (session && session.client) {
      try {
        const { error } = await supabaseClient
          .from('voice_ai_clients')
          .update({ credits: Math.max(0, (session.client.credits || 0) - 1) })
          .eq('client_id', session.clientId);

        if (error) {
          console.error('[Credits] Failed to deduct credit:', error);
        } else {
          console.log(`[Credits] Deducted 1 credit from client ${session.clientId} (${session.client.credits} → ${session.client.credits - 1})`);
        }
      } catch (error) {
        console.error('[Credits] Error deducting credit:', error);
      }
    }

    // Track usage event in FlexPrice (for paid plans analytics - future)
    if (session && session.chatId && session.client.user_id) {
      const duration = Math.floor((Date.now() - session.startTime) / 1000);
      await trackFlexPriceEvent(session.client.user_id, session.chatId, duration);
    }

    if (session?.deepgramConnection) {
      session.deepgramConnection.close();
    }
    sessions.delete(sessionId);
  };

  socket.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
  };

  return response;
});

async function initializeDeepgram(sessionId: string, clientSocket: WebSocket): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
  if (!DEEPGRAM_API_KEY) {
    console.error('[Deepgram] API key not configured');
    return false;
  }

  try {
    const deepgramWs = new WebSocket(
      'wss://api.deepgram.com/v1/listen?' + new URLSearchParams({
        encoding: 'linear16',
        sample_rate: '24000',
        channels: '1',
        interim_results: 'true',
        punctuate: 'true',
        endpointing: '300',
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
        console.log('[Deepgram] Connected');
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

          if (transcript && transcript.trim()) {
            console.log(`[Deepgram] ${isFinal ? 'Final' : 'Interim'}: ${transcript}`);

            // Send appropriate event based on finality
            if (isFinal) {
              // Final transcript - user's speech recognized
              clientSocket.send(JSON.stringify({
                type: 'transcript.user',
                text: transcript
              }));
            } else {
              // Interim transcript - still listening
              clientSocket.send(JSON.stringify({
                type: 'transcript.interim',
                text: transcript
              }));
            }

            if (isFinal && !session.isProcessing) {
              session.isProcessing = true;

              session.transcript.push({
                role: 'customer',
                content: transcript,
                timestamp: new Date().toISOString()
              });

              await processWithGPT(sessionId, transcript, clientSocket);
            }
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

async function handleAudioChunk(sessionId: string, audioBase64: string, socket: WebSocket) {
  const session = sessions.get(sessionId);
  if (!session || !session.deepgramConnection) return;

  try {
    const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));

    if (session.deepgramConnection.readyState === WebSocket.OPEN) {
      session.deepgramConnection.send(audioData);
    }
  } catch (error) {
    console.error('[Audio] Error processing chunk:', error);
  }
}

async function processWithGPT(sessionId: string, userInput: string, socket: WebSocket) {
  const session = sessions.get(sessionId);
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
          channel_type: 'website',
          business_hours: session.client.business_hours,
          timezone: session.client.timezone
        },
        session.voiceProfile
      )
    : buildVoiceOptimizedPromptFallback(session); // Fallback if no voice profile


  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...session.conversationHistory.slice(-10),
      { role: 'user', content: userInput }
    ];

    console.log('[GPT-OSS] Sending streaming request to Groq...');

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

    // Stream the response with sentence-based chunking (EXACT Shopify logic)
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

                // Check for sentence endings (punctuation + space to avoid decimals)
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

                      socket.send(JSON.stringify({
                        type: 'text.chunk',
                        text: sentenceChunk
                      }));

                      // Generate TTS sequentially to guarantee chunk order
                      await generateSpeechChunk(sessionId, sentenceChunk, socket, audioChunkIndex++);
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
      socket.send(JSON.stringify({
        type: 'text.chunk',
        text: textBuffer.trim()
      }));
      await generateSpeechChunk(sessionId, textBuffer.trim(), socket, audioChunkIndex++);
    }

    const aiResponse = fullResponse || 'I apologize, I didn\'t catch that.';

    // ======================================
    // CHECK FOR APPOINTMENT BOOKING REQUEST
    // ======================================
    if (aiResponse.includes('BOOKING_APPOINTMENT')) {
      console.log('[Booking] AI requested appointment booking');

      try {
        // Extract booking details from AI response
        const bookingSection = aiResponse.split('BOOKING_APPOINTMENT')[1];
        const dateMatch = bookingSection.match(/DATE:\s*(\d{4}-\d{2}-\d{2})/);
        const startTimeMatch = bookingSection.match(/START_TIME:\s*(\d{2}:\d{2})/);
        const endTimeMatch = bookingSection.match(/END_TIME:\s*(\d{2}:\d{2})/);
        const nameMatch = bookingSection.match(/CUSTOMER_NAME:\s*(.+)/);
        const phoneMatch = bookingSection.match(/CUSTOMER_PHONE:\s*(.+)/);
        const emailMatch = bookingSection.match(/CUSTOMER_EMAIL:\s*(.+)/);
        const serviceMatch = bookingSection.match(/SERVICE:\s*(.+)/);
        const notesMatch = bookingSection.match(/NOTES:\s*(.+)/);

        if (dateMatch && startTimeMatch && endTimeMatch && nameMatch) {
          const date = dateMatch[1].trim();
          const startTime = startTimeMatch[1].trim();
          const endTime = endTimeMatch[1].trim();
          const customerName = nameMatch[1].trim();
          const customerPhone = phoneMatch ? phoneMatch[1].trim() : null;
          const customerEmail = emailMatch ? emailMatch[1].trim() : session.visitorEmail || null;
          const service = serviceMatch ? serviceMatch[1].trim() : 'General appointment';
          const notes = notesMatch ? notesMatch[1].trim() : '';

          console.log('[Booking] Parsed booking details:', {
            date,
            startTime,
            endTime,
            customerName,
            customerEmail,
            service
          });

          // Get Supabase client
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          // Call calendar-integration function to create booking
          const { data: bookingData, error: bookingError } = await supabaseClient.functions.invoke('calendar-integration', {
            body: {
              action: 'create_booking',
              client_id: session.client.client_id,
              customer_name: customerName,
              customer_phone: customerPhone,
              customer_email: customerEmail,
              start_time: `${date}T${startTime}:00`,
              end_time: `${date}T${endTime}:00`,
              service_type: service,
              notes: notes,
              session_id: sessionId,
              source: 'website',
              lead_id: session.lead_id || null
            }
          });

          if (bookingError) {
            console.error('[Booking] ❌ Error creating appointment:', bookingError);

            // Notify customer of booking failure
            const errorMessage = "I apologize, but I'm having trouble scheduling your appointment right now. Let me take down your information and someone from our team will call you back to confirm your booking.";

            socket.send(JSON.stringify({
              type: 'text.chunk',
              text: errorMessage
            }));

            await generateSpeechChunk(sessionId, errorMessage, socket, audioChunkIndex++);

            session.transcript.push({
              role: 'assistant',
              content: errorMessage,
              timestamp: new Date().toISOString(),
              message_type: 'booking_error'
            });
          } else {
            console.log('[Booking] ✅ Appointment created successfully:', bookingData);

            // Confirm booking to customer
            const confirmMessage = `Perfect! I've scheduled your appointment for ${service} on ${date} at ${startTime}. You'll receive a confirmation shortly. Is there anything else I can help you with?`;

            socket.send(JSON.stringify({
              type: 'text.chunk',
              text: confirmMessage
            }));

            await generateSpeechChunk(sessionId, confirmMessage, socket, audioChunkIndex++);

            // Log booking in conversation
            session.transcript.push({
              role: 'assistant',
              content: confirmMessage,
              timestamp: new Date().toISOString(),
              message_type: 'booking_confirmation',
              metadata: bookingData
            });
          }
        } else {
          console.warn('[Booking] ⚠️  Missing required booking details in AI response');
        }
      } catch (bookingError) {
        console.error('[Booking] ❌ Booking processing failed:', bookingError);
      }
    }

    socket.send(JSON.stringify({
      type: 'text.complete',
      text: aiResponse
    }));

    socket.send(JSON.stringify({
      type: 'audio.complete',
      total_chunks: audioChunkIndex
    }));

    // Update conversation history
    // Remove booking markers from response before storing
    const cleanedAiResponse = aiResponse
      .replace(/BOOKING_APPOINTMENT[\s\S]*?(?=\n\n|$)/g, '')
      .trim();

    session.conversationHistory.push(
      { role: 'user', content: userInput },
      { role: 'assistant', content: cleanedAiResponse }
    );

    session.transcript.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GPT-OSS] Error:', error);
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process request'
    }));
  } finally {
    session.isProcessing = false;
  }
}

async function generateSpeechChunk(sessionId: string, text: string, socket: WebSocket, chunkIndex: number) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  if (!ELEVENLABS_API_KEY) {
    console.error('[ElevenLabs] API key not configured');
    return;
  }

  // Use client's voice_id from their config
  const voiceId = session.client.voice_id || 'pNInz6obpgDQGcFmaJgB'; // Default to Adam (US voice)

  // Strip URLs and normalize numbers
  let speechText = text.replace(/\[URL:.*?\]/gi, '');
  speechText = speechText.replace(/https?:\/\/[^\s]+/gi, '');
  speechText = speechText.replace(/\s+/g, ' ').trim();
  speechText = normalizeForTTS(speechText);

  if (!speechText) return;

  try {
    const startTime = Date.now();
    console.log(`[ElevenLabs-Chunk #${chunkIndex}] Generating TTS for: "${speechText.substring(0, 50)}..."`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: speechText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      console.error('[ElevenLabs] API error:', await response.text());
      return;
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(audioArrayBuffer);

    // Convert to base64
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const audioBase64 = btoa(binary);

    socket.send(JSON.stringify({
      type: 'audio.chunk',
      audio: audioBase64,
      format: 'mp3',
      chunk_index: chunkIndex
    }));

    console.log(`[ElevenLabs-Chunk #${chunkIndex}] Sent audio (${bytes.length} bytes) in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`[ElevenLabs-Chunk #${chunkIndex}] Error:`, error);
  }
}

async function playIntroAudio(sessionId: string, socket: WebSocket, supabaseClient: any) {
  const session = sessions.get(sessionId);
  if (!session) return;

  try {
    // Fetch pre-generated MP3 URL from widget_config
    const { data: widgetConfig, error: widgetError } = await supabaseClient
      .from('widget_config')
      .select('greeting_audio_url')
      .eq('client_id', session.clientId)
      .single();

    if (widgetError || !widgetConfig?.greeting_audio_url) {
      console.log('[IntroAudio] No pre-generated audio found, skipping intro');
      return;
    }

    const audioUrl = widgetConfig.greeting_audio_url;
    console.log(`[IntroAudio] Fetching pre-generated intro from: ${audioUrl}`);

    // Fetch the pre-generated MP3 file from storage
    const response = await fetch(audioUrl);
    if (!response.ok) {
      console.error('[IntroAudio] Failed to fetch audio:', response.status);
      return;
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(audioArrayBuffer);

    // Convert to base64
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const audioBase64 = btoa(binary);

    // Send intro audio to client
    socket.send(JSON.stringify({
      type: 'intro.audio',
      audio: audioBase64,
      format: 'mp3'
    }));

    console.log(`[IntroAudio] ✅ Sent pre-generated intro (${bytes.length} bytes)`);
  } catch (error) {
    console.error('[IntroAudio] Error:', error);
  }
}

async function handleEndSession(sessionId: string, socket: WebSocket) {
  console.log('[Session] Ending:', sessionId);

  const session = sessions.get(sessionId);
  if (session?.deepgramConnection) {
    session.deepgramConnection.close();
  }

  socket.send(JSON.stringify({
    type: 'session.ended',
    message: 'Session ended'
  }));

  socket.close();
}

async function saveSessionToDatabase(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || session.transcript.length === 0) return;

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    const transcriptText = session.transcript.map(t => t.content).join(' ');
    const chatId = session.chatId || `chat_${sessionId}`;

    await supabaseClient
      .from('chat_sessions')
      .insert({
        chat_id: chatId,
        client_id: session.clientId,
        start_time: new Date(session.startTime).toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: duration,
        status: 'completed',
        transcript: session.transcript,
        transcript_summary: transcriptText.substring(0, 500),
        message_count: session.transcript.length,
        sentiment_score: calculateSentimentScore(transcriptText),
      });

    console.log('[Database] Chat session saved:', chatId);

    // ========================================
    // MINUTE-BASED TRACKING (Nov 1, 2025)
    // ========================================
    await trackMinuteUsage(session.clientId, duration, supabaseClient);
  } catch (error) {
    console.error('[Database] Error saving chat session:', error);
  }
}

function calculateSentimentScore(text: string): number {
  const positive = ['great', 'good', 'thanks', 'thank', 'excellent', 'happy', 'love', 'awesome', 'perfect'];
  const negative = ['bad', 'poor', 'terrible', 'angry', 'frustrated', 'hate', 'worst', 'awful'];

  const lower = text.toLowerCase();
  const positiveCount = positive.filter(w => lower.includes(w)).length;
  const negativeCount = negative.filter(w => lower.includes(w)).length;
  const totalWords = text.split(/\s+/).length;

  if (totalWords === 0) return 0;

  // Calculate score between -1.0 and 1.0
  const score = (positiveCount - negativeCount) / Math.max(totalWords / 10, 1);
  return Math.max(-1, Math.min(1, score)); // Clamp between -1 and 1
}

function extractTopic(text: string): string {
  const topics = {
    'design': ['design', 'branding', 'logo', 'creative'],
    'web': ['website', 'web', 'development', 'site'],
    'marketing': ['marketing', 'campaign', 'social'],
    'pricing': ['price', 'cost', 'quote', 'budget'],
  };

  const lower = text.toLowerCase();
  let maxCount = 0;
  let topic = 'general';

  for (const [key, keywords] of Object.entries(topics)) {
    const count = keywords.filter(k => lower.includes(k)).length;
    if (count > maxCount) {
      maxCount = count;
      topic = key;
    }
  }

  return topic;
}

function buildVoiceOptimizedPromptFallback(session: VoiceSession): string {
  const businessContext = session.client.system_prompt || `You are a helpful AI assistant for ${session.client.business_name}. Answer customer questions about our business, services, and help them with their needs.`;

  return `${businessContext}

CONVERSATION STYLE (CRITICAL - FOLLOW EXACTLY):
- This is a VOICE conversation - speak naturally like a helpful human assistant
- Keep EVERY response under 40 words maximum for voice clarity
- Be conversational, warm, and professional
- Use simple, clear language - avoid jargon unless necessary
- Ask ONE question at a time if you need clarification

FORMATTING RULES (MUST FOLLOW):
- NEVER use tables, bullet points, or formatted lists
- NEVER use markdown formatting (**, __, etc.)
- If you need to list items, say them naturally: "We offer three options: first, second, and third"
- If you include URLs or links, wrap them in [URL: link-here] format so they aren't spoken aloud
- For numbers, use words for small amounts (one, two, three) and digits for large amounts
- For prices, say naturally: "twenty five dollars" not "$25"

RESPONSE LENGTH:
- Maximum 40 words per response
- If the answer is long, give a brief summary and offer to explain more
- Break complex topics into short, digestible chunks

Remember: Users are LISTENING, not reading. Speak naturally and concisely.`;
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
    const transcript = session.conversationHistory
      .map((msg: any) => `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}`)
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
            content: `You are a lead extraction assistant. Analyze the conversation and extract any customer contact information mentioned.

Return ONLY a valid JSON object with these fields (use null if not found):
{
  "name": "customer name if mentioned",
  "email": "email address if mentioned",
  "phone": "phone number if mentioned",
  "notes": "brief notes about what they were interested in or needed"
}

If NO contact information was shared at all, return: {"name": null, "email": null, "phone": null, "notes": null}

Examples:
- "Hi, I'm John" → {"name": "John", "email": null, "phone": null, "notes": null}
- "My email is john@example.com" → {"name": null, "email": "john@example.com", "phone": null, "notes": null}
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

    // Only save if we have at least some information
    if (!leadData.name && !leadData.email && !leadData.phone) {
      console.log('[Lead Capture] No contact information found in conversation');
      return;
    }

    // Save to database
    const { error } = await session.supabase
      .from('leads')
      .insert({
        client_id: session.clientId,
        name: leadData.name || null,
        email: leadData.email || null,
        phone: leadData.phone || null,
        notes: leadData.notes || null,
        source: 'website',
        session_id: session.chatId || null,
        status: 'new'
      });

    if (error) {
      console.error('[Lead Capture] Failed to save lead:', error);
    } else {
      console.log(`[Lead Capture] ✅ Lead saved: ${leadData.name || 'Unknown'}`);
    }

  } catch (error) {
    console.error('[Lead Capture] Error during lead extraction:', error);
  }
}

// ============================================================================
// MINUTE-BASED PRICING TRACKING (NEW - November 1, 2025)
// ============================================================================

/**
 * Track minute usage for chat sessions (minute-based pricing)
 * Increments trial_minutes_used or paid_minutes_used depending on client's plan
 */
async function trackMinuteUsage(clientId: string, durationSeconds: number, supabaseClient: any): Promise<void> {
  try {
    // Calculate minutes (always round UP - partial minutes count as full minutes)
    const minutes = Math.ceil(durationSeconds / 60);
    console.log(`[Minutes] Chat duration: ${durationSeconds}s = ${minutes} minute(s)`);

    // Fetch current client data to check plan status
    const { data: clientData, error: fetchError } = await supabaseClient
      .from('voice_ai_clients')
      .select('client_id, trial_minutes, trial_minutes_used, paid_plan, paid_minutes_used, paid_minutes_included')
      .eq('client_id', clientId)
      .single();

    if (fetchError || !clientData) {
      console.error('[Minutes] Failed to fetch client data:', fetchError);
      return;
    }

    // Determine if user is on trial or paid plan
    const isOnTrial = !clientData.paid_plan; // FALSE = trial user
    const currentMinutesUsed = isOnTrial ? (clientData.trial_minutes_used || 0) : (clientData.paid_minutes_used || 0);
    const newMinutesUsed = currentMinutesUsed + minutes;

    if (isOnTrial) {
      // Update trial minutes
      const { error: updateError } = await supabaseClient
        .from('voice_ai_clients')
        .update({
          trial_minutes_used: newMinutesUsed,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId);

      if (updateError) {
        console.error('[Minutes] Failed to update trial_minutes_used:', updateError);
      } else {
        const remaining = (clientData.trial_minutes || 30) - newMinutesUsed;
        console.log(`[Minutes] ✅ Trial usage updated: ${newMinutesUsed}/${clientData.trial_minutes || 30} minutes (${remaining} remaining)`);

        // Warn if trial is almost exhausted
        if (remaining <= 5 && remaining > 0) {
          console.warn(`[Minutes] ⚠️ Trial almost exhausted for ${clientId}: ${remaining} minutes left`);
        } else if (remaining <= 0) {
          console.warn(`[Minutes] ⚠️ Trial EXHAUSTED for ${clientId}`);
        }
      }
    } else {
      // Update paid plan minutes
      const { error: updateError } = await supabaseClient
        .from('voice_ai_clients')
        .update({
          paid_minutes_used: newMinutesUsed,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId);

      if (updateError) {
        console.error('[Minutes] Failed to update paid_minutes_used:', updateError);
      } else {
        const included = clientData.paid_minutes_included || 0;
        const remaining = included - newMinutesUsed;
        const overage = remaining < 0 ? Math.abs(remaining) : 0;

        console.log(`[Minutes] ✅ Paid usage updated: ${newMinutesUsed}/${included} minutes (Paid plan active)`);

        if (overage > 0) {
          console.warn(`[Minutes] ⚠️ OVERAGE for ${clientId}: ${overage} minutes over plan limit`);
        } else if (remaining <= 50) {
          console.warn(`[Minutes] ⚠️ Plan almost exhausted for ${clientId}: ${remaining} minutes left`);
        }
      }
    }

  } catch (error) {
    console.error('[Minutes] Error tracking minute usage:', error);
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

    // 2. No paid subscription → check TRIAL status
    console.log('[Access] No active subscription - checking trial status...');

    // 2a. CHECK MINUTE-BASED LIMITS (NEW - Nov 1, 2025)
    const hasMinuteTracking = client.trial_minutes !== undefined && client.trial_minutes !== null;

    if (hasMinuteTracking) {
      if (!client.paid_plan) {
        // Trial user - check minute limit
        const minutesUsed = client.trial_minutes_used || 0;
        const minutesTotal = client.trial_minutes || 30;

        if (minutesUsed >= minutesTotal) {
          console.log(`[Access] ❌ Trial minutes exhausted: ${minutesUsed}/${minutesTotal}`);
          return { allowed: false, reason: 'trial_minutes_exhausted' };
        }

        console.log(`[Access] ✅ Trial minutes available: ${minutesTotal - minutesUsed}/${minutesTotal} remaining`);
        return { allowed: true, reason: 'trial_minutes_active' };
      } else {
        // Paid user - always allow (overage tracked separately)
        const minutesUsed = client.paid_minutes_used || 0;
        const minutesIncluded = client.paid_minutes_included || 0;
        const overage = Math.max(0, minutesUsed - minutesIncluded);

        console.log(`[Access] ✅ Paid plan active: ${minutesUsed}/${minutesIncluded} minutes used${overage > 0 ? ` (${overage} overage)` : ''}`);
        return { allowed: true, reason: 'paid_plan_active' };
      }
    }

    // 2b. Fallback: OLD event-based credits system (backwards compatibility)
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
 */
async function checkFlexPriceBalance(userId: string): Promise<number> {
  if (!FLEXPRICE_API_KEY) {
    console.warn('[FlexPrice] API key not configured - skipping balance check');
    return 999; // Fail open
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
      return 999; // Fail open
    }

    const data = await response.json();
    const balance = data?.balance || 0;

    console.log(`[FlexPrice] User ${userId} balance: ${balance} credits`);
    return balance;
  } catch (error) {
    console.error('[FlexPrice] Balance check error:', error);
    return 999; // Fail open
  }
}

/**
 * Track web_chat event in FlexPrice after chat ends
 */
async function trackFlexPriceEvent(userId: string, chatId: string, durationSeconds: number): Promise<boolean> {
  if (!FLEXPRICE_API_KEY) {
    console.warn('[FlexPrice] API key not configured - skipping event tracking');
    return false;
  }

  try {
    console.log(`[FlexPrice] Tracking web_chat event for user ${userId}...`);

    const response = await fetch(`${FLEXPRICE_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FLEXPRICE_API_KEY,
      },
      body: JSON.stringify({
        event_name: 'web_chat',
        external_customer_id: userId,
        properties: {
          chat_id: chatId,
          duration_seconds: durationSeconds,
          channel: 'website'
        },
        timestamp: new Date().toISOString(),
        source: 'chat_websocket'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FlexPrice] Event tracking failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('[FlexPrice] ✅ web_chat event tracked:', data);
    return true;
  } catch (error) {
    console.error('[FlexPrice] Event tracking error:', error);
    return false;
  }
}
