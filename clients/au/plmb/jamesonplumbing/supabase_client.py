#!/usr/bin/env python3
"""
SUPABASE CLIENT INTEGRATION
Connects Python voice AI client to Supabase backend
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import requests

class SupabaseClient:
    """Supabase client for voice AI integration"""

    def __init__(self):
        self.url = "https://btqccksigmohyjdxgrrj.supabase.co"
        self.key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWNja3NpZ21vaHlqZHhncnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDY4MDEsImV4cCI6MjA3MzkyMjgwMX0.kOiOYBO-lro83HMSaCTlnryfRM3Md3pWkdAaYmVHhJ4"
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        self.client_id = os.getenv('CLIENT_ID', 'au_plmb_default')

    def log_call_session(self, call_sid: str, caller_number: str = None, status: str = "ringing",
                        transcript: List[Dict] = None, metadata: Dict = None,
                        prospect_name: str = None, business_name: str = None,
                        business_size: str = None, current_systems: str = None,
                        pain_points: str = None, interest_level: str = None,
                        budget_range: str = None, decision_maker: str = None,
                        preferred_demo_time: str = None, preferred_demo_type: str = None,
                        demo_scheduled: str = None, recording_permission: str = None,
                        demo_status: str = None, follow_up_required: bool = False) -> bool:
        """Log a call session to Supabase with full prospect data"""
        try:
            data = {
                "client_id": self.client_id,
                "call_sid": call_sid,
                "caller_number": caller_number,
                "status": status,
                "transcript": transcript or [],
                "metadata": metadata or {},
                "start_time": datetime.utcnow().isoformat(),
                # New prospect fields
                "prospect_name": prospect_name,
                "business_name": business_name,
                "business_size": business_size,
                "current_systems": current_systems,
                "pain_points": pain_points,
                "interest_level": interest_level,
                "budget_range": budget_range,
                "decision_maker": decision_maker,
                "preferred_demo_time": preferred_demo_time,
                "preferred_demo_type": preferred_demo_type,
                "demo_scheduled": demo_scheduled,
                "recording_permission": recording_permission,
                "demo_status": demo_status,
                "follow_up_required": follow_up_required
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

    def update_client_config(self, updated_data: Dict) -> bool:
        """Update client configuration in Supabase"""
        try:
            # Add updated timestamp
            updated_data["updated_at"] = datetime.utcnow().isoformat()

            print(f"🔄 Sending to Supabase: {updated_data}")

            response = requests.patch(
                f"{self.url}/rest/v1/voice_ai_clients?client_id=eq.{self.client_id}",
                headers=self.headers,
                json=updated_data
            )

            print(f"📋 Supabase response: {response.status_code}")
            if response.text:
                print(f"📋 Response body: {response.text}")

            if response.status_code in [200, 204]:  # 204 is also success for PATCH
                print(f"✅ Client config updated for {self.client_id}")
                return True
            else:
                print(f"❌ Failed to update client config: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error updating client config: {e}")
            import traceback
            traceback.print_exc()
            return False

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

    def store_audio_file(self, file_name: str, file_path: str, file_type: str = "tts_generated",
                        voice_id: str = None, text_content: str = None,
                        duration_ms: int = None, file_size_bytes: int = None) -> bool:
        """Store audio file metadata in Supabase"""
        try:
            data = {
                "client_id": self.client_id,
                "file_name": file_name,
                "file_path": file_path,
                "file_type": file_type,
                "voice_id": voice_id,
                "text_content": text_content,
                "duration_ms": duration_ms,
                "file_size_bytes": file_size_bytes
            }

            response = requests.post(
                f"{self.url}/rest/v1/audio_files",
                headers=self.headers,
                json=data
            )

            if response.status_code in [200, 201]:
                print(f"✅ Audio file stored: {file_name}")
                return True
            else:
                print(f"❌ Failed to store audio file: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error storing audio file: {e}")
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

    def get_phone_number(self) -> Optional[str]:
        """Get assigned phone number for this client"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/phone_number_pool?assigned_client_id=eq.{self.client_id}&status=eq.assigned",
                headers=self.headers
            )

            if response.status_code == 200:
                data = response.json()
                if data:
                    return data[0].get('phone_number')

            return None

        except Exception as e:
            print(f"❌ Error getting phone number: {e}")
            return None

    def log_conversation_turn(self, call_sid: str, speaker: str, message_type: str,
                             content: str, audio_files_used: List[str] = None,
                             response_time_ms: int = None) -> bool:
        """Log conversation turn to Supabase conversation_logs table"""
        try:
            data = {
                "call_sid": call_sid,
                "client_id": self.client_id,
                "speaker": speaker,  # 'Customer' or 'Jamie'
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

    def create_lead(self, prospect_name: str, phone_number: str, business_name: str = None,
                   industry: str = None, priority: int = 1, notes: str = None) -> bool:
        """Create a new lead in Supabase leads table"""
        try:
            data = {
                "client_id": self.client_id,
                "prospect_name": prospect_name,
                "phone_number": phone_number,
                "business_name": business_name,
                "industry": industry,
                "priority": priority,
                "notes": notes,
                "status": "pending"
            }

            response = requests.post(
                f"{self.url}/rest/v1/leads",
                headers=self.headers,
                json=data
            )

            if response.status_code in [200, 201]:
                print(f"✅ Lead created: {prospect_name}")
                return True
            else:
                print(f"❌ Failed to create lead: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error creating lead: {e}")
            return False

    def get_leads(self, limit: int = 100, status: str = None) -> List[Dict]:
        """Get leads for this client"""
        try:
            url = f"{self.url}/rest/v1/leads?client_id=eq.{self.client_id}&order=created_at.desc&limit={limit}"
            if status:
                url += f"&status=eq.{status}"

            response = requests.get(url, headers=self.headers)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get leads: {response.status_code}")
                return []

        except Exception as e:
            print(f"❌ Error getting leads: {e}")
            return []

    def get_conversation_logs(self, call_sid: str) -> List[Dict]:
        """Get conversation logs for a specific call"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/conversation_logs?call_sid=eq.{call_sid}&order=created_at.asc",
                headers=self.headers
            )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get conversation logs: {response.status_code}")
                return []

        except Exception as e:
            print(f"❌ Error getting conversation logs: {e}")
            return []

    def get_call_session(self, call_sid: str) -> Optional[Dict]:
        """Get a specific call session by call_sid"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/call_sessions?call_sid=eq.{call_sid}",
                headers=self.headers
            )

            if response.status_code == 200:
                data = response.json()
                if data:
                    return data[0]

            return None

        except Exception as e:
            print(f"❌ Error getting call session: {e}")
            return None

    def get_client_credits(self, user_id: str = None) -> Optional[Dict]:
        """Get client credit balance and billing info"""
        try:
            # For now, get first credit record - later can filter by user_id
            response = requests.get(
                f"{self.url}/rest/v1/credits?limit=1",
                headers=self.headers
            )

            if response.status_code == 200:
                credits = response.json()
                if credits and len(credits) > 0:
                    return credits[0]
            return None

        except Exception as e:
            print(f"❌ Error getting client credits: {e}")
            return None

# Global instance for easy import
supabase_client = SupabaseClient()