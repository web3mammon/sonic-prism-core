#!/usr/bin/env python3
"""
KLARIQO RESPONSE ROUTER MODULE  
Clean GPT-based response selection with reliable TTS handling
"""

import time
from openai import OpenAI
from config import Config
from audio_manager import audio_manager

# Initialize OpenAI client
openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)

class ResponseRouter:
    """Handles AI-powered response selection with reliable GPT processing"""
    
    def test_model(self):
        """Test the AI model to ensure it's working correctly"""
        try:
            response = openai_client.chat.completions.create(
                model=Config.PRIMARY_MODEL,
                messages=[{"role": "user", "content": "Say 'test'"}],
                max_completion_tokens=10
            )
            result = response.choices[0].message.content.strip()
            print(f"✅ {Config.PRIMARY_MODEL}: '{result}'")
        except Exception as e:
            print(f"❌ {Config.PRIMARY_MODEL} failed: {e}")
    
    def __init__(self):
        print("🤖 Response Router initialized: Single-model system")
        
        # Test model on startup
        self.test_model()
       
    def _build_prompt(self, session, user_input):
        """Build a single, clean prompt for GPT response selection"""
        
        # Get recent conversation history
        recent_files = self._get_recent_files(session, limit=3)
        recent_conversation = self._get_recent_conversation(session, limit=2)
        
        # Get current date/time context
        from datetime import datetime
        current_date = datetime.now()
        current_date_str = current_date.strftime("%A, %B %d, %Y")
        current_time_str = current_date.strftime("%I:%M %p")
        
        prompt = f"""ROLE
You are {Config.CLIENT_CONFIG['ai_assistant_name']} from {Config.CLIENT_CONFIG['business_name']}, an Australian plumber.
Your job is to handle customer inquiries about plumbing services. Your language and accent should be natural and Australian.

PRIMARY OBJECTIVE
Hold a natural phone conversation and choose ONE response:
- Return an audio filename (from AVAILABLE AUDIO FILES), or
- Generate a short spoken reply using TTS.

STRICT OUTPUT SCHEMA
- Audio: filename only, no quotes/brackets (e.g., intro_greeting.mp3)
- Chained audio: file1.mp3+file2.mp3 (no spaces around '+')
- TTS: start with "GENERATE:" then the exact text to speak
- Optional status line: if a status changed, add a new line → STATUS: KEY=Value
- Do not include any other text, punctuation around filenames, or metadata

DECISION RULES
- First time caller → intro_greeting.mp3
- After hours call → after_hours_greeting.mp3
- "How long in business" → in_business_how_long.mp3
- "What services do you offer" → services_offered.mp3
- "What are your hours" → available_hours.mp3
- "How much does it cost" → pricing.mp3
- "Can you give me a quote" → cost_estimate_enquiry.mp3
- "When can you come" → ask_time_day.mp3
- "What's a good time" → when_can_come.mp3
- "Is it urgent" → urgent_callout.mp3
- "I need to check" → need_to_check.mp3
- "That sounds good" → confirmed_bye.mp3

SPECIFIC PLUMBING ISSUES
- Blocked drain → blocked_drain.mp3
- Leaking tap → leaking_tap.mp3
- Toilet repair → toilet_repair.mp3
- Hot water issues → hot_water_issues.mp3
- Gas fitting → gas_fitting.mp3
- Pipe relining → pipe_relining.mp3
- Bath/kitchen plumbing → bath_kitchen_plumbing.mp3
- General problems → general_problems.mp3

- Use audio files for core explanations; use GENERATE for tailored answers, scheduling, or specific details
- If multiple distinct points are requested, chain multiple audio files with "+"
- Never repeat items in RECENTLY_PLAYED
- Only use filenames listed under AVAILABLE AUDIO FILES; if unsure, use GENERATE
- Focus on being helpful and professional while maintaining Australian friendliness

STATUS TRACKING (only when changed)
- Keys: CUSTOMER_INTERESTED, BOOKING_REQUESTED, URGENT_CALL, SERVICE_TYPE
- Values: Yes/No (SERVICE_TYPE must be specific plumbing service)
- Example: STATUS: CUSTOMER_INTERESTED=Yes

STYLE CONSTRAINTS
- Tone: natural Australian English (e.g., "mate", "reckon", "heaps", "bloody", "cracker")
- TTS should be concise (<= 2 sentences), confident, and friendly
- Be professional but approachable - you're a trusted local plumber

AVAILABLE AUDIO FILES
{self._get_available_files_by_category()}

CONTEXT
RECENTLY_PLAYED: {', '.join(recent_files)}
RECENT_CONVERSATION: {recent_conversation}
CURRENT_INPUT: "{user_input}"
DATETIME: {current_date_str} at {current_time_str}

EXAMPLES
# Q: "Hi, I need a plumber"
intro_greeting.mp3

# Q: "Yeah, that sounds good. When can you come?"
GENERATE: Too easy mate — I've got a slot free tomorrow morning around 9. Does that work for you?
STATUS: CUSTOMER_INTERESTED=Yes

# Q: "What services do you offer and how much do you charge?"
services_offered.mp3+pricing.mp3

# Q: "I've got a blocked drain"
blocked_drain.mp3

# Q: "It's pretty urgent"
urgent_callout.mp3
"""
        
        return prompt
    
    def _get_available_files_by_category(self):
        """Get formatted list of available files by category (excluding intro files)"""
        categories = []
        for category, files in audio_manager.audio_snippets.items():
            if category != "quick_responses" and files:
                # Filter out intro files from the available files list
                filtered_files = {k: v for k, v in files.items() if k != 'klariqo_intro.mp3'}
                if filtered_files:
                    file_list = ", ".join(filtered_files.keys())
                    categories.append(f"{category}: {file_list}")
        return "\n".join(categories)
    
    # Remove the _get_alternatives method completely since no more alternate files
    
    def _get_recent_files(self, session, limit=3):
        """Get recently played audio files to avoid repetition"""
        recent_files = []
        
        # Look through recent conversation history for audio responses
        if hasattr(session, 'conversation_history'):
            for entry in session.conversation_history[-6:]:  # Last 6 entries
                if "Lauren:" in entry and "<audio:" in entry:
                    # Extract filenames from "<audio: file1.mp3 + file2.mp3>"
                    import re
                    files = re.findall(r'<audio: ([^>]+)>', entry)
                    if files:
                        audio_chain = files[0]
                        # Handle both single files and chained files
                        if '+' in audio_chain:
                            file_list = [f.strip() for f in audio_chain.split('+')]
                            # Add all files from the chain to recent files
                            recent_files.extend(file_list)
                        else:
                            recent_files.append(audio_chain.strip())
        
        # Return last N unique files
        seen = set()
        unique_recent = []
        for f in reversed(recent_files):
            if f not in seen and len(unique_recent) < limit:
                unique_recent.append(f)
                seen.add(f)
        
        return unique_recent[:limit]
    
    def _get_recent_conversation(self, session, limit=2):
        """Get recent conversation context"""
        if not hasattr(session, 'conversation_history'):
            return "None"
        
        recent = session.conversation_history[-(limit*2):]  # Last N exchanges
        return " | ".join(recent) if recent else "None"
    

    
    def get_response(self, session, user_input):
        """Get AI response for plumbing customer service conversation - FULL GPT MODE"""
        try:
            print(f"🧠 GPT MODE (Plumber): Processing '{user_input}'")
            
            # Build prompt with session context
            prompt = self._build_prompt(session, user_input)
            
            # Get response from GPT with optimized settings
            response = openai_client.chat.completions.create(
                model=Config.PRIMARY_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=Config.NANO_MAX_COMPLETION_TOKENS,
                temperature=0.7,  # Natural Australian responses
                timeout=8  # Reasonable timeout
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract status updates if present
            status_update = None
            if "STATUS:" in content:
                lines = content.split('\n')
                for line in lines:
                    if line.startswith("STATUS:"):
                        status_update = line.replace("STATUS:", "").strip()
                        break
                # Remove status line from content
                content = '\n'.join([line for line in lines if not line.startswith("STATUS:")])
            
            # Extract session variables from conversation (background)
            import threading
            threading.Thread(target=self._extract_session_variables, args=(session, user_input, content), daemon=True).start()
            
            # Determine response type and content
            if content.startswith("GENERATE:"):
                response_type = "tts"
                tts_text = content.replace("GENERATE:", "").strip()
                return response_type, tts_text, status_update
            else:
                response_type = "audio"
                audio_file = content.strip()
                return response_type, audio_file, status_update
                
        except Exception as e:
            print(f"❌ Error getting AI response: {e}")
            return "audio", "intro_greeting.mp3", None

    def _extract_session_variables(self, session, user_input, ai_response):
        """Extract and store session variables from conversation"""
        try:
            # Extract prospect name
            if "my name is" in user_input.lower() or "i'm" in user_input.lower():
                # Simple name extraction
                words = user_input.split()
                for i, word in enumerate(words):
                    if word.lower() in ["name", "i'm", "im", "call"]:
                        if i + 1 < len(words):
                            name = words[i + 1].strip(".,!?")
                            if len(name) > 1:  # Avoid single letters
                                session.update_session_variable("prospect_name", name)
                                break
            
            # Extract phone number
            import re
            phone_pattern = r'(\+?[0-9\s\-\(\)]{10,})'
            phone_match = re.search(phone_pattern, user_input)
            if phone_match:
                phone = phone_match.group(1).strip()
                session.update_session_variable("prospect_phone", phone)
            
            # Extract business information
            business_keywords = {
                "business_size": ["small", "medium", "large", "startup", "established"],
                "current_systems": ["phone", "voicemail", "answering machine", "receptionist", "none"],
                "pain_points": ["missed calls", "busy", "can't answer", "voicemail", "competitors"]
            }
            
            for var_name, keywords in business_keywords.items():
                for keyword in keywords:
                    if keyword in user_input.lower():
                        current_value = session.get_session_variable(var_name) or ""
                        if keyword not in current_value:
                            new_value = f"{current_value}, {keyword}".strip(", ")
                            session.update_session_variable(var_name, new_value)
            
            # Extract interest level
            interest_indicators = {
                "high": ["interested", "sounds good", "let's do it", "sign me up", "how do i pay"],
                "medium": ["maybe", "could be", "might work", "tell me more", "explain"],
                "low": ["not sure", "don't know", "expensive", "too much", "maybe later"]
            }
            
            for level, indicators in interest_indicators.items():
                for indicator in indicators:
                    if indicator in user_input.lower():
                        session.update_session_variable("interest_level", level)
                        break
            
            # Extract budget information
            budget_patterns = [
                r'(\$?\d+[,\d]*)\s*(dollars?|bucks?|per\s+month|monthly)',
                r'(budget|cost|price)\s*(of|is|around)\s*(\$?\d+[,\d]*)',
                r'(\$?\d+[,\d]*)\s*(is|would\s+be)\s*(too\s+much|expensive|okay|fine)'
            ]
            
            for pattern in budget_patterns:
                match = re.search(pattern, user_input.lower())
                if match:
                    budget = match.group(1)
                    session.update_session_variable("budget_range", budget)
                    break
            
            # Extract demo preferences
            if "demo" in user_input.lower():
                if "email" in user_input.lower():
                    session.update_session_variable("preferred_demo_type", "email")
                elif "phone" in user_input.lower() or "call" in user_input.lower():
                    session.update_session_variable("preferred_demo_type", "phone")
                else:
                    session.update_session_variable("preferred_demo_type", "general")
            
            # Track recording permission
            if "record" in user_input.lower():
                if any(word in user_input.lower() for word in ["yes", "sure", "okay", "fine"]):
                    session.update_session_variable("recording_permission", "yes")
                elif any(word in user_input.lower() for word in ["no", "not", "don't", "prefer not"]):
                    session.update_session_variable("recording_permission", "no")
            
        except Exception as e:
            print(f"⚠️ Error extracting session variables: {e}")
    

    
    def validate_response(self, response_content):
        """Validate that the response contains valid audio files"""
        if not response_content or response_content.startswith("GENERATE:"):
            return True
        
        # Validate audio chain
        return audio_manager.validate_audio_chain(response_content)

# Global response router instance
response_router = ResponseRouter()