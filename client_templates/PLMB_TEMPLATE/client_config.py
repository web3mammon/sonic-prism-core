#!/usr/bin/env python3
"""
CLIENT CONFIGURATIONS
Centralized client configuration for multi-tenant system
Each client gets their own phone number and configuration
"""

from datetime import datetime

# ============================================================================
# 🏢 CLIENT CONFIGURATIONS - MULTI-TENANT SUPPORT
# ============================================================================

CLIENT_CONFIGS = {
    # ============================================================================
    # 🔧 PLUMBERS - PLUMBING SERVICES
    # ============================================================================
    "+61XXXXXXXXX": {  # Replace with actual plumber phone number
        "client_id": "plumbers",
        "business_name": "Pete's Plumbing",
        "ai_assistant_name": "Pete",
        "industry": "plumbing_services",
        "location": "Australia",
        "city": "Melbourne",
        "phone_number": "+61XXXXXXXXX",
        "website": "https://petesplumbing.com.au",
        "business_hours": "Mon-Fri 8AM-6PM, Sat 8AM-4PM",
        "emergency_available": True,
        "service_area": "Melbourne Metro",
        "currency": "AUD",
        "timezone": "Australia/Melbourne",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Male Australian voice
        "audio_folder": "audio_ulaw/",
        
        # Call Forwarding Settings
        
        
        # Agent Transfer Settings
        "agent_transfer_enabled": False,  # Transfer to human agent
        "agent_transfer_number": "+61AGENTNUMBER",  # Agent's personal number
        
        # Calendar Integration Settings
        "calendar_integration_enabled": False,  # Enable calendar booking
        "calendar_type": "google",  # google, outlook, or custom
        "calendar_config": {
            "calendar_id": "primary",  # For Google Calendar
            "access_token": None,  # For Outlook
            "webhook_url": None,  # For custom calendar
        },
        
        "session_flags_template": {
            "intro_played": False,
            "services_explained": False,
            "pricing_discussed": False,
            "booking_requested": False,
            "urgent_call": False,
            "contact_details_collected": False,
            "appointment_scheduled": False,
            "emergency_handled": False,
        }
    },
}

# ============================================================================
# 🔧 HELPER FUNCTIONS
# ============================================================================

def get_client_config(phone_number=None):
    """Get client configuration based on phone number"""
    if phone_number and phone_number in CLIENT_CONFIGS:
        return CLIENT_CONFIGS[phone_number]
    return get_default_config()

def get_default_config():
    """Get default client configuration (fallback)"""
    return {
        "client_id": "default",
        "business_name": "Pete's Plumbing",
        "ai_assistant_name": "Pete",
        "industry": "plumbing_services",
        "location": "Australia",
        "city": "Melbourne",
        "phone_number": "+61XXXXXXXXX",
        "website": "https://petesplumbing.com.au",
        "business_hours": "Mon-Fri 8AM-6PM, Sat 8AM-4PM",
        "emergency_available": True,
        "service_area": "Melbourne Metro",
        "currency": "AUD",
        "timezone": "Australia/Melbourne",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "audio_folder": "audio_ulaw/",
        "session_flags_template": {
            "intro_played": False,
            "services_explained": False,
            "pricing_discussed": False,
            "booking_requested": False,
            "urgent_call": False,
            "contact_details_collected": False,
            "appointment_scheduled": False,
            "emergency_handled": False,
        }
    }

def get_all_clients():
    """Get list of all configured clients"""
    return list(CLIENT_CONFIGS.keys())

def get_client_by_id(client_id):
    """Get client configuration by client_id"""
    for phone, config in CLIENT_CONFIGS.items():
        if config.get('client_id') == client_id:
            return config
    return None

def add_new_client(phone_number, config):
    """Add a new client configuration"""
    CLIENT_CONFIGS[phone_number] = config
    print(f"✅ Added new client: {config['business_name']} ({config['client_id']})")

def remove_client(phone_number):
    """Remove a client configuration"""
    if phone_number in CLIENT_CONFIGS:
        client_name = CLIENT_CONFIGS[phone_number]['business_name']
        del CLIENT_CONFIGS[phone_number]
        print(f"🗑️ Removed client: {client_name}")
        return True
    return False

# ============================================================================
# 📊 CLIENT STATISTICS
# ============================================================================

def get_client_stats():
    """Get statistics about configured clients"""
    stats = {
        "total_clients": len(CLIENT_CONFIGS),
        "clients_by_industry": {},
        "clients_by_location": {},
        "clients_by_voice": {}
    }
    
    for phone, config in CLIENT_CONFIGS.items():
        # Count by industry
        industry = config.get('industry', 'unknown')
        stats['clients_by_industry'][industry] = stats['clients_by_industry'].get(industry, 0) + 1
        
        # Count by location
        location = config.get('location', 'unknown')
        stats['clients_by_location'][location] = stats['clients_by_location'].get(location, 0) + 1
        
        # Count by voice
        voice = config.get('voice_id', 'unknown')
        stats['clients_by_voice'][voice] = stats['clients_by_voice'].get(voice, 0) + 1
    
    return stats

# ============================================================================
# 🧪 VALIDATION FUNCTIONS
# ============================================================================

