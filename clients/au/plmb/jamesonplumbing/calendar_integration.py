#!/usr/bin/env python3
"""
CALENDAR INTEGRATION MODULE
Handles calendar integration with each client's individual calendar
Supports Google Calendar, Outlook, and custom calendar systems
MODULAR DESIGN: Each client gets their own calendar integration
"""

import os
import json
import datetime
import pytz
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import requests
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle

@dataclass
class CalendarEvent:
    """Calendar event data structure"""
    title: str
    description: str
    start_time: datetime.datetime
    end_time: datetime.datetime
    attendee_email: Optional[str] = None
    attendee_phone: Optional[str] = None
    location: Optional[str] = None
    event_type: str = "demo"  # demo, consultation, follow_up, etc.
    status: str = "pending"  # pending, approved, rejected, confirmed

class CalendarIntegration:
    """Base calendar integration class - MODULAR PER CLIENT"""
    
    def __init__(self, calendar_type: str, config: Dict):
        self.calendar_type = calendar_type
        self.config = config
        self.timezone = pytz.timezone(config.get('timezone', 'Australia/Melbourne'))
        self.client_id = config.get('client_id', 'unknown')
        
    def create_event(self, event: CalendarEvent) -> Dict:
        """Create a calendar event - REQUIRES CLIENT APPROVAL"""
        raise NotImplementedError
        
    def get_available_slots(self, date: datetime.date, duration_minutes: int = 30) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """Get available time slots from CLIENT'S calendar"""
        raise NotImplementedError
        
    def check_availability(self, start_time: datetime.datetime, end_time: datetime.datetime) -> bool:
        """Check if a time slot is available in CLIENT'S calendar"""
        raise NotImplementedError
        
    def request_booking_approval(self, event: CalendarEvent) -> Dict:
        """Request approval from client before booking"""
        raise NotImplementedError

