#!/usr/bin/env python3
"""
SUPABASE CLIENT INTEGRATION - PLMB TEMPLATE
Connects Python voice AI client to Supabase backend
This template needs to be customized for each client
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import requests

class SupabaseClient:
    """Supabase client for voice AI integration"""

    def __init__(self, client_id: str = None):
        self.url = "https://btqccksigmohyjdxgrrj.supabase.co"
        self.key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWNja3NpZ21vaHlqZHhncnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDY4MDEsImV4cCI6MjA3MzkyMjgwMX0.kOiOYBO-lro83HMSaCTlnryfRM3Md3pWkdAaYmVHhJ4"
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        # CLIENT_ID MUST BE SET FOR EACH CLIENT DEPLOYMENT
        self.client_id = client_id or os.environ.get("CLIENT_ID")
        if not self.client_id:
            raise ValueError("❌ CLIENT_ID must be provided or set as environment variable")

    def log_call_session(self, call_sid: str, caller_number: str = None, status: str = "ringing",
                        transcript: List[Dict] = None, metadata: Dict = None) -> bool:
        """Log a call session to Supabase"""
        try:
            data = {
                "client_id": self.client_id,
                "call_sid": call_sid,
                "caller_number": caller_number,
                "status": status,
                "transcript": transcript or [],
                "metadata": metadata or {},
                "start_time": datetime.utcnow().isoformat()
            }

            response = requests.post(
                f"{self.url}/rest/v1/call_sessions",
                headers=self.headers,
                json=data
            )

            if response.status_code in [200, 201]:
                print(f"✅ Call session logged: {call_sid}")
                return True
            else:
                print(f"❌ Failed to log call session: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error logging call session: {e}")
            return False

    def update_call_session(self, call_sid: str, status: str = None, transcript: List[Dict] = None,
                           end_time: str = None, duration_seconds: int = None,
                           transcript_summary: str = None) -> bool:
        """Update an existing call session"""
        try:
            update_data = {"updated_at": datetime.utcnow().isoformat()}

            if status:
                update_data["status"] = status
            if transcript:
                update_data["transcript"] = transcript
            if end_time:
                update_data["end_time"] = end_time
            if duration_seconds is not None:
                update_data["duration_seconds"] = duration_seconds
            if transcript_summary:
                update_data["transcript_summary"] = transcript_summary

            response = requests.patch(
                f"{self.url}/rest/v1/call_sessions?call_sid=eq.{call_sid}",
                headers=self.headers,
                json=update_data
            )

            if response.status_code == 200:
                print(f"✅ Call session updated: {call_sid}")
                return True
            else:
                print(f"❌ Failed to update call session: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error updating call session: {e}")
            return False

    def get_client_config(self) -> Optional[Dict]:
        """Get client configuration from Supabase"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/voice_ai_clients?client_id=eq.{self.client_id}",
                headers=self.headers
            )

            if response.status_code == 200:
                data = response.json()
                if data:
                    return data[0]

            return None

        except Exception as e:
            print(f"❌ Error getting client config: {e}")
            return None

    def log_sms(self, phone_number: str, message_type: str, message_content: str,
                status: str = "sent", twilio_sid: str = None, metadata: Dict = None) -> bool:
        """Log SMS message to Supabase"""
        try:
            data = {
                "client_id": self.client_id,
                "phone_number": phone_number,
                "message_type": message_type,
                "message_content": message_content,
                "status": status,
                "twilio_sid": twilio_sid,
                "metadata": metadata or {}
            }

            response = requests.post(
                f"{self.url}/rest/v1/sms_logs",
                headers=self.headers,
                json=data
            )

            if response.status_code in [200, 201]:
                print(f"✅ SMS logged: {phone_number}")
                return True
            else:
                print(f"❌ Failed to log SMS: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error logging SMS: {e}")
            return False

    def log_conversation_turn(self, call_sid: str, speaker: str, message_type: str,
                             content: str, audio_files_used: List[str] = None,
                             response_time_ms: int = None) -> bool:
        """Log conversation turn to Supabase conversation_logs table"""
        try:
            data = {
                "call_sid": call_sid,
                "client_id": self.client_id,
                "speaker": speaker,  # 'Customer' or AI assistant name
                "message_type": message_type,  # 'transcript', 'audio', 'tts'
                "content": content,
                "audio_files_used": audio_files_used or [],
                "response_time_ms": response_time_ms
            }

            response = requests.post(
                f"{self.url}/rest/v1/conversation_logs",
                headers=self.headers,
                json=data
            )

            if response.status_code in [200, 201]:
                print(f"✅ Conversation turn logged: {call_sid}")
                return True
            else:
                print(f"❌ Failed to log conversation: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error logging conversation: {e}")
            return False

    def get_call_sessions(self, limit: int = 100) -> List[Dict]:
        """Get recent call sessions for this client"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/call_sessions?client_id=eq.{self.client_id}&order=start_time.desc&limit={limit}",
                headers=self.headers
            )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get call sessions: {response.status_code}")
                return []

        except Exception as e:
            print(f"❌ Error getting call sessions: {e}")
            return []

# Template function - customize for each client
def create_client_supabase_instance(client_id: str) -> SupabaseClient:
    """Create Supabase client instance for specific client"""
    return SupabaseClient(client_id=client_id)