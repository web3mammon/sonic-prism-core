#!/usr/bin/env python3
"""
TTS GENERATOR MODULE - PLMB TEMPLATE
Plumbing-optimized TTS generation system for creating personalized audio files during onboarding
Specifically designed for Australian plumbing businesses with industry-specific terminology
"""

import os
import json
import time
import requests
from typing import Dict, List, Optional
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlumbingTTSGenerator:
    """Plumbing-optimized TTS Generator for Australian plumbing businesses"""
    
    def __init__(self, elevenlabs_api_key: str, voice_id: str = "uA0L9FxeLpzlG615Ueay", output_dir: str = "audio_optimised"):
        """
        Initialize Plumbing TTS Generator
        
        Args:
            elevenlabs_api_key: ElevenLabs API key
            voice_id: ElevenLabs voice ID (default: Australian male voice)
            output_dir: Directory to save generated audio files
        """
        self.api_key = elevenlabs_api_key
        self.voice_id = voice_id
        self.output_dir = output_dir
        self.base_url = "https://api.elevenlabs.io/v1"
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Plumbing-specific audio templates with Australian terminology
        self.audio_templates = {
            "intro_greeting": "G'day! You've reached {business_name}. How can we help you today?",
            "after_hours_greeting": "G'day, {business_name} here. It's after hours right now, but if it's urgent, we can still help for an after-hours call-out fee. Otherwise, leave your name and number and we'll get back to you first thing.",
            "available_hours": "We're available {business_hours}. After-hours emergency support is also available for an extra service fee, so yeah, give us a ring anytime.",
            "pricing": "Our pricing usually starts at {base_price} for standard service calls. We'll provide a full quote after understanding the job better.",
            "cost_estimate_enquiry": "I can give you a ballpark now, and we'll confirm once we see the job.",
            "services_offered": "We handle blocked drains, leaking taps, toilet repairs, hot water issues, and a range of other plumbing issues. We also do gas fitting, pipe relining, and kitchen or bathroom plumbing. What's the issue you're facing right now?",
            "in_business_how_long": "We've been doing this for {years_in_business} years now and got loads of happy clients and repeat work. You'll be in safe hands.",
            "ask_time_day": "We've got a few open slots this week. What time and day works for you?",
            "when_can_come": "What's a good time to swing by?",
            "urgent_callout": "If it's urgent, we can reshuffle and get someone out today. Want me to do that?",
            "confirmed_bye": "Perfect, you're locked in. We'll see you then. Thanks for calling!",
            "need_to_check": "No worries, I can hold your spot for the day you prefer while you check.",
            
            # Plumbing-specific service responses
            "blocked_drain": "Blocked drain? Yeah, that's a common one here — we can sort that out quick smart.",
            "leaking_tap": "Ah, the good ol' drip. Yep, we can fix that up for ya quick as — shouldn't take long at all.",
            "toilet_repair": "Gotcha, we'll get that toilet working again for you.",
            "hot_water_issues": "Oof, no hot water's no fun. We'll check it out and get you back up and running.",
            "gas_fitting": "Sure thing, we're licensed for gas work. Is it for a new install or a check-up?",
            "pipe_relining": "Yeah, we do pipe relining all the time. Saves you ripping the whole thing out.",
            "bath_kitchen_plumbing": "Easy done — we can handle the whole lot start to finish. Are you mid-reno now?",
            "general_problems": "Righto, I am sure we can help. Can you tell me a bit more about what's going on there?"
        }
        
        logger.info(f"🔧 Plumbing TTS Generator initialized with voice ID: {voice_id}")
    
    def generate_audio(self, text: str, filename: str) -> Dict:
        """
        Generate audio file from text using ElevenLabs API
        
        Args:
            text: Text to convert to speech
            filename: Output filename (without extension)
            
        Returns:
            Dict with success status and file path
        """
        try:
            url = f"{self.base_url}/text-to-speech/{self.voice_id}"
            
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.api_key
            }
            
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            
            logger.info(f"🎵 Generating plumbing audio: {filename}")
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save audio file
                file_path = os.path.join(self.output_dir, f"{filename}.mp3")
                with open(file_path, "wb") as f:
                    f.write(response.content)
                
                logger.info(f"✅ Plumbing audio generated successfully: {file_path}")
                return {
                    "success": True,
                    "file_path": file_path,
                    "filename": f"{filename}.mp3",
                    "text": text
                }
            else:
                logger.error(f"❌ TTS generation failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"TTS API error: {response.status_code}",
                    "response": response.text
                }
                
        except Exception as e:
            logger.error(f"❌ TTS generation error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_plumber_audio_files(self, client_config: Dict) -> Dict:
        """
        Generate all personalized audio files for a plumbing client
        
        Args:
            client_config: Plumbing client configuration dictionary
            
        Returns:
            Dict with generation results
        """
        results = {
            "success": True,
            "generated_files": [],
            "errors": [],
            "total_files": 0,
            "successful_files": 0
        }
        
        logger.info(f"🔧 Starting plumbing audio generation for: {client_config.get('business_name', 'Unknown')}")
        
        # Generate each audio file
        for template_key, template_text in self.audio_templates.items():
            try:
                # Format template with client data
                formatted_text = template_text.format(**client_config)
                
                # Generate audio
                result = self.generate_audio(formatted_text, template_key)
                
                if result["success"]:
                    results["generated_files"].append(result)
                    results["successful_files"] += 1
                    logger.info(f"✅ Generated plumbing audio: {template_key}.mp3")
                else:
                    results["errors"].append({
                        "template": template_key,
                        "error": result["error"]
                    })
                    logger.error(f"❌ Failed to generate plumbing audio: {template_key}.mp3")
                
                results["total_files"] += 1
                
                # Small delay to avoid rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                error_msg = f"Error generating plumbing audio {template_key}: {str(e)}"
                results["errors"].append({
                    "template": template_key,
                    "error": error_msg
                })
                logger.error(error_msg)
                results["total_files"] += 1
        
        # Update overall success status
        if results["errors"]:
            results["success"] = False
        
        logger.info(f"🔧 Plumbing audio generation complete: {results['successful_files']}/{results['total_files']} files generated")
        return results
    
    def update_plumbing_audio_snippets_json(self, generated_files: List[Dict], output_file: str = "audio_snippets.json") -> bool:
        """
        Update audio_snippets.json with generated plumbing files
        
        Args:
            generated_files: List of generated file results
            output_file: Output JSON filename
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Load existing audio snippets if they exist
            snippets = {}
            if os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    snippets = json.load(f)
            
            # Add generated files to snippets with proper categorization
            if "introductions" not in snippets:
                snippets["introductions"] = {}
            if "pricing" not in snippets:
                snippets["pricing"] = {}
            if "miscellaneous" not in snippets:
                snippets["miscellaneous"] = {}
            
            for file_result in generated_files:
                if file_result["success"]:
                    filename = file_result["filename"]
                    text = file_result["text"]
                    
                    # Categorize based on filename
                    if filename in ["intro_greeting.mp3", "after_hours_greeting.mp3"]:
                        snippets["introductions"][filename] = text
                    elif filename in ["pricing.mp3", "cost_estimate_enquiry.mp3"]:
                        snippets["pricing"][filename] = text
                    else:
                        snippets["miscellaneous"][filename] = text
            
            # Save updated snippets
            with open(output_file, 'w') as f:
                json.dump(snippets, f, indent=2)
            
            logger.info(f"✅ Updated plumbing audio snippets: {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error updating plumbing audio snippets: {str(e)}")
            return False
    
    def validate_plumber_config(self, client_config: Dict) -> Dict:
        """
        Validate plumbing client configuration for audio generation
        
        Args:
            client_config: Plumbing client configuration to validate
            
        Returns:
            Dict with validation results
        """
        required_fields = [
            "business_name",
            "business_hours", 
            "base_price",
            "years_in_business"
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in client_config or not client_config[field]:
                missing_fields.append(field)
        
        if missing_fields:
            return {
                "valid": False,
                "missing_fields": missing_fields,
                "error": f"Missing required fields for plumbing client: {', '.join(missing_fields)}"
            }
        
        return {
            "valid": True,
            "message": "Plumbing client configuration is valid for audio generation"
        }

# Convenience function for plumbing audio generation
def generate_plumber_audio(client_config: Dict, elevenlabs_api_key: str, voice_id: str = "uA0L9FxeLpzlG615Ueay", output_dir: str = "audio_ulaw") -> Dict:
    """
    Convenience function to generate all audio files for a plumbing client
    
    Args:
        client_config: Plumbing client configuration
        elevenlabs_api_key: ElevenLabs API key
        voice_id: ElevenLabs voice ID (default: Australian male voice)
        output_dir: Output directory for audio files
        
    Returns:
        Dict with generation results
    """
    # Initialize plumbing TTS generator
    tts_gen = PlumbingTTSGenerator(elevenlabs_api_key, voice_id, output_dir)
    
    # Validate plumbing client config
    validation = tts_gen.validate_plumber_config(client_config)
    if not validation["valid"]:
        return {
            "success": False,
            "error": validation["error"]
        }
    
    # Generate plumbing audio files
    results = tts_gen.generate_plumber_audio_files(client_config)
    
    # Update audio snippets if generation was successful
    if results["success"]:
        tts_gen.update_plumbing_audio_snippets_json(results["generated_files"])
    
    return results

if __name__ == "__main__":
    # Example usage for plumbing client
    example_plumber_config = {
        "business_name": "Pete's Plumbing",
        "business_hours": "Mon-Fri 8AM-6PM, Sat 8AM-4PM",
        "base_price": "$98",
        "years_in_business": "7"
    }
    
    # This would be called with actual API key
    # result = generate_plumber_audio(example_plumber_config, "your_api_key")
    # print(result)