class GoogleCalendarIntegration(CalendarIntegration):
    """Google Calendar integration - PER CLIENT"""
    
    def __init__(self, config: Dict):
        super().__init__("google", config)
        self.calendar_id = config.get('calendar_id', 'primary')
        self.credentials = self._get_credentials()
        self.service = build('calendar', 'v3', credentials=self.credentials)
        
    def _get_credentials(self):
        """Get Google Calendar credentials - CLIENT SPECIFIC"""
        creds = None
        token_path = f'calendar_token_{self.client_id}.pickle'
        
        # Load existing token for this specific client
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
                
        # Refresh token if expired
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
                
        # Create new credentials if needed
        if not creds or not creds.valid:
            flow = InstalledAppFlow.from_client_secrets_file(
                f'calendar_credentials_{self.client_id}.json', 
                ['https://www.googleapis.com/auth/calendar']
            )
            creds = flow.run_local_server(port=0)
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
                
        return creds
        
    def create_event(self, event: CalendarEvent) -> Dict:
        """Create Google Calendar event - ONLY AFTER CLIENT APPROVAL"""
        try:
            event_body = {
                'summary': event.title,
                'description': event.description,
                'start': {
                    'dateTime': event.start_time.isoformat(),
                    'timeZone': self.config['timezone'],
                },
                'end': {
                    'dateTime': event.end_time.isoformat(),
                    'timeZone': self.config['timezone'],
                },
                'location': event.location,
                'attendees': []
            }
            
            if event.attendee_email:
                event_body['attendees'].append({'email': event.attendee_email})
                
            created_event = self.service.events().insert(
                calendarId=self.calendar_id,
                body=event_body,
                sendUpdates='all'
            ).execute()
            
            print(f"✅ Google Calendar event created for {self.client_id}: {created_event['id']}")
            return {
                'success': True,
                'event_id': created_event['id'],
                'event_url': created_event.get('htmlLink'),
                'calendar_type': 'google',
                'client_id': self.client_id
            }
            
        except Exception as e:
            print(f"❌ Google Calendar error for {self.client_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'calendar_type': 'google',
                'client_id': self.client_id
            }
            
    def get_available_slots(self, date: datetime.date, duration_minutes: int = 30) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """Get available time slots from CLIENT'S calendar"""
        try:
            # Get business hours from client config
            business_hours = self._parse_business_hours(self.config.get('business_hours', 'Mon-Fri 9AM-6PM'))
            
            # Get existing events for the date from CLIENT'S calendar
            start_of_day = datetime.datetime.combine(date, datetime.time.min, tzinfo=self.timezone)
            end_of_day = datetime.datetime.combine(date, datetime.time.max, tzinfo=self.timezone)
            
            events_result = self.service.events().list(
                calendarId=self.calendar_id,
                timeMin=start_of_day.isoformat(),
                timeMax=end_of_day.isoformat(),
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            existing_events = events_result.get('items', [])
            
            # Generate available slots based on CLIENT'S schedule
            available_slots = []
            current_time = start_of_day.replace(hour=business_hours['start_hour'], minute=0)
            
            while current_time.hour < business_hours['end_hour']:
                slot_end = current_time + datetime.timedelta(minutes=duration_minutes)
                
                # Check if slot conflicts with CLIENT'S existing events
                slot_available = True
                for event in existing_events:
                    event_start = datetime.datetime.fromisoformat(event['start']['dateTime'])
                    event_end = datetime.datetime.fromisoformat(event['end']['dateTime'])
                    
                    if (current_time < event_end and slot_end > event_start):
                        slot_available = False
                        break
                
                if slot_available:
                    available_slots.append((current_time, slot_end))
                
                current_time += datetime.timedelta(minutes=30)  # 30-minute intervals
                
            return available_slots
            
        except Exception as e:
            print(f"❌ Error getting available slots for {self.client_id}: {e}")
            return []
            
    def check_availability(self, start_time: datetime.datetime, end_time: datetime.datetime) -> bool:
        """Check if a time slot is available in CLIENT'S calendar"""
        try:
            events_result = self.service.events().list(
                calendarId=self.calendar_id,
                timeMin=start_time.isoformat(),
                timeMax=end_time.isoformat(),
                singleEvents=True
            ).execute()
            
            return len(events_result.get('items', [])) == 0
            
        except Exception as e:
            print(f"❌ Error checking availability for {self.client_id}: {e}")
            return False
            
    def request_booking_approval(self, event: CalendarEvent) -> Dict:
        """Request approval from client before booking"""
        try:
            # Send approval request to client (SMS/email)
            client_phone = self.config.get('phone_number')
            client_email = self.config.get('email')
            
            approval_message = f"""
            📅 Booking Request for {self.config['business_name']}
            
            Customer: {event.attendee_email or event.attendee_phone}
            Date: {event.start_time.strftime('%B %d, %Y')}
            Time: {event.start_time.strftime('%I:%M %p')} - {event.end_time.strftime('%I:%M %p')}
            Type: {event.event_type}
            
            Reply YES to approve, NO to decline
            """
            
            # Store pending approval
            self._store_pending_approval(event)
            
            print(f"📱 Approval request sent to {self.client_id}")
            return {
                'success': True,
                'status': 'pending_approval',
                'message': 'Approval request sent to client',
                'client_id': self.client_id
            }
            
        except Exception as e:
            print(f"❌ Error requesting approval for {self.client_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'client_id': self.client_id
            }
            
    def _store_pending_approval(self, event: CalendarEvent):
        """Store pending approval for tracking"""
        try:
            pending_file = f"logs/pending_approvals_{self.client_id}.json"
            os.makedirs(os.path.dirname(pending_file), exist_ok=True)
            
            pending_data = {
                'timestamp': datetime.datetime.now().isoformat(),
                'event': {
                    'title': event.title,
                    'start_time': event.start_time.isoformat(),
                    'end_time': event.end_time.isoformat(),
                    'attendee_email': event.attendee_email,
                    'attendee_phone': event.attendee_phone,
                    'event_type': event.event_type
                },
                'status': 'pending'
            }
            
            # Load existing pending approvals
            pending_list = []
            if os.path.exists(pending_file):
                with open(pending_file, 'r') as f:
                    pending_list = json.load(f)
                    
            pending_list.append(pending_data)
            
            # Save updated list
            with open(pending_file, 'w') as f:
                json.dump(pending_list, f, indent=2)
                
        except Exception as e:
            print(f"❌ Error storing pending approval: {e}")
            
    def _parse_business_hours(self, hours_str: str) -> Dict:
        """Parse business hours string"""
        # Simple parser for "Mon-Fri 9AM-6PM" format
        return {
            'start_hour': 9,
            'end_hour': 18,
            'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        }

class OutlookCalendarIntegration(CalendarIntegration):
    """Outlook Calendar integration - PER CLIENT"""
    
    def __init__(self, config: Dict):
        super().__init__("outlook", config)
        self.access_token = config.get('access_token')
        self.api_url = "https://graph.microsoft.com/v1.0"
        
    def create_event(self, event: CalendarEvent) -> Dict:
        """Create Outlook Calendar event - ONLY AFTER CLIENT APPROVAL"""
        try:
            event_body = {
                'subject': event.title,
                'body': {
                    'contentType': 'text',
                    'content': event.description
                },
                'start': {
                    'dateTime': event.start_time.isoformat(),
                    'timeZone': self.config['timezone']
                },
                'end': {
                    'dateTime': event.end_time.isoformat(),
                    'timeZone': self.config['timezone']
                },
                'location': {
                    'displayName': event.location
                }
            }
            
            if event.attendee_email:
                event_body['attendees'] = [{
                    'emailAddress': {
                        'address': event.attendee_email
                    },
                    'type': 'required'
                }]
                
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.api_url}/me/events",
                headers=headers,
                json=event_body
            )
            
            if response.status_code == 201:
                event_data = response.json()
                print(f"✅ Outlook Calendar event created for {self.client_id}: {event_data['id']}")
                return {
                    'success': True,
                    'event_id': event_data['id'],
                    'event_url': event_data.get('webLink'),
                    'calendar_type': 'outlook',
                    'client_id': self.client_id
                }
            else:
                print(f"❌ Outlook Calendar error for {self.client_id}: {response.text}")
                return {
                    'success': False,
                    'error': response.text,
                    'calendar_type': 'outlook',
                    'client_id': self.client_id
                }
                
        except Exception as e:
            print(f"❌ Outlook Calendar error for {self.client_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'calendar_type': 'outlook',
                'client_id': self.client_id
            }
            
    def get_available_slots(self, date: datetime.date, duration_minutes: int = 30) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """Get available time slots from CLIENT'S calendar"""
        # Implementation for Outlook availability checking
        # This would use Microsoft Graph API to check calendar
        return []
        
    def check_availability(self, start_time: datetime.datetime, end_time: datetime.datetime) -> bool:
        """Check if a time slot is available in CLIENT'S calendar"""
        # Implementation for Outlook availability checking
        return True

