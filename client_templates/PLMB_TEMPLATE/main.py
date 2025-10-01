#!/usr/bin/env python3
"""
KLARIQO PLUMBING CLIENT - FASTAPI ASYNC VERSION
Template for automated client deployment with streaming voice AI
"""

import os
import json
import time
import base64
import warnings
import asyncio
import threading
import signal
import sys
import logging

# Suppress warnings and reduce spam in console
warnings.filterwarnings("ignore", category=UserWarning, module="pkg_resources")
warnings.filterwarnings("ignore", category=UserWarning, module="librosa")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("twilio.http_client").setLevel(logging.WARNING)
logging.getLogger("database").setLevel(logging.WARNING)
logging.getLogger("librosa").setLevel(logging.ERROR)
logging.getLogger("deepgram").setLevel(logging.WARNING)
from datetime import datetime

# Import audioop with deprecation warning suppression
try:
    import warnings
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    import audioop
except ImportError:
    print("❌ audioop module not available")
    audioop = None
import io
import csv
from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions
)

# Import our modular components
from config import Config
from session import session_manager
from router import response_router
from tts_engine import tts_engine
from audio_manager import audio_manager
from streaming_stt import StreamingSTTManager
from logger import call_logger
from session_data_exporter import session_exporter
from call_recording import call_recorder

# Import billing system from main app directory
import sys
sys.path.append('/opt/klariqo/voice-ai')
from billing_manager import billing_manager

# Import route blueprints - will convert these to FastAPI
# from routes.inbound import inbound_bp
# from routes.outbound import outbound_bp
# from routes.test import test_bp
# from routes.sms import sms_bp

def process_sms_flags(content, session):
    """Process and extract SMS_FLAG commands from GPT response"""
    import re
    from config import Config

    # Extract all SMS_FLAG commands
    sms_flag_pattern = r'SMS_FLAG:\s*([^\n]+)'
    sms_flags = re.findall(sms_flag_pattern, content)

    # Remove SMS_FLAG lines from content to prevent TTS speaking them
    cleaned_content = re.sub(r'SMS_FLAG:.*\n?', '', content).strip()

    # Process each SMS flag
    for flag in sms_flags:
        flag = flag.strip()
        print(f"🚩 Processing SMS flag: {flag}")

        if flag.startswith('PHONE_CONFIRMED='):
            # Extract phone number and save to session
            phone = flag.replace('PHONE_CONFIRMED=', '').strip()
            session.update_session_variable("confirmed_phone_number", phone)
            print(f"📱 Phone confirmed and saved: {phone}")

        elif flag == 'SEND_PAYMENT_LINK':
            # Check if phone is confirmed before sending SMS
            confirmed_phone = session.get_session_variable("confirmed_phone_number")
            if confirmed_phone:
                print(f"💰 Triggering payment SMS to {confirmed_phone}")
                # SMS sending logic here
            else:
                print("❌ Cannot send payment SMS - no confirmed phone number")

    return cleaned_content

# FastAPI app initialization
app = FastAPI(
    title="Klariqo Plumbing Client Template",
    description="Voice AI receptionist for plumbing businesses - FastAPI async version",
    version="2.0.0"
)

# Configure templates
templates = Jinja2Templates(directory="templates")

# Initialize Deepgram client
config = DeepgramClientOptions(options={"keepalive": "true"})
deepgram_client = DeepgramClient(Config.DEEPGRAM_API_KEY, config)

# Global variable for app URL with subpath
current_app_url = Config.BASE_URL

# Client billing configuration - will be set by onboarding automation
CLIENT_ID = "template_plmb"  # This gets replaced during client creation
CLIENT_REGION = "AU"  # Australia region

# Streaming STT manager for ultra-fast transcription
streaming_stt_manager = StreamingSTTManager(deepgram_client)

