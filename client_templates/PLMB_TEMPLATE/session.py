#!/usr/bin/env python3
"""
KLARIQO SESSION MANAGEMENT MODULE
Handles call session states for both inbound and outbound calls
"""

import time
from config import Config

class StreamingSession:
    """Manages individual call session state and memory"""
    
    def __init__(self, call_sid, from_number=None, to_number=None):
        """Initialize a new call session"""
        self.call_sid = call_sid
        self.from_number = from_number
        self.to_number = to_number
        
        # Get client configuration based on phone number
        self.client_config = Config.get_client_config(to_number)
        self.client_id = self.client_config.get('client_id', 'default')
        
        # Initialize session with client-specific settings
        self.session_flags = self.client_config.get('session_flags_template', {}).copy()
        self.audio_folder = self.client_config.get('audio_folder', 'audio_ulaw/')
        
        # Session memory for backward compatibility
        self.session_memory = {
            "intro_played": False,
            "product_explained": False,
            "pricing_discussed": False,
            "demo_scheduled": False,
            "objections_handled": False,
            "sms_number_asked": False,
            "phone_number_confirmed": False,
            "recording_permission_asked": False,
            "recording_permission_granted": False,
            "recording_started": False,
            "payment_sms_sent": False
        }
        
        # Simple status tracking (6 key metrics)
        self.status_tracking = {
            "recording_permission": "No",
            "recording_started": "No", 
            "client_interested": "No",
            "package_type": None,
            "payment_link_sent": "No",
            "client_paid": "No"
        }
        
        # Session variables for dynamic data
        self.session_variables = {}
        
        # Call direction and lead data (will be set by SessionManager)
        self.call_direction = "inbound"  # Default to inbound
        self.lead_data = {}
        
        # Session state
        self.conversation_history = []
        self.accumulated_speech = ""
        self.accumulated_text = ""
        self.last_speech_time = time.time()
        self.last_activity_time = None
        self.last_user_activity = time.time()
        self.silence_start_time = None
        self.silence_threshold = Config.SILENCE_THRESHOLD_BASE
        self.question_asked_time = None
        self.last_ai_response_type = None  # 'question' or 'statement'
        
        # Processing state
        self.is_processing = False
        self.transcript_ready = False
        self.completed_transcript = None
        self.is_ai_speaking = False
        self.ai_speech_start_time = None
        
        # Timeout settings
        self.call_timeout = Config.CALL_TIMEOUT
        self.payment_timeout = Config.PAYMENT_TIMEOUT
        self.payment_link_sent = False
        self.payment_link_time = None
        
        # Deepgram connection
        self.dg_connection = None
        

        
        # Interest tracking
        self.interest_level = None  # None, 'low', 'medium', 'high'
        self.last_interest_update = time.time()
        
        # Call metadata
        self.call_start_time = time.time()
        self.total_speech_time = 0
        self.interruptions = 0
        
        # print(f"🆕 Session created for {self.client_id} ({self.client_config['business_name']}) - Call: {call_sid}")
    
    def on_deepgram_open(self, *args, **kwargs):
        """Handle Deepgram connection opening"""
        # Removed debug print for cleaner logs
        pass
    
    def on_deepgram_message(self, *args, **kwargs):
        """Process incoming speech transcription from Deepgram"""
        if self.is_processing:
            return
            
        result = kwargs.get('result')
        if result is None:
            return
            
        sentence = result.channel.alternatives[0].transcript
        is_final = result.is_final
        
        # Print Deepgram output for debugging
        if sentence.strip():
            # Only show final Deepgram outputs for clean console
            if is_final:
                print(f"📞 User: {sentence}")
            # print(f"🎤 Deepgram: '{sentence}' (final: {is_final})")
            
            # Update user activity timestamp
            # Update user activity timestamp
            self.last_user_activity = time.time()
            self.last_activity_time = time.time()
            
            if is_final:
                if self.accumulated_text:
                    self.accumulated_text += " " + sentence
                else:
                    self.accumulated_text = sentence
                
                # Update silence threshold if AI just asked a question
                if self.last_ai_response_type == "question" and self.question_asked_time:
                    if (time.time() - self.question_asked_time) < 10:
                        self.silence_threshold = Config.SILENCE_THRESHOLD_AFTER_QUESTION
                    else:
                        self.silence_threshold = Config.SILENCE_THRESHOLD_BASE
    
    def on_deepgram_error(self, *args, **kwargs):
        """Handle Deepgram connection errors"""
        error = kwargs.get('error', 'Unknown error')
        print(f"❌ Deepgram error for call {self.call_sid}: {error}")
    
    # def _update_silence_threshold(self): # Removed as per new_code
    #     """Update silence threshold based on conversation context and confidence""" # Removed as per new_code
    #     base_threshold = Config.SILENCE_THRESHOLD_BASE # Removed as per new_code
        
    #     # Context-aware adjustments # Removed as per new_code
    #     if self.last_ai_response_type == "question": # Removed as per new_code
    #         # AI just asked a question - give more time for response # Removed as per new_code
    #         if self.question_asked_time and (time.time() - self.question_asked_time) < 10: # Removed as per new_code
    #             base_threshold = Config.SILENCE_THRESHOLD_AFTER_QUESTION # Removed as per new_code
    #             print(f"🎯 Context: After question - extended threshold to {base_threshold}s") # Removed as per new_code
        
    #     # Check conversation stage # Removed as per new_code
    #     if self.session_memory.get("pricing_discussed", False): # Removed as per new_code
    #         # During pricing discussion - faster responses # Removed as per new_code
    #         base_threshold = Config.SILENCE_THRESHOLD_PAYMENT_DISCUSSION # Removed as per new_code
    #         print(f"🎯 Context: Payment discussion - reduced threshold to {base_threshold}s") # Removed as per new_code
        
    #     if self.session_memory.get("demo_scheduled", False): # Removed as per new_code
    #         # During demo scheduling - more time for decisions # Removed as per new_code
    #         base_threshold = Config.SILENCE_THRESHOLD_DEMO_SCHEDULING # Removed as per new_code
    #         print(f"🎯 Context: Demo scheduling - extended threshold to {base_threshold}s") # Removed as per new_code
        
    #     # Confidence-based adjustments # Removed as per new_code
    #     if self.last_speech_confidence > 0.9: # Removed as per new_code
    #         # High confidence speech - can respond faster # Removed as per new_code
    #         base_threshold -= Config.HIGH_CONFIDENCE_BONUS # Removed as per new_code
    #         print(f"🎯 Confidence: High ({self.last_speech_confidence:.2f}) - reduced threshold to {base_threshold}s") # Removed as per new_code
        
    #     if self.consecutive_low_confidence > 3: # Removed as per new_code
    #         # Multiple low confidence segments - wait longer # Removed as per new_code
    #         base_threshold += 0.5 # Removed as per new_code
    #         print(f"🎯 Confidence: Low consecutive ({self.consecutive_low_confidence}) - increased threshold to {base_threshold}s") # Removed as per new_code
        
    #     # Content-based adjustments # Removed as per new_code
    #     if self.accumulated_text: # Removed as per new_code
    #         text_lower = self.accumulated_text.lower() # Removed as per new_code
            
    #         # Check for thinking indicators # Removed as per new_code
    #         if any(word in text_lower for word in ["um", "uh", "well", "let me think", "i don't know"]): # Removed as per new_code
    #             base_threshold = Config.SILENCE_THRESHOLD_THINKING # Removed as per new_code
    #             print(f"🎯 Content: Thinking indicators - extended threshold to {base_threshold}s") # Removed as per new_code
            
    #         # Check for objection indicators # Removed as per new_code
    #         if any(word in text_lower for word in ["but", "however", "i'm not sure", "i don't think", "expensive", "cost"]): # Removed as per new_code
    #             base_threshold = Config.SILENCE_THRESHOLD_OBJECTION # Removed as per new_code
    #             print(f"🎯 Content: Objection indicators - extended threshold to {base_threshold}s") # Removed as per new_code
            
    #         # Check for question indicators # Removed as per new_code
    #         if any(word in text_lower for word in ["what", "how", "when", "where", "why", "?"]): # Removed as per new_code
    #             base_threshold = Config.SILENCE_THRESHOLD_QUESTION # Removed as per new_code
    #             print(f"🎯 Content: Question indicators - extended threshold to {base_threshold}s") # Removed as per new_code
        
    #     self.context_aware_threshold = max(0.5, base_threshold)  # Minimum 0.5s threshold # Removed as per new_code
    
    def check_for_completion(self):
        """Simple completion check with basic silence detection"""
        if not self.accumulated_text or not self.last_activity_time or self.is_processing:
            return False
        
        silence_duration = time.time() - self.last_activity_time
        
        # Check if silence duration exceeds threshold
        if silence_duration >= self.silence_threshold:
            # Basic completion check - just need some content
            if len(self.accumulated_text.split()) >= 2:  # At least 2 words
                # print(f"✅ Speech complete: '{self.accumulated_text}' (silence: {silence_duration:.1f}s)")
                self.completed_transcript = self.accumulated_text
                self.transcript_ready = True
                self.accumulated_text = ""
                self.last_activity_time = None
                return True
        
        return False



    def start_ai_speech(self):
        """Mark that AI is starting to speak"""
        self.is_ai_speaking = True
        self.ai_speech_start_time = time.time()

    def end_ai_speech(self):
        """Mark that AI has finished speaking"""
        self.is_ai_speaking = False
        self.ai_speech_start_time = None
    


    def check_timeout(self):
        """Check if call should be disconnected due to timeout"""
        current_time = time.time()
        
        # Determine timeout threshold based on payment status
        if self.payment_link_sent:
            timeout_threshold = self.payment_timeout
            timeout_type = "payment"
        else:
            timeout_threshold = self.call_timeout
            timeout_type = "call"
        
        if current_time - self.last_user_activity > timeout_threshold:
            print(f"⏰ {timeout_type.upper()} TIMEOUT: No user activity for {timeout_threshold} seconds")
            return True
        return False

    def mark_payment_link_sent(self):
        """Mark that payment link has been sent to extend timeout"""
        self.payment_link_sent = True
        self.payment_link_time = time.time()
        print(f"💰 Payment link sent - extending timeout to {self.payment_timeout} seconds")
    
    def add_to_history(self, speaker, message):
        """Add message to conversation history"""
        timestamp = time.strftime("%H:%M:%S")
        self.conversation_history.append(f"[{timestamp}] {speaker}: {message}")
    
    def update_session_variable(self, variable_name, value):
        """Update a specific session variable"""
        if variable_name in self.session_variables:
            old_value = self.session_variables[variable_name]
            self.session_variables[variable_name] = value
            print(f"📝 Updated {variable_name}: {old_value} → {value}")
            return True
        return False
    
    def get_session_variable(self, variable_name):
        """Get a specific session variable"""
        return self.session_variables.get(variable_name)
    
    def get_session_context(self):
        """Get current session context for AI prompt"""
        context = []
        
        # Add dynamic variables with values
        for var, value in self.session_variables.items():
            if value is not None:
                context.append(f"{var}: {value}")
        
        # Add conversation flags
        active_flags = [flag for flag, status in self.session_memory.items() if status]
        if active_flags:
            context.append(f"Discussed topics: {', '.join(active_flags)}")
        
        return " | ".join(context) if context else "No context yet"
    
    def get_formatted_session_context(self):
        """Get formatted session context for AI prompts (legacy method)"""
        context = "\n# SESSION MEMORY:\n"
        if self.session_memory["intro_played"]:
            context += "- Intro already done - DON'T use intro files again\n"
        if self.session_memory["product_explained"]:
            context += "- Product already explained\n"
        if self.session_memory["pricing_discussed"]:
            context += "- Pricing already discussed\n"
        if self.session_memory["demo_scheduled"]:
            context += "- Demo already scheduled\n"
        if self.session_memory["objections_handled"]:
            context += "- Objections already handled\n"
        
        # Add call direction context
        if self.call_direction == "outbound":
            business_name = self.lead_data.get('business_name', 'plumber')
            context += f"- OUTBOUND CALL to {business_name}\n"
        
        return context
    
    def mark_ai_question(self):
        """Mark that AI just asked a question to adjust silence threshold"""
        self.last_ai_response_type = "question"
        self.question_asked_time = time.time()
        # print(f"🎯 AI asked question - extending silence threshold")
    
    def mark_ai_statement(self):
        """Mark that AI made a statement (not a question)"""
        self.last_ai_response_type = "statement"
        self.question_asked_time = None
    
    def reset_for_next_input(self):
        """Reset session state for next user input"""
        self.is_processing = False
        self.completed_transcript = None
        self.transcript_ready = False
        self.accumulated_text = ""
        self.last_activity_time = None
        # self.speech_start_time = None # Removed as per new_code
        # self.consecutive_low_confidence = 0 # Removed as per new_code
        # Don't reset context_aware_threshold - let it adapt based on conversation # Removed as per new_code
    
    def cleanup(self):
        """Clean up session resources"""
        try:
            if self.dg_connection:
                self.dg_connection.finish()
                self.dg_connection = None
        except Exception as e:
            print(f"⚠️ Error cleaning up session {self.call_sid}: {e}")
    
    def _update_status_from_gpt(self, status_update):
        """Update status tracking based on GPT's assessment"""
        try:
            # Parse status update like "CLIENT_INTERESTED=Yes" or "PACKAGE_TYPE=$1000"
            if "=" in status_update:
                key, value = status_update.split("=", 1)
                key = key.strip().lower()
                value = value.strip()
                
                # Map to our status tracking keys
                status_mapping = {
                    "recording_permission": "recording_permission",
                    "recording_started": "recording_started", 
                    "client_interested": "client_interested",
                    "package_type": "package_type",
                    "payment_link_sent": "payment_link_sent",
                    "client_paid": "client_paid"
                }
                
                if key in status_mapping:
                    self.status_tracking[status_mapping[key]] = value
                    print(f"✅ Status updated: {key} = {value}")
                    
        except Exception as e:
            print(f"⚠️ Error updating status: {e}")
    
    def get_status_summary(self):
        """Get current status summary for export"""
        return self.status_tracking.copy()