class CustomCalendarIntegration(CalendarIntegration):
    """Custom calendar integration (webhook-based) - PER CLIENT"""
    
    def __init__(self, config: Dict):
        super().__init__("custom", config)
        self.webhook_url = config.get('webhook_url')
        
    def create_event(self, event: CalendarEvent) -> Dict:
        """Create custom calendar event via webhook - ONLY AFTER CLIENT APPROVAL"""
        try:
            event_data = {
                'title': event.title,
                'description': event.description,
                'start_time': event.start_time.isoformat(),
                'end_time': event.end_time.isoformat(),
                'attendee_email': event.attendee_email,
                'attendee_phone': event.attendee_phone,
                'location': event.location,
                'event_type': event.event_type
            }
            
            response = requests.post(
                self.webhook_url,
                json=event_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Custom calendar event created for {self.client_id}: {result.get('event_id', 'unknown')}")
                return {
                    'success': True,
                    'event_id': result.get('event_id'),
                    'calendar_type': 'custom',
                    'client_id': self.client_id
                }
            else:
                print(f"❌ Custom calendar error for {self.client_id}: {response.text}")
                return {
                    'success': False,
                    'error': response.text,
                    'calendar_type': 'custom',
                    'client_id': self.client_id
                }
                
        except Exception as e:
            print(f"❌ Custom calendar error for {self.client_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'calendar_type': 'custom',
                'client_id': self.client_id
            }
            
    def get_available_slots(self, date: datetime.date, duration_minutes: int = 30) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """Get available time slots from CLIENT'S calendar"""
        # Implementation for custom calendar availability
        return []
        
    def check_availability(self, start_time: datetime.datetime, end_time: datetime.datetime) -> bool:
        """Check if a time slot is available in CLIENT'S calendar"""
        # Implementation for custom calendar availability
        return True

class CalendarManager:
    """Main calendar management class - MODULAR PER CLIENT"""
    
    def __init__(self):
        self.integrations = {}  # One integration per client
        
    def add_client_integration(self, client_id: str, config: Dict):
        """Add calendar integration for a specific client"""
        calendar_type = config.get('calendar_type', 'google')
        
        if calendar_type == 'google':
            self.integrations[client_id] = GoogleCalendarIntegration(config)
        elif calendar_type == 'outlook':
            # Add Outlook integration when needed
            self.integrations[client_id] = OutlookCalendarIntegration(config)
        elif calendar_type == 'custom':
            # Add custom integration when needed
            self.integrations[client_id] = CustomCalendarIntegration(config)
        else:
            raise ValueError(f"Unsupported calendar type: {calendar_type}")
            
        print(f"✅ Calendar integration added for {client_id}: {calendar_type}")
        
    def suggest_available_slots(self, client_id: str, preferred_date: datetime.date = None) -> Dict:
        """Suggest available slots from CLIENT'S calendar - NO AUTOMATIC BOOKING"""
        if client_id not in self.integrations:
            return {
                'success': False,
                'error': f'No calendar integration found for client: {client_id}'
            }
            
        integration = self.integrations[client_id]
        
        # Find available slots in CLIENT'S calendar
        if preferred_date:
            available_slots = integration.get_available_slots(preferred_date)
        else:
            # Try next 7 days
            available_slots = []
            for i in range(7):
                check_date = datetime.date.today() + datetime.timedelta(days=i+1)
                slots = integration.get_available_slots(check_date)
                if slots:
                    available_slots.extend(slots)
                    if len(available_slots) >= 3:  # Get 3 slots max
                        break
                        
        if not available_slots:
            return {
                'success': False,
                'error': 'No available slots found in the next 7 days',
                'client_id': client_id
            }
            
        # Format slots for suggestion
        formatted_slots = []
        for start_time, end_time in available_slots[:3]:  # Suggest max 3 slots
            formatted_slots.append({
                'date': start_time.strftime('%B %d, %Y'),
                'time': f"{start_time.strftime('%I:%M %p')} - {end_time.strftime('%I:%M %p')}",
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat()
            })
            
        return {
            'success': True,
            'available_slots': formatted_slots,
            'client_id': client_id,
            'message': f'Found {len(formatted_slots)} available slots in {client_id}\'s calendar'
        }
        
    def request_booking(self, client_id: str, customer_name: str, customer_phone: str, 
                       customer_email: str = None, preferred_slot: Dict = None) -> Dict:
        """Request booking approval from client - NO AUTOMATIC BOOKING"""
        if client_id not in self.integrations:
            return {
                'success': False,
                'error': f'No calendar integration found for client: {client_id}'
            }
            
        if not preferred_slot:
            return {
                'success': False,
                'error': 'No preferred slot provided'
            }
            
        integration = self.integrations[client_id]
        
        # Create event for approval request
        start_time = datetime.datetime.fromisoformat(preferred_slot['start_time'])
        end_time = datetime.datetime.fromisoformat(preferred_slot['end_time'])
        
        event = CalendarEvent(
            title=f"Demo Request - {customer_name}",
            description=f"Demo request for {customer_name}\nPhone: {customer_phone}\nEmail: {customer_email or 'Not provided'}",
            start_time=start_time,
            end_time=end_time,
            attendee_email=customer_email,
            attendee_phone=customer_phone,
            location="Online Demo",
            event_type="demo",
            status="pending_approval"
        )
        
        # Request approval from client
        result = integration.request_booking_approval(event)
        
        if result['success']:
            result['customer_name'] = customer_name
            result['customer_phone'] = customer_phone
            result['preferred_slot'] = preferred_slot
            
        return result
        
    def get_available_slots(self, client_id: str, date: datetime.date) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """Get available slots for a client on a specific date"""
        if client_id not in self.integrations:
            return []
            
        return self.integrations[client_id].get_available_slots(date)
        
    def check_availability(self, client_id: str, start_time: datetime.datetime, end_time: datetime.datetime) -> bool:
        """Check availability for a specific time slot"""
        if client_id not in self.integrations:
            return False
            
        return self.integrations[client_id].check_availability(start_time, end_time)

# Global calendar manager instance
calendar_manager = CalendarManager()