# Load audio library on startup
audio_manager.reload_library()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print(f"🚀 Klariqo Plumbing Client Template starting up...")
    print(f"🎵 Audio manager loaded: {len(audio_manager.memory_cache)} files")
    print(f"📞 Ready for voice calls on {Config.BASE_URL}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 Shutting down Klariqo Plumbing Client Template")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with basic info"""
    return {
        "message": "Klariqo Plumbing Voice AI Template",
        "version": "2.0.0",
        "status": "ready",
        "client_id": CLIENT_ID
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "audio_cache": len(audio_manager.memory_cache),
        "deepgram": "connected"
    }

# Dashboard endpoint
@app.get("/dashboard")
async def dashboard(request: Request):
    """Dashboard for client analytics"""
    # Basic dashboard - will be enhanced
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "client_id": CLIENT_ID,
        "stats": {
            "total_calls": 0,
            "successful_calls": 0,
            "audio_files": len(audio_manager.memory_cache)
        }
    })

# ===== AUDIO FILE SERVING FUNCTIONS =====

async def send_audio_twilio_media_stream(websocket, ulaw_data, stream_sid, call_sid=None, session=None):
    """
    Send μ-law data to Twilio Media Streams with proper formatting

    Twilio Media Streams:
    - Format: 8-bit μ-law, 8kHz, mono, base64 encoded
    - Flexible chunk sizes (no 320-byte requirement like Exotel)
    - Send via WebSocket as media events
    """
    try:
        if not stream_sid:
            print("❌ No stream_sid available")
            return

        if not ulaw_data:
            print("❌ No μ-law data provided")
            return

        # Add to call recording if active
        if call_sid and call_recorder.is_recording_active(call_sid):
            call_recorder.add_ai_audio(call_sid, ulaw_data)

        # Send μ-law data in reasonable chunks (Twilio is flexible)
        CHUNK_SIZE = 8000  # ~1 second of 8kHz μ-law audio
        total_chunks = len(ulaw_data) // CHUNK_SIZE

        # Send chunks with minimal delay, check for interruption
        for i in range(total_chunks):
            # Check for interruption before sending each chunk
            if session and hasattr(session, 'stop_audio_streaming') and session.stop_audio_streaming:
                print(f"🚫 Audio streaming interrupted at chunk {i+1}/{total_chunks}")
                return  # Stop streaming immediately

            start_pos = i * CHUNK_SIZE
            end_pos = min((i + 1) * CHUNK_SIZE, len(ulaw_data))
            chunk = ulaw_data[start_pos:end_pos]

            # Base64 encode for Twilio
            payload = base64.b64encode(chunk).decode('utf-8')

            # Create Twilio media message
            media_message = json.dumps({
                'event': 'media',
                'streamSid': stream_sid,
                'media': {
                    'payload': payload
                }
            })

            # Send to Twilio WebSocket
            await websocket.send_text(media_message)

            # Small delay between chunks for smooth playback
            await asyncio.sleep(0.02)  # 20ms delay

        # Handle remaining bytes
        remaining_start = total_chunks * CHUNK_SIZE
        if remaining_start < len(ulaw_data):
            remaining_chunk = ulaw_data[remaining_start:]
            payload = base64.b64encode(remaining_chunk).decode('utf-8')

            media_message = json.dumps({
                'event': 'media',
                'streamSid': stream_sid,
                'media': {
                    'payload': payload
                }
            })

            await websocket.send_text(media_message)

        # print(f"✅ Sent {len(ulaw_data)} bytes of μ-law audio")

    except Exception as e:
        print(f"❌ Error sending audio to Twilio: {e}")

# ===== TWILIO WEBSOCKET HANDLER =====

# WebSocket handler for media streaming
@app.websocket('/media/{call_sid}')
async def media_stream(websocket: WebSocket, call_sid: str):
    """Handle Twilio streaming audio (FastAPI async WebSocket)"""
    await websocket.accept()

    print(f"📞 New call connected: {call_sid[:8]}")

    # Create session for this call
    session = session_manager.create_session(call_sid)
    session.call_started_at = time.time()
    session.twilio_ws = websocket
    session.stream_sid = None

    # Use clean StreamingSTTManager
    streaming_started = await streaming_stt_manager.start_streaming_session(
        call_sid, websocket, session, process_streaming_response
    )
    if not streaming_started:
        print(f"❌ Failed to start streaming STT for {call_sid}")
        await websocket.close()
        return

    async def transcript_checker():
        """Monitor for completed transcripts and timeouts"""
        while True:
            await asyncio.sleep(0.05)  # Use async sleep

            # Check for timeout
            if session.check_timeout():
                print(f"⏰ Disconnecting call {call_sid} due to timeout")

                # Log call end for timeout
                try:
                    call_logger.log_call_end(call_sid, "timeout")
                    session_exporter.export_session_data(session)
                    print(f"📊 Timeout call logged for {call_sid}")
                except Exception as e:
                    print(f"⚠️ Error logging timeout call: {e}")

                try:
                    # Send stop event to Twilio
                    stop_message = json.dumps({
                        'event': 'stop',
                        'streamSid': session.stream_sid
                    })
                    await websocket.send_text(stop_message)
                except Exception as e:
                    print(f"⚠️ Error sending stop message: {e}")
                break

            # Check for completed transcripts
            if session.check_for_completion():
                # Use streaming GPT + TTS
                await process_streaming_response(session.completed_transcript, call_sid, websocket, session.stream_sid)
                session.reset_for_next_input()

    # Start transcript checker as async task
    transcript_task = asyncio.create_task(transcript_checker())

    try:
        # Handle WebSocket messages from Twilio (async)
        async for message in websocket.iter_text():
            if not message:
                print(f"🔍 WebSocket connection closed for call: {call_sid}")
                break

            data = json.loads(message)

            if data.get('event') == 'connected':
                pass

            elif data.get('event') == 'start':
                session.stream_sid = data.get('streamSid')
                print(f"🎙️ Call stream started: {call_sid[:8]}")

            elif data.get('event') == 'media':
                # Stream audio via clean StreamingSTTManager
                media_payload = data.get('media', {}).get('payload', '')
                if media_payload:
                    try:
                        mulaw_data = base64.b64decode(media_payload)
                        await streaming_stt_manager.stream_audio_chunk(call_sid, mulaw_data)

                        # Add to call recording if active
                        if call_recorder.is_recording_active(call_sid):
                            await asyncio.get_event_loop().run_in_executor(
                                None, call_recorder.add_user_audio, call_sid, mulaw_data
                            )

                    except Exception as e:
                        print(f"⚠️ Audio processing error: {e}")

            elif data.get('event') == 'stop':
                print(f"🛑 Stream stopped: {call_sid}")
                break

    except Exception as e:
        print(f"❌ WebSocket error for {call_sid}: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Stop call recording if active
        try:
            if call_recorder.is_recording_active(call_sid):
                call_recorder.stop_recording(call_sid)
                print(f"🎙️ Stopped recording for call {call_sid}")
        except Exception as e:
            print(f"⚠️ Error stopping recording: {e}")

        # Export session data before cleanup
        try:
            session_exporter.export_session_data(session)
            print(f"📊 Session data exported for {call_sid[:8]}")
        except Exception as e:
            print(f"⚠️ Error exporting session data: {e}")

        # Cleanup
        try:
            await streaming_stt_manager.stop_streaming_session(call_sid)
            session_manager.remove_session(call_sid)
            print(f"🧹 Session cleaned up for {call_sid[:8]}")
        except Exception as e:
            print(f"⚠️ Cleanup error: {e}")

        # Cancel transcript checker
        try:
            transcript_task.cancel()
        except:
            pass

async def process_streaming_response(transcript, call_sid, websocket, stream_sid):
    """Process transcript with streaming GPT + TTS or audio snippets"""
    try:
        start_time = time.time()

        # Get or create session
        session = session_manager.get_session(call_sid)
        if not session:
            print(f"❌ No session found for {call_sid}")
            return

        # Add user input to conversation history BEFORE AI response
        session.add_to_history("User", transcript)

        # Use streaming GPT → TTS or audio snippets
        response_type, content, status = await response_router.get_plumber_response_streaming(session, transcript, websocket)

        # Handle disconnect AFTER audio/TTS finishes completely
        if status == "disconnect":
            print(f"🔚 Disconnect requested from {response_type} - triggering after audio completes")
            # Use the existing response_router instance
            await response_router._trigger_call_disconnect(websocket, session)

        # Calculate total response time
        response_time_ms = int((time.time() - start_time) * 1000)

        # Mark AI response as complete (enables new conversation)
        session.end_ai_speech()

    except Exception as e:
        print(f"❌ Streaming processing error for {call_sid}: {e}")
        # Send error audio to Twilio in case of failure
        error_msg = "I'm sorry, I'm having trouble processing that right now. Could you please repeat?"
        try:
            # Generate quick TTS for error message
            import base64
            error_audio = tts_engine.generate_audio(error_msg)
            if error_audio and hasattr(session, 'stream_sid') and session.stream_sid:
                # Convert to μ-law and send to Twilio
                error_media = json.dumps({
                    'event': 'media',
                    'streamSid': session.stream_sid,
                    'media': {
                        'payload': base64.b64encode(error_audio).decode('utf-8')
                    }
                })
                await websocket.send_text(error_media)
        except Exception as tts_error:
            print(f"❌ Error generating error message TTS: {tts_error}")

# ===== ROUTE HANDLERS (Convert from Flask blueprints) =====

@app.post("/inbound/call")
async def inbound_call(request: Request):
    """Handle inbound call routing"""
    # Convert from Flask blueprint logic
    return {"status": "success", "message": "Inbound call handled"}

@app.post("/outbound/call")
async def outbound_call(request: Request):
    """Handle outbound call routing"""
    # Convert from Flask blueprint logic
    return {"status": "success", "message": "Outbound call handled"}

@app.get("/test")
async def test_endpoint():
    """Test endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "audio_cache": len(audio_manager.memory_cache)
    }

# ===== MAIN EXECUTION =====

if __name__ == "__main__":
    import uvicorn

    # Get port from environment or use default
    port = int(os.environ.get("PORT", 8000))

    print(f"🚀 Starting Klariqo Plumbing Client Template on port {port}")

    uvicorn.run(
        "main_fastapi:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        access_log=False,
        log_level="warning"
    )