def validate_client_config(config):
    """Validate a client configuration"""
    required_fields = [
        'client_id', 'business_name', 'ai_assistant_name', 'industry',
        'location', 'city', 'phone_number', 'website', 'business_hours',
        'emergency_available', 'service_area', 'currency', 'timezone',
        'voice_id', 'audio_folder', 'session_flags_template'
    ]
    
    missing_fields = []
    for field in required_fields:
        if field not in config:
            missing_fields.append(field)
    
    if missing_fields:
        raise ValueError(f"Missing required fields: {missing_fields}")
    
    return True

def validate_all_configs():
    """Validate all client configurations"""
    errors = []
    for phone, config in CLIENT_CONFIGS.items():
        try:
            validate_client_config(config)
        except ValueError as e:
            errors.append(f"Phone {phone}: {e}")
    
    if errors:
        raise ValueError(f"Configuration validation failed:\n" + "\n".join(errors))
    
    print(f"✅ All {len(CLIENT_CONFIGS)} client configurations validated successfully")
    return True

# ===== CLIENT MANAGEMENT SYSTEM =====

class ClientManager:
    """Manages client configurations and onboarding"""
    
    def __init__(self):
        self.clients = CLIENT_CONFIGS.copy()
    
    def add_client(self, client_id, config):
        """Add a new client configuration"""
        if client_id in self.clients:
            raise ValueError(f"Client {client_id} already exists")
        
        # Validate required fields
        required_fields = ['business_name', 'ai_assistant_name', 'phone_number', 'industry']
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")
        
        # Set default values
        config.setdefault('client_id', client_id)
        config.setdefault('status', 'active')
        config.setdefault('created_at', datetime.now().isoformat())
        
        self.clients[client_id] = config
        
        # Save to persistent storage
        self.save_clients()
        
        return config
    
    def update_client(self, client_id, updates):
        """Update existing client configuration"""
        if client_id not in self.clients:
            raise ValueError(f"Client {client_id} not found")
        
        self.clients[client_id].update(updates)
        self.clients[client_id]['updated_at'] = datetime.now().isoformat()
        
        # Save to persistent storage
        self.save_clients()
        
        return self.clients[client_id]
    
    def deactivate_client(self, client_id):
        """Deactivate a client"""
        if client_id not in self.clients:
            raise ValueError(f"Client {client_id} not found")
        
        self.clients[client_id]['status'] = 'inactive'
        self.clients[client_id]['deactivated_at'] = datetime.now().isoformat()
        
        # Save to persistent storage
        self.save_clients()
        
        return self.clients[client_id]
    
    def get_active_clients(self):
        """Get all active clients"""
        return {k: v for k, v in self.clients.items() if v.get('status') == 'active'}
    
    def save_clients(self):
        """Save client configurations to persistent storage"""
        # This could save to database, file, or cloud storage
        # For now, we'll keep it in memory but you can extend this
        pass
    
    def create_client_from_template(self, client_id, business_name, phone_number, industry):
        """Create a new client from industry template"""
        template = self.get_industry_template(industry)
        if not template:
            raise ValueError(f"No template found for industry: {industry}")
        
        config = template.copy()
        config.update({
            'business_name': business_name,
            'phone_number': phone_number,
            'industry': industry,
            'client_id': client_id
        })
        
        return self.add_client(client_id, config)
    
    def get_industry_template(self, industry):
        """Get industry-specific template"""
        templates = {
            'plumbing': {
                'ai_assistant_name': 'Pete',
                'industry': 'plumbing',
                'sales_script': 'plumbing_sales',
                'target_audience': 'homeowners',
                'services': ['emergency plumbing', 'drain cleaning', 'water heater repair']
            },
            'hotel': {
                'ai_assistant_name': 'Emma',
                'industry': 'hotel',
                'sales_script': 'hotel_sales',
                'target_audience': 'travelers',
                'services': ['room bookings', 'conference facilities', 'catering']
            },
            'school': {
                'ai_assistant_name': 'Lisa',
                'industry': 'school',
                'sales_script': 'school_sales',
                'target_audience': 'parents',
                'services': ['enrollment', 'after-school programs', 'summer camps']
            },
            'software': {
                'ai_assistant_name': 'Lauren',
                'industry': 'software',
                'sales_script': 'klariqo_sales',
                'target_audience': 'businesses',
                'services': ['AI voice agents', 'automated calling', 'lead generation']
            }
        }
        
        return templates.get(industry.lower(), templates['plumbing'])

# Initialize client manager
client_manager = ClientManager()

# ============================================================================
# 🚀 INITIALIZATION
# ============================================================================

if __name__ == "__main__":
    # Validate configurations on import
    try:
        validate_all_configs()
        stats = get_client_stats()
        print(f"📊 Client Statistics:")
        print(f"   Total Clients: {stats['total_clients']}")
        print(f"   Industries: {stats['clients_by_industry']}")
        print(f"   Locations: {stats['clients_by_location']}")
        print(f"   Unique Voices: {len(stats['clients_by_voice'])}")
    except ValueError as e:
        print(f"❌ Configuration Error: {e}")
        exit(1)
