#!/usr/bin/env python3
"""
KLARIQO CALL LOGGING MODULE
Handles structured logging of all call data to CSV
"""

import os
import csv
import time
import math
from datetime import datetime
from config import Config

class CallLogger:
    """Manages structured logging of call data"""
    
    def __init__(self):
        self.logs_folder = Config.LOGS_FOLDER
        self.call_log_file = os.path.join(self.logs_folder, "call_logs.csv")
        self.conversation_log_file = os.path.join(self.logs_folder, "conversation_logs.csv")
        self.usage_log_file = os.path.join(self.logs_folder, "usage_logs.csv")
        
        # Ensure logs folder exists
        os.makedirs(self.logs_folder, exist_ok=True)
        
        # Initialize CSV files with headers if they don't exist
        self._initialize_log_files()
    
    def _initialize_log_files(self):
        """Initialize CSV log files with proper headers"""
        
        # Call logs header
        call_headers = [
            'timestamp', 'call_sid', 'phone_number', 'call_direction', 
            'call_duration', 'total_audio_files_used', 'tts_responses_count',
            'session_flags', 'lead_data', 'final_status'
        ]
        
        if not os.path.exists(self.call_log_file):
            with open(self.call_log_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(call_headers)
            print(f"📊 Created call log file: {self.call_log_file}")
        
        # Conversation logs header  
        conversation_headers = [
            'timestamp', 'call_sid', 'speaker', 'message_type', 
            'content', 'audio_files_used', 'response_time_ms'
        ]
        
        if not os.path.exists(self.conversation_log_file):
            with open(self.conversation_log_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(conversation_headers)
            print(f"💬 Created conversation log file: {self.conversation_log_file}")

        # Usage logs header (per-call usage for billing)
        usage_headers = [
            'timestamp', 'client_id', 'to_number', 'from_number',
            'call_sid', 'call_direction', 'duration_secs', 'billed_minutes'
        ]
        if not os.path.exists(self.usage_log_file):
            with open(self.usage_log_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(usage_headers)
            print(f"📈 Created usage log file: {self.usage_log_file}")
    
    def log_call_start(self, call_sid, phone_number, call_direction, lead_data=None, client_id=None, to_number=None, from_number=None):
        """Log the start of a new call"""
        timestamp = datetime.now().isoformat()
        
        # Store call start info (we'll update with end info later)
        call_data = {
            'call_sid': call_sid,
            'phone_number': phone_number,
            'call_direction': call_direction,
            'start_time': time.time(),
            'lead_data': lead_data or {},
            'audio_files_used': [],
            'tts_responses': 0,
            'client_id': client_id,
            'to_number': to_number,
            'from_number': from_number or phone_number
        }
        
        # Store in memory for this session
        if not hasattr(self, '_active_calls'):
            self._active_calls = {}
        self._active_calls[call_sid] = call_data
        
        # print(f"📞 Call started - {call_direction}: {call_sid}")
    
    def log_conversation_turn(self, call_sid, speaker, message_type, content, 
                            audio_files_used=None, response_time_ms=None):
        """
        Log a single conversation turn
        
        Args:
            call_sid: Twilio call SID
            speaker: 'Prospect' or 'Lauren'  
            message_type: 'transcript', 'audio', 'tts'
            content: The actual message content
            audio_files_used: List of audio files played (if any)
            response_time_ms: Response generation time in milliseconds
        """
        timestamp = datetime.now().isoformat()
        
        # Format audio files as comma-separated string
        audio_files_str = ""
        if audio_files_used:
            if isinstance(audio_files_used, list):
                audio_files_str = ", ".join(audio_files_used)
            else:
                audio_files_str = str(audio_files_used)
        
        # Write to conversation log
        with open(self.conversation_log_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, call_sid, speaker, message_type,
                content, audio_files_str, response_time_ms or ""
            ])
        
        # Update active call tracking
        if hasattr(self, '_active_calls') and call_sid in self._active_calls:
            call_data = self._active_calls[call_sid]
            
            if audio_files_used:
                call_data['audio_files_used'].extend(
                    audio_files_used if isinstance(audio_files_used, list) else [audio_files_used]
                )
            
            if message_type == 'tts':
                call_data['tts_responses'] += 1
    
    def log_call_end(self, call_sid, final_status="completed"):
        """Log the end of a call with summary data"""
        if not hasattr(self, '_active_calls') or call_sid not in self._active_calls:
            print(f"⚠️ No call data found for {call_sid}")
            return
        
        call_data = self._active_calls[call_sid]
        timestamp = datetime.now().isoformat()
        
        # Calculate call duration
        call_duration = int(time.time() - call_data['start_time'])
        billed_minutes = max(1, math.ceil(call_duration / 60)) if call_duration > 0 else 0
        
        # Count unique audio files used
        unique_audio_files = len(set(call_data['audio_files_used']))
        
        # Get session flags (if available)
        session_flags = ""  # Will be passed from session if needed
        
        # Format lead data as JSON string
        lead_data_str = str(call_data['lead_data']) if call_data['lead_data'] else ""
        
        # Write to call log
        with open(self.call_log_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, call_sid, call_data['phone_number'], 
                call_data['call_direction'], call_duration,
                unique_audio_files, call_data['tts_responses'],
                session_flags, lead_data_str, final_status
            ])

        # Append to usage log for billing/quotas
        try:
            with open(self.usage_log_file, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    timestamp,
                    call_data.get('client_id') or '',
                    call_data.get('to_number') or '',
                    call_data.get('from_number') or '',
                    call_sid,
                    call_data['call_direction'],
                    call_duration,
                    billed_minutes
                ])
        except Exception as e:
            print(f"⚠️ Failed to append usage log for {call_sid}: {e}")
        
        # Clean up from memory
        del self._active_calls[call_sid]
        
        print(f"📋 Call logged - Duration: {call_duration}s, Audio files: {unique_audio_files}, TTS: {call_data['tts_responses']}")

    def get_monthly_usage(self, client_id, year, month):
        """Return per-client monthly usage totals.
        year: int YYYY, month: int 1-12
        Returns dict: {calls_count, total_seconds, total_billed_minutes}
        """
        from datetime import datetime
        usage = {
            'client_id': client_id,
            'year': year,
            'month': month,
            'calls_count': 0,
            'total_seconds': 0,
            'total_billed_minutes': 0
        }
        if not os.path.exists(self.usage_log_file):
            return usage
        try:
            with open(self.usage_log_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('client_id') != client_id:
                        continue
                    # Parse timestamp and filter by month
                    try:
                        ts = datetime.fromisoformat(row['timestamp'])
                    except Exception:
                        continue
                    if ts.year == year and ts.month == month:
                        usage['calls_count'] += 1
                        usage['total_seconds'] += int(row.get('duration_secs') or 0)
                        usage['total_billed_minutes'] += int(row.get('billed_minutes') or 0)
        except Exception as e:
            print(f"⚠️ Error computing monthly usage: {e}")
        return usage
    
    def log_prospect_input(self, call_sid, transcript, response_time_ms=None):
        """Log prospect's speech input"""
        self.log_conversation_turn(
            call_sid, "Prospect", "transcript", transcript, 
            response_time_ms=response_time_ms
        )
    
    def log_lauren_audio_response(self, call_sid, audio_file, response_time_ms=None):
        """Log Lauren's audio file response"""
        # Handle single audio file (legacy support for chaining)
        if '+' in audio_file:
            audio_list = [f.strip() for f in audio_file.split('+')]
            print(f"⚠️ Legacy chaining detected in logger, using first file: {audio_list[0]}")
        else:
            audio_list = [audio_file.strip()]
        
        # Log the response
        self.log_conversation_turn(
            call_sid, "Lauren", "audio", f"<audio: {audio_file}>",
            audio_files_used=audio_list, response_time_ms=response_time_ms
        )
    
    def log_lauren_tts_response(self, call_sid, tts_text, response_time_ms=None):
        """Log Lauren's TTS response"""
        self.log_conversation_turn(
            call_sid, "Lauren", "tts", f"<TTS: {tts_text}>",
            response_time_ms=response_time_ms
        )
    
    def log_recording_completed(self, call_sid, filepath, start_time, end_time):
        """Log local recording completion details"""
        timestamp = datetime.now().isoformat()
        duration = int(end_time - start_time) if end_time and start_time else 0
        
        # Write to conversation log
        with open(self.conversation_log_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, call_sid, 'System', 'recording_completed',
                f"Local recording: {filepath}, Duration: {duration}s",
                '', ''
            ])
        
        print(f"🎙️ Local recording completed for {call_sid}: {filepath} ({duration}s)")

    def log_sms_sent(self, call_sid, phone_number, message_body, message_sid):
        """Log SMS sent details"""
        timestamp = datetime.now().isoformat()
        
        # Write to conversation log
        with open(self.conversation_log_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, call_sid, 'System', 'sms_sent',
                f"SMS to {phone_number}: {message_body}",
                f"Message SID: {message_sid}", ''
            ])
        
        print(f"📱 SMS sent for {call_sid}: {message_sid} to {phone_number}")
    
    def get_call_stats(self, days=7):
        """Get call statistics for the last N days"""
        if not os.path.exists(self.call_log_file):
            return {}
        
        stats = {
            'total_calls': 0,
            'inbound_calls': 0,
            'outbound_calls': 0,
            'avg_duration': 0,
            'total_audio_files_used': 0,
            'total_tts_responses': 0
        }
        
        cutoff_time = time.time() - (days * 24 * 3600)
        durations = []
        
        try:
            with open(self.call_log_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    # Parse timestamp
                    call_time = datetime.fromisoformat(row['timestamp']).timestamp()
                    
                    if call_time >= cutoff_time:
                        stats['total_calls'] += 1
                        
                        if row['call_direction'] == 'inbound':
                            stats['inbound_calls'] += 1
                        else:
                            stats['outbound_calls'] += 1
                        
                        # Add duration
                        duration = int(row['call_duration']) if row['call_duration'] else 0
                        durations.append(duration)
                        
                        # Add audio file count
                        audio_count = int(row['total_audio_files_used']) if row['total_audio_files_used'] else 0
                        stats['total_audio_files_used'] += audio_count
                        
                        # Add TTS count
                        tts_count = int(row['tts_responses_count']) if row['tts_responses_count'] else 0
                        stats['total_tts_responses'] += tts_count
        
            # Calculate average duration
            if durations:
                stats['avg_duration'] = sum(durations) // len(durations)
        
        except Exception as e:
            print(f"⚠️ Error reading call stats: {e}")
        
        return stats
    
    def export_logs_for_date(self, date_str):
        """Export logs for a specific date (YYYY-MM-DD format)"""
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            # Export call logs
            call_export_file = f"call_logs_{date_str}.csv"
            conversation_export_file = f"conversation_logs_{date_str}.csv" 
            
            # Filter and export call logs
            with open(self.call_log_file, 'r', encoding='utf-8') as infile:
                with open(call_export_file, 'w', newline='', encoding='utf-8') as outfile:
                    reader = csv.reader(infile)
                    writer = csv.writer(outfile)
                    
                    # Copy header
                    header = next(reader)
                    writer.writerow(header)
                    
                    # Filter rows by date
                    for row in reader:
                        if row[0]:  # timestamp column
                            row_date = datetime.fromisoformat(row[0]).date()
                            if row_date == target_date:
                                writer.writerow(row)
            
            print(f"📤 Exported logs for {date_str}")
            return call_export_file, conversation_export_file
            
        except Exception as e:
            print(f"❌ Export failed: {e}")
            return None, None

    def save_transcript(self, call_sid, conversation_history):
        """Save a plain-text transcript file for a specific call"""
        try:
            transcripts_dir = os.path.join(self.logs_folder, "transcripts")
            os.makedirs(transcripts_dir, exist_ok=True)
            filepath = os.path.join(transcripts_dir, f"{call_sid}.txt")
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"Call SID: {call_sid}\n")
                f.write(f"Generated: {datetime.now().isoformat()}\n")
                f.write("\n--- Conversation ---\n")
                for line in conversation_history or []:
                    f.write(line + "\n")
            
            print(f"📝 Saved transcript: {filepath}")
            return filepath
        except Exception as e:
            print(f"⚠️ Failed to save transcript for {call_sid}: {e}")
            return None

# Global call logger instance
call_logger = CallLogger()