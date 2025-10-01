#!/usr/bin/env python3
"""
KLARIQO CALL RECORDING MODULE
Handles local call recording when user gives consent
"""

import os
import time
import wave
import numpy as np
import librosa
import soundfile as sf
from datetime import datetime
from collections import deque
import threading
import queue

class CallRecorder:
    """Handles local call recording with μ-law to MP3 conversion"""
    
    def __init__(self):
        self.recordings_dir = "call_recordings"
        self.ensure_recordings_directory()
        self.active_recordings = {}  # call_sid -> recording_data
        self.audio_queue = queue.Queue()
        self.processing_thread = None
        self.start_processing_thread()
    
    def ensure_recordings_directory(self):
        """Create recordings directory if it doesn't exist"""
        if not os.path.exists(self.recordings_dir):
            os.makedirs(self.recordings_dir)
            print(f"📁 Created recordings directory: {self.recordings_dir}")
    
    def start_processing_thread(self):
        """Start background thread for audio processing"""
        self.processing_thread = threading.Thread(target=self._process_audio_queue, daemon=True)
        self.processing_thread.start()
        print("🎙️ Call recording processor started")
    
    def start_recording(self, call_sid):
        """Start recording for a specific call"""
        if call_sid in self.active_recordings:
            print(f"⚠️ Recording already active for call {call_sid}")
            return False
        
        recording_data = {
            'call_sid': call_sid,
            'start_time': time.time(),
            'user_audio': deque(),  # Incoming audio from user
            'ai_audio': deque(),    # Outgoing audio from AI
            'active': True,
            'permission_granted': True
        }
        
        self.active_recordings[call_sid] = recording_data
        print(f"🎙️ Started recording for call {call_sid}")
        return True
    
    def stop_recording(self, call_sid):
        """Stop recording and save the call"""
        if call_sid not in self.active_recordings:
            print(f"⚠️ No active recording found for call {call_sid}")
            return False
        
        recording_data = self.active_recordings[call_sid]
        recording_data['active'] = False
        recording_data['end_time'] = time.time()
        
        # Add to processing queue
        self.audio_queue.put(recording_data)
        
        # Remove from active recordings
        del self.active_recordings[call_sid]
        
        print(f"🎙️ Stopped recording for call {call_sid}, queued for processing")
        return True
    
    def add_user_audio(self, call_sid, audio_data):
        """Add incoming user audio to recording"""
        if call_sid in self.active_recordings and self.active_recordings[call_sid]['active']:
            self.active_recordings[call_sid]['user_audio'].append({
                'data': audio_data,
                'timestamp': time.time()
            })
    
    def add_ai_audio(self, call_sid, audio_data):
        """Add outgoing AI audio to recording"""
        if call_sid in self.active_recordings and self.active_recordings[call_sid]['active']:
            self.active_recordings[call_sid]['ai_audio'].append({
                'data': audio_data,
                'timestamp': time.time()
            })
    
    def _process_audio_queue(self):
        """Background thread to process completed recordings"""
        while True:
            try:
                recording_data = self.audio_queue.get(timeout=1)
                self._save_recording(recording_data)
                self.audio_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"❌ Error processing recording: {e}")
    
    def _save_recording(self, recording_data):
        """Save recording as WAV file"""
        try:
            call_sid = recording_data['call_sid']
            start_time = recording_data['start_time']
            
            # Create filename with timestamp
            timestamp = datetime.fromtimestamp(start_time).strftime("%Y%m%d_%H%M%S")
            filename_wav = f"{timestamp}_{call_sid}.wav"
            filepath_wav = os.path.join(self.recordings_dir, filename_wav)
            
            print(f"🎙️ Processing recording: {filename_wav}")
            
            # Combine user and AI audio
            combined_audio = self._combine_audio_streams(recording_data)
            
            if combined_audio is not None and len(combined_audio) > 0:
                # Convert and save as WAV (8000 Hz mono)
                self._save_as_wav(combined_audio, filepath_wav)
                print(f"✅ Recording saved: {filepath_wav}")
                
                # Log recording completion
                self._log_recording_completion(recording_data, filepath_wav)
            else:
                print(f"⚠️ No audio data to save for call {call_sid}")
                
        except Exception as e:
            print(f"❌ Error saving recording: {e}")
    
    def _combine_audio_streams(self, recording_data):
        """Combine user and AI audio streams chronologically"""
        try:
            all_audio_segments = []
            
            # Add user audio segments
            for segment in recording_data['user_audio']:
                all_audio_segments.append({
                    'data': segment['data'],
                    'timestamp': segment['timestamp'],
                    'type': 'user'
                })
            
            # Add AI audio segments
            for segment in recording_data['ai_audio']:
                all_audio_segments.append({
                    'data': segment['data'],
                    'timestamp': segment['timestamp'],
                    'type': 'ai'
                })
            
            # Sort by timestamp
            all_audio_segments.sort(key=lambda x: x['timestamp'])
            
            # Combine audio data
            combined_audio = b''
            for segment in all_audio_segments:
                combined_audio += segment['data']
            
            return combined_audio
            
        except Exception as e:
            print(f"❌ Error combining audio streams: {e}")
            return None
    
    def _save_as_wav(self, audio_data, filepath):
        """Convert μ-law audio to WAV and save (8000 Hz mono)"""
        try:
            # Convert μ-law bytes to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.uint8)
            
            # Convert μ-law to linear PCM (int16)
            pcm_audio = self._ulaw_to_linear(audio_array).astype(np.int16)
            
            # Normalize to float32 [-1, 1] for writing if needed
            pcm_float = pcm_audio.astype(np.float32)
            max_val = np.max(np.abs(pcm_float)) or 1.0
            pcm_float /= max_val
            
            # Save as WAV using soundfile (sf)
            sf.write(filepath, pcm_float, 8000, subtype='PCM_16')
            print(f"📁 Saved WAV: {filepath}")
            
        except Exception as e:
            print(f"❌ Error saving audio file: {e}")
    
    def _ulaw_to_linear(self, ulaw_data):
        """Convert μ-law encoded audio to linear PCM"""
        try:
            # μ-law decoding table
            ulaw_table = np.array([
                -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
                -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
                -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
                -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
                -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
                -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
                -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
                -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
                -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
                -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
                -876, -844, -812, -780, -748, -716, -684, -652,
                -620, -588, -556, -524, -492, -460, -428, -396,
                -372, -356, -340, -324, -308, -292, -276, -260,
                -244, -228, -212, -196, -180, -164, -148, -132,
                -120, -112, -104, -96, -88, -80, -72, -64,
                -56, -48, -40, -32, -24, -16, -8, 0,
                32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
                23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
                15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
                11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
                7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
                5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
                3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
                2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
                1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
                1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
                876, 844, 812, 780, 748, 716, 684, 652,
                620, 588, 556, 524, 492, 460, 428, 396,
                372, 356, 340, 324, 308, 292, 276, 260,
                244, 228, 212, 196, 180, 164, 148, 132,
                120, 112, 104, 96, 88, 80, 72, 64,
                56, 48, 40, 32, 24, 16, 8, 0
            ], dtype=np.int16)
            
            # Decode μ-law to linear PCM
            pcm_data = ulaw_table[ulaw_data]
            return pcm_data
            
        except Exception as e:
            print(f"❌ Error converting μ-law to linear: {e}")
            return np.array([], dtype=np.int16)
    
    def _log_recording_completion(self, recording_data, filepath):
        """Log recording completion details"""
        try:
            from logger import call_logger
            call_logger.log_recording_completed(
                recording_data['call_sid'],
                filepath,
                recording_data['start_time'],
                recording_data.get('end_time', time.time())
            )
        except Exception as e:
            print(f"⚠️ Error logging recording completion: {e}")
    
    def is_recording_active(self, call_sid):
        """Check if recording is active for a call"""
        return call_sid in self.active_recordings and self.active_recordings[call_sid]['active']
    
    def get_recording_status(self, call_sid):
        """Get recording status for a call"""
        if call_sid in self.active_recordings:
            return {
                'active': self.active_recordings[call_sid]['active'],
                'permission_granted': self.active_recordings[call_sid]['permission_granted'],
                'start_time': self.active_recordings[call_sid]['start_time'],
                'user_segments': len(self.active_recordings[call_sid]['user_audio']),
                'ai_segments': len(self.active_recordings[call_sid]['ai_audio'])
            }
        return None

# Global call recorder instance
call_recorder = CallRecorder()
