#!/usr/bin/env python3
"""
ENTERPRISE STREAMING STT MODULE
Real-time Deepgram WebSocket streaming for instant transcription
Converts WebM chunks to PCM for ultra-fast processing
"""

import asyncio
import json
import time
import tempfile
import os
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
from config import Config

class StreamingSTTManager:
    """Manages real-time streaming STT with Deepgram WebSocket"""
    
    def __init__(self):
        self.deepgram_client = DeepgramClient(Config.DEEPGRAM_API_KEY)
        self.active_connections = {}  # session_id -> connection info

    def _get_dynamic_endpointing(self, session):
        """Get dynamic endpointing based on conversation state"""
        # Default endpointing
        base_endpointing = 600

        # Check if we're asking for phone number or expecting one
        if hasattr(session, 'expecting_phone_number') and session.expecting_phone_number:
            print("📞 Phone number expected - using longer endpointing")
            return 1200  # 1.2 seconds for phone numbers

        # Check if last AI message asked for phone number
        if hasattr(session, 'conversation_history') and session.conversation_history:
            last_ai_message = ""
            # Find the last AI message
            for msg in reversed(session.conversation_history):
                if "Lauren:" in msg:  # AI agent name
                    last_ai_message = msg.lower()
                    break

            # Check if asking for phone number
            phone_keywords = ["number", "phone", "mobile", "contact"]
            if any(keyword in last_ai_message for keyword in phone_keywords):
                print("📞 Phone number question detected - using longer endpointing")
                return 1200  # 1.2 seconds

        return base_endpointing
    
    async def start_streaming_session(self, session_id, websocket, session, transcript_callback=None):
        """Start a streaming STT session for real-time transcription"""
        try:
            # print(f"🎙️ Starting streaming STT for session: {session_id}")

            # Dynamic endpointing based on session state
            endpointing_ms = self._get_dynamic_endpointing(session)
            # print(f"📊 Using endpointing: {endpointing_ms}ms for session state")

            # Configure Deepgram live transcription for Twilio μ-law audio
            options = LiveOptions(
                model=Config.DEEPGRAM_MODEL,
                language=Config.DEEPGRAM_LANGUAGE,
                encoding="mulaw",      # Twilio μ-law format
                sample_rate=8000,      # Twilio sample rate
                channels=1,            # Mono audio
                punctuate=True,
                smart_format=True,
                interim_results=True,  # Get partial results
                endpointing=endpointing_ms,  # Dynamic based on conversation state
                # utterance_end_ms=1000  # COMMENTED OUT - using only endpointing for faster response
            )

            # Create Deepgram WebSocket connection
            dg_connection = self.deepgram_client.listen.asyncwebsocket.v("1")

            # Set up event handlers
            await self._setup_deepgram_handlers(dg_connection, session_id, websocket, session, transcript_callback)

            # Start the connection
            if await dg_connection.start(options):
                print(f"✅ Deepgram streaming started for {session_id}")

                # Store connection info
                self.active_connections[session_id] = {
                    'dg_connection': dg_connection,
                    'websocket': websocket,
                    'session': session,
                    'last_transcript': '',
                    'transcript_buffer': '',
                    'start_time': time.time()
                }

                return True
            else:
                print(f"❌ Failed to start Deepgram connection for {session_id}")
                return False

        except Exception as e:
            print(f"❌ Error starting streaming STT for {session_id}: {e}")
            return False
    
    async def _setup_deepgram_handlers(self, dg_connection, session_id, websocket, session, transcript_callback=None):
        """Setup Deepgram WebSocket event handlers"""

        async def on_message(self_handler, result, **kwargs):
            """Handle transcription results with chunk-based GPT processing"""
            try:
                sentence = result.channel.alternatives[0].transcript

                if len(sentence) == 0:
                    return

                connection_info = self.active_connections.get(session_id)
                if not connection_info:
                    return

                if result.is_final:
                    # Final transcript - process with GPT
                    print(f"👤 USER: {sentence}")
                    connection_info['last_transcript'] = sentence
                    session.completed_transcript = sentence.strip()
                    # Use callback to avoid circular import
                    if transcript_callback:
                        await transcript_callback(
                            sentence, session.call_sid, websocket, session.stream_sid
                        )
                    session.reset_for_next_input()

                else:
                    # Interim results - just log, don't process
                    # print(f"📝 interim: {sentence}")
                    pass

            except Exception as e:
                print(f"❌ Error processing transcript: {e}")

        async def on_error(self_handler, error, **kwargs):
            print(f"❌ Deepgram error for {session_id}: {error}")

        async def on_warning(self_handler, warning, **kwargs):
            print(f"⚠️ Deepgram warning for {session_id}: {warning}")

        # Register the handlers
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)
        dg_connection.on(LiveTranscriptionEvents.Warning, on_warning)
    
    async def stream_audio_chunk(self, session_id, mulaw_audio_data):
        """Stream Twilio μ-law audio chunk to Deepgram for real-time transcription"""
        try:
            connection_info = self.active_connections.get(session_id)
            if not connection_info:
                return
            
            dg_connection = connection_info['dg_connection']
            
            # Send raw μ-law directly to Deepgram (no conversion for lowest latency)
            # Deepgram supports μ-law format natively
            await dg_connection.send(mulaw_audio_data)
            
        except Exception as e:
            print(f"❌ Error streaming μ-law audio chunk for {session_id}: {e}")
    
    async def _convert_webm_chunk_to_pcm(self, webm_data):
        """Convert WebM audio chunk to PCM for Deepgram (ENTERPRISE OPTIMIZATION)"""
        try:
            # For now, try to send WebM directly to Deepgram
            # Deepgram's live API can handle WebM chunks
            return webm_data
            
        except Exception as e:
            print(f"⚠️ Audio conversion warning: {e}")
            return webm_data
    
    async def stop_streaming_session(self, session_id):
        """Stop streaming STT session"""
        try:
            connection_info = self.active_connections.get(session_id)
            if not connection_info:
                return
            
            dg_connection = connection_info['dg_connection']
            
            # Send final audio chunk to ensure processing completes
            await dg_connection.send(b'')
            
            # Close Deepgram connection
            await dg_connection.finish()
            
            # Remove from active connections
            del self.active_connections[session_id]
            
            session_duration = time.time() - connection_info['start_time']
            print(f"🏁 Stopped streaming STT for {session_id} (duration: {session_duration:.1f}s)")
            
        except Exception as e:
            print(f"❌ Error stopping streaming STT for {session_id}: {e}")
    
    async def cleanup_all_sessions(self):
        """Cleanup all active streaming sessions"""
        for session_id in list(self.active_connections.keys()):
            await self.stop_streaming_session(session_id)

# Global streaming STT manager
streaming_stt_manager = StreamingSTTManager()