class SessionManager:
    """Manages multiple concurrent call sessions"""
    
    def __init__(self):
        self.active_sessions = {}
        self.active_outbound_calls = {}
    
    def create_session(self, call_sid, from_number=None, to_number=None, call_direction=None, lead_data=None):
        """Create new session for incoming call with client routing"""
        session = StreamingSession(call_sid, from_number, to_number)
        
        # Set call direction and lead data for outbound calls
        if call_direction == "outbound" and lead_data:
            session.call_direction = "outbound"
            session.lead_data = lead_data
            # Track outbound call
            self.track_outbound_call(call_sid, lead_data)
        else:
            session.call_direction = "inbound"
            session.lead_data = {}
        
        self.active_sessions[call_sid] = session
        
        # Log session creation with client info
        client_config = session.client_config
        # print(f"📞 New session created: {call_sid} -> {client_config['business_name']} ({session.client_id}) - {call_direction or 'inbound'}")
        
        return session
    
    def get_session(self, call_sid):
        """Get existing session by call SID"""
        return self.active_sessions.get(call_sid)
    
    def remove_session(self, call_sid):
        """Remove and cleanup session"""
        session = self.active_sessions.pop(call_sid, None)
        if session:
            session.cleanup()
            print(f"🗑️ Session removed: {call_sid} ({session.client_id})")
        
        # Also remove from outbound tracking if exists
        self.active_outbound_calls.pop(call_sid, None)
    
    def get_active_count(self):
        """Get count of active sessions"""
        return len(self.active_sessions)
    
    def get_active_sessions(self):
        """Get list of all active sessions"""
        return list(self.active_sessions.values())
    
    def get_sessions_by_client(self, client_id):
        """Get all active sessions for a specific client"""
        return [session for session in self.active_sessions.values() if session.client_id == client_id]
    
    def track_outbound_call(self, call_sid, lead_data):
        """Track outbound call metadata"""
        self.active_outbound_calls[call_sid] = {
            'lead_data': lead_data,
            'start_time': time.time(),
            'status': 'calling'
        }

# Global session manager instance
session_manager = SessionManager()