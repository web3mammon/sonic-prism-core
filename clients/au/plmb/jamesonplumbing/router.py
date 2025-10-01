#!/usr/bin/env python3
"""
KLARIQO RESPONSE ROUTER MODULE - FASTAPI ASYNC VERSION
GPT-directed audio snippets + streaming TTS fallback for plumbing clients
"""

import os
import time
import asyncio
import re
import json
from typing import List, Optional, Tuple
from openai import AsyncOpenAI
from config import Config
from tts_engine import tts_engine

# Initialize Async OpenAI client
openai_client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)

class ResponseRouter:
    """Handles AI-powered response selection with reliable GPT processing"""

    def __init__(self, client_config=None):
        self.client_config = client_config or Config.CLIENT_CONFIG
        print(f"🤖 Response Router initialized: {self.client_config.get('business_name', 'Unknown Client')}")
        print(f"🎯 GPT-directed audio snippets + streaming TTS enabled")

    def _build_prompt(self, session, user_input):
        """Build a simple, clear prompt for GPT with conversation context"""

        # Get recent conversation history
        recent_conversation = self._get_recent_conversation(session, limit=10)
        # Get session variables for GPT context
        session_vars = self._get_session_context(session)

        # Get AI agent name from instance config
        ai_agent_name = self.client_config.get('ai_assistant_name', 'Receptionist')
        business_name = self.client_config.get('business_name', os.getenv('BUSINESS_NAME', 'Your Plumbing Business'))

        prompt = f"""You are the AI receptionist for {business_name}, answering customer calls professionally.

=== AVAILABLE AUDIO FILES ===
intro_greeting.mp3: "G'day! You've reached {business_name}. How can we help you today?"

pricing.mp3: "Our pricing usually starts at $98 for standard service calls. We'll provide a full quote after understanding the job better."
cost_estimate_enquiry.mp3: "I can give you a ballpark now, and we'll confirm once we see the job."

after_hours_greeting.mp3: "G'day, {business_name} here. It's after hours right now, but if it's urgent, we can still help for an after-hours call-out fee. Otherwise, leave your name and number and we'll get back to you first thing."
in_business_how_long.mp3: "We've been doing this for 7 years now and got loads of happy clients and repeat work. You'll be in safe hands."
services_offered.mp3: "We handle blocked drains, leaking taps, toilet repairs, hot water issues, and a range of other plumbing issues. We also do gas fitting, pipe relining, and kitchen or bathroom plumbing. What's the issue you're facing right now?"
available_hours.mp3: "We're available Monday through Saturday, 8am to 6pm. After-hours emergency support is also available for an extra service fee, so yeah, give us a ring anytime."
ask_time_day.mp3: "We've got a few open slots this week. What time and day works for you?"

blocked_drain.mp3: "Blocked drain? Yeah, that's a common one here — we can sort that out quick smart."
leaking_tap.mp3: "Ah, the good ol' drip. Yep, we can fix that up for ya quick as — shouldn't take long at all."
toilet_repair.mp3: "Gotcha, we'll get that toilet working again for you."
hot_water_issues.mp3: "Oof, no hot water's no fun. We'll check it out and get you back up and running."
gas_fitting.mp3: "Sure thing, we're licensed for gas work. Is it for a new install or a check-up?"
pipe_relining.mp3: "Yeah, we do pipe relining all the time. Saves you ripping the whole thing out."
bath_kitchen_plumbing.mp3: "Easy done — we can handle the whole lot start to finish. Are you mid-reno now?"

when_can_come.mp3: "What's a good time to swing by?"
general_problems.mp3: "Righto, I am sure we can help. Can you tell me a bit more about what's going on there?"
urgent_callout.mp3: "If it's urgent, we can reshuffle and get someone out today. Want me to do that?"
confirmed_bye.mp3: "Perfect, you're locked in. We'll see you then. Thanks for calling!"
need_to_check.mp3: "No worries, I can hold your spot for the day you prefer while you check."

=== INTENT DETECTION ===
Analyze what the customer wants and categorize their intent:
- Emergency Service: Urgent/immediate help needed (burst pipe, no hot water, toilet overflow)
- Appointment Booking: Scheduling regular maintenance or non-urgent repairs
- Quote Request: Asking for pricing, estimates, or what work costs
- General Inquiry: Questions about services, business hours, availability
- Complaint: Issues with previous work or service
- Follow-up: Checking on scheduled work or previous conversations

=== OUTPUT FORMAT ===
First line: INTENT:[category] (e.g., INTENT:Emergency Service)
Second line: Audio file filename only (e.g., blocked_drain.mp3) OR "GENERATE:" then the text to speak
- No other text, quotes, or punctuation around filenames

=== DECISION RULES ===
- Greeting/first contact → intro_greeting.mp3
- Pricing questions → pricing.mp3 or cost_estimate_enquiry.mp3
- Service questions → services_offered.mp3
- Blocked drain → blocked_drain.mp3
- Leaking tap → leaking_tap.mp3
- Toilet issues → toilet_repair.mp3
- Hot water problems → hot_water_issues.mp3
- Gas work → gas_fitting.mp3
- Bathroom/kitchen → bath_kitchen_plumbing.mp3
- Scheduling → ask_time_day.mp3 or when_can_come.mp3
- Urgent/emergency → urgent_callout.mp3
- Business hours → available_hours.mp3
- Experience questions → in_business_how_long.mp3
- After hours → after_hours_greeting.mp3
- Booking confirmation → confirmed_bye.mp3
- General problems → general_problems.mp3
- Need to check availability → need_to_check.mp3
- Specific questions not covered by audio → GENERATE: [short response]

=== CONVERSATION SO FAR ===
{recent_conversation}

=== WHAT YOU KNOW ===
{session_vars}

=== USER JUST SAID ===
"{user_input}"

=== TONE ===
- Professional but friendly Australian tone
- Helpful and solution-focused
- Use audio files for common responses, TTS for specific details
- Keep TTS responses short and conversational

Respond as {ai_agent_name}:"""

        return prompt

    def _extract_intent_and_response(self, gpt_response):
        """Extract intent and actual response from GPT output"""
        lines = gpt_response.strip().split('\n')

        intent = None
        actual_response = gpt_response

        # Check if first line contains intent
        if lines and lines[0].startswith("INTENT:"):
            intent_line = lines[0]
            intent = intent_line.replace("INTENT:", "").strip()

            # Get the actual response (everything after the intent line)
            if len(lines) > 1:
                actual_response = '\n'.join(lines[1:]).strip()
            else:
                # Fallback if no response after intent
                actual_response = "GENERATE: I understand. How can I help you with that?"

        return intent, actual_response

    def _get_recent_conversation(self, session, limit=10):
        """Get recent conversation context formatted for GPT"""
        if not hasattr(session, 'conversation_history') or not session.conversation_history:
            return "No previous conversation"

        # Get last N messages and clean them for GPT
        recent = session.conversation_history[-(limit):]

        # Convert timestamped format to clean GPT format
        clean_messages = []
        for msg in recent:
            # Remove timestamp: "[12:34:56] User: hello" → "User: hello"
            if "] " in msg:
                clean_msg = msg.split("] ", 1)[1]
                clean_messages.append(clean_msg)
            else:
                clean_messages.append(msg)

        return "\n".join(clean_messages) if clean_messages else "No previous conversation"

    def _get_session_context(self, session):
        """Get key session variables for GPT context"""
        context_parts = []

        # Customer information
        customer_name = session.get_session_variable("customer_name")
        if customer_name:
            context_parts.append(f"CUSTOMER_NAME: {customer_name}")

        phone_number = session.get_session_variable("phone_number")
        if phone_number:
            context_parts.append(f"PHONE_NUMBER: {phone_number}")

        # Job details
        job_type = session.get_session_variable("job_type")
        if job_type:
            context_parts.append(f"JOB_TYPE: {job_type}")

        urgency = session.get_session_variable("urgency")
        if urgency:
            context_parts.append(f"URGENCY: {urgency}")

        # Scheduling
        preferred_time = session.get_session_variable("preferred_time")
        if preferred_time:
            context_parts.append(f"PREFERRED_TIME: {preferred_time}")

        booking_confirmed = session.get_session_variable("booking_confirmed")
        if booking_confirmed:
            context_parts.append(f"BOOKING_CONFIRMED: {booking_confirmed}")

        return " | ".join(context_parts) if context_parts else "No session data"

    async def get_plumber_response_streaming(self, session, user_input, websocket):
        """Generate plumber response with GPT-directed audio snippets"""
        try:
            call_id = session.call_sid[:8] if hasattr(session, 'call_sid') else 'unknown'
            print(f"🤖 [{call_id}] Getting GPT response for: '{user_input[:50]}...'")

            # Build prompt with session context
            prompt = self._build_prompt(session, user_input)

            # Get non-streaming response from GPT first
            response = await openai_client.chat.completions.create(
                model=Config.PRIMARY_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=300,
                temperature=0.7,
                timeout=15,
                stream=False
            )

            full_content = response.choices[0].message.content.strip()
            print(f"🤖 GPT Response: {full_content}")

            # Extract intent and actual response
            intent, actual_response = self._extract_intent_and_response(full_content)

            # Store intent in session for later database logging
            if intent:
                session.update_session_variable("detected_intent", intent)
                print(f"🎯 Intent detected: {intent}")

            # Check if GPT wants to play audio file or use TTS
            if actual_response.startswith("GENERATE:"):
                # TTS fallback - use streaming TTS for best experience
                tts_text = actual_response.replace("GENERATE:", "").strip()
                return await self._handle_streaming_tts_response(websocket, session, tts_text, user_input)
            else:
                # Audio snippet requested by GPT
                audio_file = actual_response.strip()
                return await self._play_audio_snippet(websocket, session, audio_file, user_input)

        except Exception as e:
            print(f"❌ Error getting GPT response: {e}")
            return "tts", "I'm having a brief technical issue. Could you please repeat that?", None

    async def _handle_streaming_tts_response(self, websocket, session, tts_text, user_input):
        """Handle streaming TTS response (when GPT says GENERATE:)"""
        try:
            # Check for disconnect signal
            should_disconnect = "DISCONNECT_CALL" in tts_text
            if should_disconnect:
                tts_text = tts_text.replace("DISCONNECT_CALL", "").strip()

            # Stream TTS sentence by sentence
            await self._stream_tts_sentence(websocket, tts_text, session)

            # Process session variables
            await self._process_response_triggers(session, user_input, tts_text)

            # Log TTS response
            from logger import call_logger
            call_logger.log_lauren_tts_response(session.call_sid, tts_text, None)

            # Add to conversation history
            ai_agent_name = self.client_config.get('ai_assistant_name', 'Receptionist')
            session.add_to_history(ai_agent_name, tts_text)

            print(f"🤖 {ai_agent_name.upper()} (TTS): {tts_text[:100]}{'...' if len(tts_text) > 100 else ''}")

            # DON'T trigger disconnect here - let it finish in main.py
            return "streaming_tts", tts_text, "disconnect" if should_disconnect else None

        except Exception as e:
            print(f"❌ Error handling streaming TTS: {e}")
            return "tts", "I'm having a brief technical issue.", None

    async def _play_audio_snippet(self, websocket, session, audio_file, user_input):
        """Play audio snippet and return response data"""
        try:
            from audio_manager import audio_manager
            from main_fastapi import send_audio_twilio_media_stream
            from logger import call_logger

            call_id = session.call_sid[:8] if hasattr(session, 'call_sid') else 'unknown'
            print(f"🎵 [{call_id}] Playing audio snippet: {audio_file}")

            # Get audio from memory cache
            ulaw_data = audio_manager.memory_cache.get(audio_file)

            if ulaw_data:
                # Mark AI as speaking
                session.start_ai_speech()

                # Stream audio snippet to Twilio
                await send_audio_twilio_media_stream(
                    websocket, ulaw_data, session.stream_sid, session.call_sid, session
                )

                # Log audio response
                call_logger.log_lauren_audio_response(session.call_sid, audio_file)

                # Add to conversation history with snippet content
                audio_content = self._get_audio_snippet_content(audio_file)
                ai_agent_name = self.client_config.get('ai_assistant_name', 'Receptionist')
                session.add_to_history(ai_agent_name, audio_content)

                print(f"🎵 Audio snippet played: {audio_file}")
                session.end_ai_speech()

                # Process session variables
                await self._process_response_triggers(session, user_input, audio_content)

                return "audio_snippet", audio_content, None

            else:
                print(f"❌ Audio snippet not found in cache: {audio_file}")
                return None

        except Exception as e:
            print(f"❌ Error playing audio snippet: {e}")
            return None

    def _get_audio_snippet_content(self, audio_file):
        """Get the text content of audio snippets for conversation history"""
        # Get business name dynamically
        business_name = self.client_config.get('business_name', os.getenv('BUSINESS_NAME', 'Your Plumbing Business'))

        # This maps audio files to their actual content for conversation tracking
        snippet_content = {
            "intro_greeting.mp3": f"G'day! You've reached {business_name}. How can we help you today?",
            "pricing.mp3": "Our pricing usually starts at $98 for standard service calls. We'll provide a full quote after understanding the job better.",
            "cost_estimate_enquiry.mp3": "I can give you a ballpark now, and we'll confirm once we see the job.",
            "blocked_drain.mp3": "Blocked drain? Yeah, that's a common one here — we can sort that out quick smart.",
            "leaking_tap.mp3": "Ah, the good ol' drip. Yep, we can fix that up for ya quick as — shouldn't take long at all.",
            "toilet_repair.mp3": "Gotcha, we'll get that toilet working again for you.",
            "hot_water_issues.mp3": "Oof, no hot water's no fun. We'll check it out and get you back up and running.",
            "gas_fitting.mp3": "Sure thing, we're licensed for gas work. Is it for a new install or a check-up?",
            "pipe_relining.mp3": "Yeah, we do pipe relining all the time. Saves you ripping the whole thing out.",
            "bath_kitchen_plumbing.mp3": "Easy done — we can handle the whole lot start to finish. Are you mid-reno now?",
            "services_offered.mp3": "We handle blocked drains, leaking taps, toilet repairs, hot water issues, and a range of other plumbing issues. We also do gas fitting, pipe relining, and kitchen or bathroom plumbing. What's the issue you're facing right now?",
            "available_hours.mp3": "We're available Monday through Saturday, 8am to 6pm. After-hours emergency support is also available for an extra service fee, so yeah, give us a ring anytime.",
            "ask_time_day.mp3": "We've got a few open slots this week. What time and day works for you?",
            "when_can_come.mp3": "What's a good time to swing by?",
            "general_problems.mp3": "Righto, I am sure we can help. Can you tell me a bit more about what's going on there?",
            "urgent_callout.mp3": "If it's urgent, we can reshuffle and get someone out today. Want me to do that?",
            "confirmed_bye.mp3": "Perfect, you're locked in. We'll see you then. Thanks for calling!",
            "need_to_check.mp3": "No worries, I can hold your spot for the day you prefer while you check.",
            "in_business_how_long.mp3": "We've been doing this for 7 years now and got loads of happy clients and repeat work. You'll be in safe hands.",
            "after_hours_greeting.mp3": f"G'day, {business_name} here. It's after hours right now, but if it's urgent, we can still help for an after-hours call-out fee. Otherwise, leave your name and number and we'll get back to you first thing."
        }
        return snippet_content.get(audio_file, f"[Audio: {audio_file}]")

    async def _stream_tts_sentence(self, websocket, sentence_text, session):
        """Convert sentence to TTS and stream immediately to Twilio μ-law"""
        try:
            # Mark AI as speaking
            session.start_ai_speech()

            # Import TTS engine and streaming function
            from tts_engine import tts_engine
            from main_fastapi import send_audio_twilio_media_stream

            # Clean text for TTS (remove GENERATE: prefix if present)
            clean_text = sentence_text
            if clean_text.startswith("GENERATE:"):
                clean_text = clean_text.replace("GENERATE:", "").strip()

            if not clean_text:
                return

            # Generate TTS with direct μ-law output (async)
            ulaw_data = await asyncio.get_event_loop().run_in_executor(
                None, lambda: tts_engine.generate_audio(clean_text, save_temp=False)
            )

            if ulaw_data:
                # Stream μ-law directly to Twilio
                await send_audio_twilio_media_stream(
                    websocket, ulaw_data, session.stream_sid, session.call_sid, session
                )

        except Exception as e:
            print(f"❌ Error streaming TTS sentence: {e}")
            import traceback
            traceback.print_exc()

    async def _trigger_call_disconnect(self, websocket, session):
        """Gracefully disconnect the call after GPT signals conversation end"""
        try:
            import asyncio
            from twilio.rest import Client
            from config import Config
            print(f"🔚 Initiating graceful call disconnect for {session.call_sid}")

            # Give a brief pause to ensure TTS finishes
            await asyncio.sleep(1.0)

            # Method 1: End the call via Twilio REST API (most reliable)
            try:
                twilio_client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
                twilio_client.calls(session.call_sid).update(status='completed')
                print(f"🔚 Ended call via Twilio REST API: {session.call_sid}")
            except Exception as api_error:
                print(f"⚠️ Twilio REST API call end failed: {api_error}")

                # Method 2: Close WebSocket as fallback
                if websocket:
                    await websocket.close()
                    print(f"🔚 Closed WebSocket connection for {session.call_sid}")

            # Mark session as ended
            session.call_ended = True

        except Exception as e:
            print(f"❌ Error triggering call disconnect: {e}")

    async def _process_response_triggers(self, session, user_input, ai_content):
        """Process session variables for plumbing business tracking"""
        import threading

        # Extract session variables (background)
        threading.Thread(target=self._extract_session_variables, args=(session, user_input, ai_content), daemon=True).start()

    def _extract_session_variables(self, session, user_input, ai_response):
        """Extract and store session variables from conversation"""
        # Note: ai_response parameter kept for compatibility but not currently used
        try:
            # Extract customer name
            if "my name is" in user_input.lower() or "i'm" in user_input.lower():
                words = user_input.split()
                for i, word in enumerate(words):
                    if word.lower() in ["name", "i'm", "im", "call"]:
                        if i + 1 < len(words):
                            name = words[i + 1].strip(".,!?")
                            if len(name) > 1:
                                session.update_session_variable("customer_name", name)
                                break

            # Extract phone number
            import re
            phone_pattern = r'\b(?:\+?61|0)[2-478](?:[ -]?\d){8}\b'
            phone_matches = re.findall(phone_pattern, user_input)
            if phone_matches:
                session.update_session_variable("phone_number", phone_matches[0])

            # Extract job type
            job_keywords = {
                "blocked_drain": ["blocked", "drain", "clogged", "backup"],
                "leaking_tap": ["leaking", "tap", "faucet", "drip"],
                "toilet_repair": ["toilet", "loo", "cistern", "flush"],
                "hot_water": ["hot water", "heater", "no hot water", "cold"],
                "gas_fitting": ["gas", "stove", "cooktop", "hot water unit"],
                "pipe_relining": ["pipe", "relining", "replacement", "burst"],
                "bathroom_renovation": ["bathroom", "renovation", "reno", "kitchen"]
            }

            for job_type, keywords in job_keywords.items():
                if any(keyword in user_input.lower() for keyword in keywords):
                    session.update_session_variable("job_type", job_type)
                    break

            # Extract urgency
            if any(word in user_input.lower() for word in ["urgent", "emergency", "asap", "now", "today"]):
                session.update_session_variable("urgency", "urgent")
            elif any(word in user_input.lower() for word in ["tomorrow", "next week", "when possible"]):
                session.update_session_variable("urgency", "normal")

            # Extract time preferences
            time_indicators = ["morning", "afternoon", "evening", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            for indicator in time_indicators:
                if indicator in user_input.lower():
                    current_time = session.get_session_variable("preferred_time") or ""
                    if indicator not in current_time:
                        session.update_session_variable("preferred_time", f"{current_time} {indicator}".strip())

        except Exception as e:
            print(f"⚠️ Error extracting session variables: {e}")

    def validate_response(self, response_content):
        """Validate that the response is valid TTS content"""
        return bool(response_content and isinstance(response_content, str))

# Global response router instance - will be created with client-specific config
response_router = None

def create_response_router(client_config=None):
    """Factory function to create router with specific client config"""
    return ResponseRouter(client_config)

# Default instance for backward compatibility
response_router = create_response_router()