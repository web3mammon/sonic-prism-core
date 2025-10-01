#!/usr/bin/env python3
"""
AGENT TRANSFER MODULE
Handles transferring calls to human agents
Supports conditional transfer based on call context, business hours, etc.
"""

import os
import time
import datetime
from typing import Dict, Optional, List
from twilio.twiml.voice_response import VoiceResponse, Dial
from twilio.rest import Client
from config import Config
import json

class AgentTransferManager:
    """Manages agent transfers for different clients"""
    
    def __init__(self):
        self.twilio_client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
        
    def should_transfer_to_agent(self, client_config: Dict, call_context: Dict) -> bool:
        """Determine if call should be transferred to agent based on context"""
        
        # Check if agent transfer is enabled
        if not client_config.get('agent_transfer_enabled', False):
            return False
            
        # Check business hours
        if not self._is_within_business_hours(client_config):
            return False
            
        # Check if agent number is configured
        if not client_config.get('agent_transfer_number'):
            return False
            
        # Check transfer triggers from call context
        transfer_triggers = call_context.get('transfer_triggers', [])
        
        # Common transfer triggers
        if any(trigger in transfer_triggers for trigger in [
            'customer_requested_agent',
            'complex_inquiry',
            'complaint',
            'urgent_matter',
            'technical_issue',
            'billing_inquiry',
            'escalation_needed'
        ]):
            return True
            
        # Check if customer explicitly asked for human
        customer_speech = call_context.get('customer_speech', '').lower()
        agent_keywords = [
            'speak to someone',
            'talk to someone',
            'human',
            'person',
            'agent',
            'representative',
            'real person',
            'actual person'
        ]
        
        if any(keyword in customer_speech for keyword in agent_keywords):
            return True
            
        return False
        
    def _is_within_business_hours(self, client_config: Dict) -> bool:
        """Check if current time is within business hours"""
        try:
            business_hours = client_config.get('business_hours', 'Mon-Fri 9AM-6PM')
            timezone_str = client_config.get('timezone', 'Australia/Melbourne')
            
            # Parse business hours (simple implementation)
            current_time = datetime.datetime.now()
            
            # Simple check: Monday-Friday, 9 AM to 6 PM
            if current_time.weekday() < 5:  # Monday = 0, Friday = 4
                if 9 <= current_time.hour < 18:
                    return True
                    
            return False
            
        except Exception as e:
            print(f"❌ Error checking business hours: {e}")
            return False
            
    def create_agent_transfer_twiml(self, client_config: Dict, call_context: Dict) -> str:
        """Create TwiML for agent transfer"""
        try:
            response = VoiceResponse()
            
            # Get agent number
            agent_number = client_config.get('agent_transfer_number')
            if not agent_number:
                raise ValueError("No agent transfer number configured")
                
            # Add transfer message
            transfer_message = self._get_transfer_message(client_config, call_context)
            response.say(transfer_message, voice='alice')
            
            # Transfer to agent
            dial = Dial(
                timeout=30,  # 30 seconds timeout
                record='record-from-answer',  # Record the transferred call
                caller_id=client_config.get('phone_number', Config.TWILIO_PHONE)
            )
            
            dial.number(
                agent_number,
                status_callback=f"{Config.BASE_URL}/twilio/agent-transfer-status",
                status_callback_event=['answered', 'completed']
            )
            
            response.append(dial)
            
            # If transfer fails, provide fallback
            response.say(
                "I'm sorry, but our team is currently unavailable. "
                "Please leave a message and we'll get back to you as soon as possible.",
                voice='alice'
            )
            
            response.record(
                timeout=30,
                transcribe=True,
                transcribeCallback=f"{Config.BASE_URL}/twilio/transcribe"
            )
            
            return str(response)
            
        except Exception as e:
            print(f"❌ Error creating agent transfer TwiML: {e}")
            # Fallback response
            response = VoiceResponse()
            response.say(
                "We're experiencing technical difficulties. Please try again later.",
                voice='alice'
            )
            return str(response)
            
    def _get_transfer_message(self, client_config: Dict, call_context: Dict) -> str:
        """Get appropriate transfer message based on context"""
        
        # Get customer name if available
        customer_name = call_context.get('customer_name', '')
        if customer_name:
            name_part = f" {customer_name}"
        else:
            name_part = ""
            
        # Get business name
        business_name = client_config.get('business_name', 'our team')
        
        # Base transfer message
        base_message = f"Thank you{name_part}. I'll connect you to {business_name} right away."
        
        # Add context-specific messages
        transfer_reason = call_context.get('transfer_reason', '')
        
        if transfer_reason == 'complaint':
            base_message += " I understand you have a concern and our team will be happy to help."
        elif transfer_reason == 'technical_issue':
            base_message += " Our technical team will assist you with this issue."
        elif transfer_reason == 'billing_inquiry':
            base_message += " Our billing team will help you with your account."
        elif transfer_reason == 'urgent_matter':
            base_message += " I'll connect you immediately for urgent assistance."
            
        return base_message
        
    def handle_agent_transfer_status(self, call_sid: str, call_status: str, 
                                   client_config: Dict, call_context: Dict) -> None:
        """Handle agent transfer status updates"""
        try:
            print(f"👤 Agent transfer status for {call_sid}: {call_status}")
            
            if call_status == 'answered':
                print(f"✅ Call transferred successfully to agent {client_config.get('agent_transfer_number')}")
                
                # Log the successful transfer
                self._log_transfer_event(
                    call_sid=call_sid,
                    client_id=client_config.get('client_id'),
                    status='transferred',
                    call_context=call_context,
                    agent_number=client_config.get('agent_transfer_number')
                )
                
            elif call_status == 'completed':
                print(f"👤 Agent transfer completed: {call_sid}")
                
                # Log the completed transfer
                self._log_transfer_event(
                    call_sid=call_sid,
                    client_id=client_config.get('client_id'),
                    status='completed',
                    call_context=call_context,
                    agent_number=client_config.get('agent_transfer_number')
                )
                
            elif call_status == 'busy' or call_status == 'no-answer':
                print(f"❌ Agent transfer failed: {call_status}")
                
                # Log the failed transfer
                self._log_transfer_event(
                    call_sid=call_sid,
                    client_id=client_config.get('client_id'),
                    status='failed',
                    call_context=call_context,
                    agent_number=client_config.get('agent_transfer_number'),
                    failure_reason=call_status
                )
                
        except Exception as e:
            print(f"❌ Error handling agent transfer status: {e}")
            
    def _log_transfer_event(self, call_sid: str, client_id: str, status: str, 
                          call_context: Dict, agent_number: str, 
                          failure_reason: str = None) -> None:
        """Log agent transfer events for analytics"""
        try:
            log_entry = {
                'timestamp': datetime.datetime.now().isoformat(),
                'call_sid': call_sid,
                'client_id': client_id,
                'status': status,
                'customer_name': call_context.get('customer_name'),
                'customer_phone': call_context.get('customer_phone'),
                'transfer_reason': call_context.get('transfer_reason'),
                'transfer_triggers': call_context.get('transfer_triggers', []),
                'agent_number': agent_number,
                'failure_reason': failure_reason
            }
            
            # Save to transfer logs
            log_file = f"logs/agent_transfers_{client_id}.json"
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            
            # Load existing logs
            logs = []
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    logs = json.load(f)
                    
            # Add new log entry
            logs.append(log_entry)
            
            # Save updated logs
            with open(log_file, 'w') as f:
                json.dump(logs, f, indent=2)
                
            print(f"📝 Agent transfer event logged: {status}")
            
        except Exception as e:
            print(f"❌ Error logging agent transfer event: {e}")
            
    def get_transfer_stats(self, client_id: str) -> Dict:
        """Get agent transfer statistics for a client"""
        try:
            log_file = f"logs/agent_transfers_{client_id}.json"
            
            if not os.path.exists(log_file):
                return {
                    'total_transfers': 0,
                    'successful_transfers': 0,
                    'failed_transfers': 0,
                    'success_rate': 0.0,
                    'transfer_reasons': {}
                }
                
            with open(log_file, 'r') as f:
                logs = json.load(f)
                
            total_transfers = len(logs)
            successful_transfers = len([log for log in logs if log['status'] == 'transferred'])
            failed_transfers = len([log for log in logs if log['status'] == 'failed'])
            
            success_rate = (successful_transfers / total_transfers * 100) if total_transfers > 0 else 0.0
            
            # Count transfer reasons
            transfer_reasons = {}
            for log in logs:
                reason = log.get('transfer_reason', 'unknown')
                transfer_reasons[reason] = transfer_reasons.get(reason, 0) + 1
                
            return {
                'total_transfers': total_transfers,
                'successful_transfers': successful_transfers,
                'failed_transfers': failed_transfers,
                'success_rate': round(success_rate, 2),
                'transfer_reasons': transfer_reasons
            }
            
        except Exception as e:
            print(f"❌ Error getting transfer stats: {e}")
            return {
                'total_transfers': 0,
                'successful_transfers': 0,
                'failed_transfers': 0,
                'success_rate': 0.0,
                'transfer_reasons': {}
            }
            
    def detect_transfer_request(self, customer_speech: str) -> Dict:
        """Detect if customer is requesting to speak to an agent"""
        customer_speech_lower = customer_speech.lower()
        
        # Keywords that indicate transfer request
        transfer_keywords = {
            'speak to someone': 'customer_requested_agent',
            'talk to someone': 'customer_requested_agent',
            'human': 'customer_requested_agent',
            'person': 'customer_requested_agent',
            'agent': 'customer_requested_agent',
            'representative': 'customer_requested_agent',
            'real person': 'customer_requested_agent',
            'actual person': 'customer_requested_agent',
            'complaint': 'complaint',
            'problem': 'complex_inquiry',
            'issue': 'technical_issue',
            'urgent': 'urgent_matter',
            'emergency': 'urgent_matter',
            'billing': 'billing_inquiry',
            'payment': 'billing_inquiry',
            'charge': 'billing_inquiry'
        }
        
        detected_triggers = []
        transfer_reason = None
        
        for keyword, trigger in transfer_keywords.items():
            if keyword in customer_speech_lower:
                detected_triggers.append(trigger)
                if not transfer_reason:
                    transfer_reason = trigger
                    
        return {
            'should_transfer': len(detected_triggers) > 0,
            'transfer_triggers': detected_triggers,
            'transfer_reason': transfer_reason,
            'confidence': len(detected_triggers) / len(transfer_keywords) if detected_triggers else 0
        }

# Global agent transfer manager instance
agent_transfer_manager = AgentTransferManager()
