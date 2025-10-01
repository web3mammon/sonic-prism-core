#!/usr/bin/env python3
"""
KLARIQO CONFIGURATION MODULE
Centralized configuration management for all API keys, constants, and settings
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import client configurations
from client_config import CLIENT_CONFIGS, get_client_config, get_default_config

class Config:
    """Centralized configuration class for Klariqo"""
    
    # ============================================================================
    # 🏢 CLIENT CONFIGURATION - MULTI-TENANT SUPPORT
    # ============================================================================
    # Client configurations are now managed in client_config.py
    CLIENT_CONFIGS = CLIENT_CONFIGS
    
    # Default client configuration (fallback)
    DEFAULT_CLIENT_CONFIG = get_default_config()
    
    # ============================================================================
    # 🌍 GEOGRAPHIC & VERTICAL CODES
    # ============================================================================
    # Geographic codes (2-letter ISO country codes)
    GEO_CODES = {
        'AU': 'Australia',
        'US': 'United States',
        'CA': 'Canada',
        'UK': 'United Kingdom',
        'NZ': 'New Zealand'
    }
    
    # Vertical shortcodes (4-letter codes for industries)
    VERTICAL_CODES = {
        'PLMB': 'Plumbing',
        'ELCT': 'Electrical',
        'HVAC': 'HVAC',
        'ROOF': 'Roofing',
        'SCHL': 'School',
        'HOTL': 'Hotel',
        'REST': 'Restaurant',
        'BANK': 'Banking',
        'INSR': 'Insurance',
        'LAWY': 'Legal',
        'MEDC': 'Medical',
        'DENT': 'Dental',
        'AUTO': 'Automotive',
        'REAL': 'Real Estate',
        'SOFT': 'Software',
        'CONS': 'Construction',
        'LAND': 'Landscaping',
        'CLEA': 'Cleaning',
        'SECU': 'Security',
        'TRAN': 'Transportation'
    }
    
    @classmethod
    def get_geo_name(cls, geo_code):
        """Get geographic name from code"""
        return cls.GEO_CODES.get(geo_code.upper(), geo_code)
    
    @classmethod
    def get_vertical_name(cls, vertical_code):
        """Get vertical name from code"""
        return cls.VERTICAL_CODES.get(vertical_code.upper(), vertical_code)
    
    @classmethod
    def is_valid_geo_code(cls, geo_code):
        """Check if geographic code is valid"""
        return geo_code.upper() in cls.GEO_CODES
    
    @classmethod
    def is_valid_vertical_code(cls, vertical_code):
        """Check if vertical code is valid"""
        return vertical_code.upper() in cls.VERTICAL_CODES
    
    @classmethod
    def parse_client_path(cls, path):
        """Parse client path: /au/plmb/petesplumbing -> (au, plmb, petesplumbing)"""
        parts = path.strip('/').split('/')
        if len(parts) >= 3:
            geo = parts[0].lower()
            vertical = parts[1].upper()
            business_name = '/'.join(parts[2:])  # Handle multi-part business names
            return geo, vertical, business_name
        return None, None, None
    
    @classmethod
    def build_client_path(cls, geo, vertical, business_name):
        """Build client path: (au, plmb, petesplumbing) -> /au/plmb/petesplumbing"""
        return f"/{geo.lower()}/{vertical.lower()}/{business_name.lower().replace(' ', '')}"
    
    @classmethod
    def get_client_id_from_path(cls, path):
        """Generate client ID from path: /au/plmb/petesplumbing -> au_plmb_petesplumbing"""
        geo, vertical, business_name = cls.parse_client_path(path)
        if geo and vertical and business_name:
            return f"{geo}_{vertical}_{business_name.lower().replace(' ', '')}"
        return None
    
    @classmethod
    def get_client_config(cls, phone_number=None):
        """Get client configuration based on phone number"""
        return get_client_config(phone_number)
    
    @classmethod
    def get_client_config_by_id(cls, client_id):
        """Get client configuration by client ID"""
        if client_id in cls.CLIENT_CONFIGS:
            return cls.CLIENT_CONFIGS[client_id]
        return cls.DEFAULT_CLIENT_CONFIG
    
    @classmethod
    def get_all_client_ids(cls):
        """Get list of all client IDs"""
        return list(cls.CLIENT_CONFIGS.keys())
    
    @classmethod
    def get_client_by_phone(cls, phone_number):
        """Find client configuration by phone number"""
        for client_id, config in cls.CLIENT_CONFIGS.items():
            if config.get('phone_number') == phone_number:
                return client_id, config
        return None, None
    
    @classmethod
    def is_valid_client(cls, client_id):
        """Check if client ID is valid"""
        return client_id in cls.CLIENT_CONFIGS
    
    @classmethod
    def get_current_client_config(cls):
        """Get current client configuration (for backward compatibility)"""
        return cls.DEFAULT_CLIENT_CONFIG
    
    # Legacy support - keep existing CLIENT_CONFIG for backward compatibility
    CLIENT_CONFIG = DEFAULT_CLIENT_CONFIG
    
    # ============================================================================
    # 🎙️ VOICE & TTS CONFIGURATION
    # ============================================================================
    # ElevenLabs Voice Settings
    VOICE_ID = "6FINSXmstr7jTeJkpd2r"  # Lauren's voice - Klariqo sales representative
    
    # Deepgram Settings
    DEEPGRAM_MODEL = "nova-2"
    DEEPGRAM_LANGUAGE = "en"  # English for Australian software sales
    
    # ============================================================================
    # 🔧 API KEYS - Loaded from environment variables
    # ============================================================================
    DEEPGRAM_API_KEY = os.getenv('DEEPGRAM_API_KEY')
    GROQ_API_KEY = os.getenv('GROQ_API_KEY') 
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE = os.getenv('TWILIO_PHONE')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # ============================================================================
    # 🎙️ SIMPLIFIED SILENCE DETECTION SETTINGS
    # ============================================================================
    # Base silence thresholds (in seconds) - SIMPLE AND RELIABLE
    SILENCE_THRESHOLD_BASE = 1.5  # Base threshold for normal speech completion
    SILENCE_THRESHOLD_AFTER_QUESTION = 3.0  # Give more time after AI asks a question
    

    
    # Call timeout settings
    CALL_TIMEOUT_SECONDS = 300  # 5 minutes - auto disconnect if no activity
    PAYMENT_TIMEOUT_SECONDS = 600  # 10 minutes - extended timeout during payment processing
    CALL_TIMEOUT = 300  # Backward compatibility
    PAYMENT_TIMEOUT = 600  # Backward compatibility
    
    # Flask Settings
    FLASK_HOST = '0.0.0.0'
    FLASK_PORT = int(os.getenv('FLASK_PORT', '5000'))  # Will be set by port manager
    FLASK_DEBUG = False
    
    # Base URL for webhooks and callbacks - will be set by onboarding automation
    BASE_URL = os.getenv('BASE_URL', 'https://app.klariqo.com')
    
    # Dynamic client path detection (will be set at runtime)
    _detected_path = None
    
    @classmethod
    def set_client_path(cls, path):
        """Set the current client path dynamically"""
        cls._detected_path = path
    
    @classmethod
    def get_client_path(cls):
        """Get the current client path, with fallback detection"""
        if cls._detected_path:
            return cls._detected_path
        
        # Try to detect from Flask request context (DEPRECATED - using FastAPI now)
        # try:
        #     from flask import request, g
        #     if hasattr(g, 'client_path'):
        #         return g.client_path
        #     elif hasattr(request, 'path'):
        #         # Auto-detect from request path
        #         path_parts = request.path.strip('/').split('/')
        #         if len(path_parts) >= 3:
        #             return f"/{path_parts[0]}/{path_parts[1]}/{path_parts[2]}"
        # except:
        #     pass
        
        # Fallback to environment variable or default
        return os.getenv('CLIENT_PATH', '/geo/vertical/business_name')
    
    # File Paths
    AUDIO_FOLDER = "audio_ulaw/"
    LOGS_FOLDER = "logs/"
    TEMP_FOLDER = "temp/"
    
    # Call Campaign Settings
    MAX_CONCURRENT_CALLS = 50
    CALL_INTERVAL = 5  # seconds between outbound calls
    
    # Session Memory Flags Template for Klariqo Sales Context
    SESSION_FLAGS_TEMPLATE = {
        "intro_played": False,
        "product_explained": False, 
        "pricing_discussed": False,
        "demo_scheduled": False,
        "objections_handled": False,
        "contact_details_collected": False,
        "follow_up_scheduled": False,
        "competitor_mentioned": False,
        "roi_discussed": False,
        "recording_permission_asked": False,  # Has Lauren asked for recording permission?
        "recording_permission_granted": False,  # Has user granted recording permission?
        "recording_started": False,  # Has call recording been started?
        "sms_number_asked": False,  # Has Lauren asked for SMS number?
        "phone_number_confirmed": False  # Has user confirmed their phone number?
    }
    
    # Dynamic Session Variables Template for Klariqo Sales
    SESSION_VARIABLES_TEMPLATE = {
        "prospect_type": None,  # "plumber", "plumbing_company", "trade_business"
        "interest_level": None,  # "high", "medium", "low", "not_interested"
        "business_size": None,  # "solo", "small_team", "medium_business", "large_business"
        "current_systems": None,  # "manual", "basic_software", "competitor_solution"
        "pain_points": None,  # "scheduling", "customer_management", "billing", "marketing"
        "prospect_name": None,  # Prospect's name
        "prospect_phone": None,  # Phone number for follow-up
        "confirmed_phone_number": None,  # Confirmed phone number for payment link
        "preferred_demo_time": None,  # "today", "tomorrow", "this_week", specific date
        "preferred_demo_type": None,  # "phone", "video", "in_person"
        "budget_range": None,  # "under_100", "100_500", "500_1000", "over_1000"
        "decision_maker": None,  # "yes", "no" - for decision authority
        "demo_scheduled": None,  # Final scheduled demo slot
        "recording_permission": None  # "yes", "no", "pending" - user's recording consent
    }
    
    # Demo Availability Data for Klariqo Sales Team
    AVAILABLE_DATES = [
        "Monday, August 5th",
        "Tuesday, August 6th", 
        "Wednesday, August 7th",
        "Thursday, August 8th",
        "Friday, August 9th",
        "Monday, August 12th",
        "Tuesday, August 13th",
        "Wednesday, August 14th",
        "Thursday, August 15th",
        "Friday, August 16th",
        "Monday, August 19th",
        "Tuesday, August 20th",
        "Wednesday, August 21st",
        "Thursday, August 22nd",
        "Friday, August 23rd",
        "Monday, August 26th",
        "Tuesday, August 27th",
        "Wednesday, August 28th",
        "Thursday, August 29th",
        "Friday, August 30th"
    ]
    
    AVAILABLE_TIMES = [
        "9:00 AM - 10:00 AM",
        "10:30 AM - 11:30 AM", 
        "2:00 PM - 3:00 PM",
        "3:30 PM - 4:30 PM"
    ]
    
    # Combined availability slots for easy demo scheduling
    KLARIQO_AVAILABILITY = {
        "available_slots": [
            {"date": "Monday, August 5th", "time": "9:00 AM - 10:00 AM", "slot_id": "MON05_0900"},
            {"date": "Monday, August 5th", "time": "10:30 AM - 11:30 AM", "slot_id": "MON05_1030"},
            {"date": "Monday, August 5th", "time": "2:00 PM - 3:00 PM", "slot_id": "MON05_1400"},
            {"date": "Tuesday, August 6th", "time": "9:00 AM - 10:00 AM", "slot_id": "TUE06_0900"},
            {"date": "Tuesday, August 6th", "time": "3:30 PM - 4:30 PM", "slot_id": "TUE06_1530"},
            {"date": "Wednesday, August 7th", "time": "10:30 AM - 11:30 AM", "slot_id": "WED07_1030"},
            {"date": "Wednesday, August 7th", "time": "2:00 PM - 3:00 PM", "slot_id": "WED07_1400"},
            {"date": "Thursday, August 8th", "time": "9:00 AM - 10:00 AM", "slot_id": "THU08_0900"},
            {"date": "Thursday, August 8th", "time": "3:30 PM - 4:30 PM", "slot_id": "THU08_1530"},
            {"date": "Friday, August 9th", "time": "10:30 AM - 11:30 AM", "slot_id": "FRI09_1030"},
            {"date": "Monday, August 12th", "time": "9:00 AM - 10:00 AM", "slot_id": "MON12_0900"},
            {"date": "Monday, August 12th", "time": "2:00 PM - 3:00 PM", "slot_id": "MON12_1400"},
            {"date": "Tuesday, August 13th", "time": "10:30 AM - 11:30 AM", "slot_id": "TUE13_1030"},
            {"date": "Tuesday, August 13th", "time": "3:30 PM - 4:30 PM", "slot_id": "TUE13_1530"},
            {"date": "Wednesday, August 14th", "time": "9:00 AM - 10:00 AM", "slot_id": "WED14_0900"},
            {"date": "Friday, August 16th", "time": "2:00 PM - 3:00 PM", "slot_id": "FRI16_1400"},
            {"date": "Friday, August 16th", "time": "3:30 PM - 4:30 PM", "slot_id": "FRI16_1530"}
        ],
        "last_updated": "2024-08-01 09:00 AM",
        "updated_by": "Lauren (Klariqo Sales)"
    }
    
    # ============================================================================
    # 🤖 AI MODEL CONFIGURATION
    # ============================================================================
    # Single model system for simplicity and consistency
    USE_DUAL_MODEL_SYSTEM = False  # Disabled - using single model
    PRIMARY_MODEL = "gpt-4o"       # Single high-quality model
    QUALITY_MODEL = "gpt-4o"       # Same model for consistency
    
    # Model-specific settings
    NANO_MAX_COMPLETION_TOKENS = 100  # Standard token limit (used by router)
    GPT5_MAX_COMPLETION_TOKENS = 100  # Back-compat constant

    # OpenAI generation parameters (tunable via environment)
    # For reliable business conversations we keep temperature low
    OPENAI_TEMPERATURE = float(os.getenv('OPENAI_TEMPERATURE', '0.3'))
    OPENAI_TOP_P = float(os.getenv('OPENAI_TOP_P', '1.0'))
    OPENAI_FREQUENCY_PENALTY = float(os.getenv('OPENAI_FREQUENCY_PENALTY', '0.0'))
    OPENAI_PRESENCE_PENALTY = float(os.getenv('OPENAI_PRESENCE_PENALTY', '0.0'))
    # Optional reproducibility seed (set via env when needed)
    _seed_env = os.getenv('OPENAI_SEED')
    OPENAI_SEED = int(_seed_env) if _seed_env and _seed_env.isdigit() else None
    
    @classmethod
    def validate_config(cls):
        """Validate that all required environment variables are set"""
        required_vars = [
            'DEEPGRAM_API_KEY',
            'ELEVENLABS_API_KEY'
        ]
        
        # Optional: Either OpenAI, Groq, or Gemini for AI (at least one required)
        ai_apis = ['OPENAI_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY']
        if not any(getattr(cls, api) for api in ai_apis):
            raise ValueError("At least one AI API key required: OPENAI_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY")
        
        # Twilio for telephony (required)
        if not all([cls.TWILIO_ACCOUNT_SID, cls.TWILIO_AUTH_TOKEN]):
            raise ValueError("Twilio configuration required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN")
        
        missing_vars = []
        for var in required_vars:
            if not getattr(cls, var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True

# Validate configuration on import
Config.validate_config()