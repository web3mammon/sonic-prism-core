#!/usr/bin/env python3
"""
CLIENT PROVISIONING AUTOMATION
Automated client setup for new business onboarding
"""

import os
import sys
import json
import shutil
import subprocess
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClientProvisioning:
    """Handles automated client provisioning and deployment"""

    def __init__(self, base_path: str = "/opt/klariqo/voice-ai-platform"):
        self.base_path = Path(base_path)
        self.clients_path = self.base_path / "clients"
        self.template_path = self.clients_path / "au" / "plmb" / "jamesonplumbing"  # Use jamesonplumbing as template

    def provision_client(self, client_data: Dict) -> Dict:
        """
        Provision a new client with complete automation

        Args:
            client_data: Dict with client_id, business_name, region, industry, port, etc.

        Returns:
            Dict with provisioning result
        """
        try:
            client_id = client_data['client_id']
            business_name = client_data['business_name']
            region = client_data['region']
            industry = client_data['industry']
            client_slug = client_data['client_slug']
            port = client_data['port']

            logger.info(f"🚀 Starting provisioning for {business_name} ({client_id})")

            # Step 1: Create client directory structure
            client_dir = self.clients_path / region / industry / client_slug
            self._create_client_directory(client_dir, client_data)

            # Step 2: Generate TTS audio files
            self._generate_client_tts(client_dir, client_data)

            # Step 3: Create and configure .env file
            self._setup_client_env(client_dir, client_data)

            # Step 4: Update nginx configuration
            self._update_nginx_config(client_data)

            # Step 5: Start client service
            self._start_client_service(client_dir, port)

            logger.info(f"✅ Provisioning completed for {client_id}")

            return {
                "success": True,
                "client_id": client_id,
                "client_path": str(client_dir),
                "port": port,
                "api_url": f"/api/{client_slug}",
                "dashboard_url": f"/{region}/{industry}/{client_slug}"
            }

        except Exception as e:
            logger.error(f"❌ Provisioning failed for {client_data.get('client_id', 'unknown')}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _create_client_directory(self, client_dir: Path, client_data: Dict):
        """Copy template and customize for new client"""
        logger.info(f"📁 Creating directory structure at {client_dir}")

        # Remove existing directory if it exists
        if client_dir.exists():
            shutil.rmtree(client_dir)

        # Create parent directories
        client_dir.parent.mkdir(parents=True, exist_ok=True)

        # Copy template directory
        shutil.copytree(self.template_path, client_dir)

        # Remove template-specific files
        files_to_remove = [
            client_dir / "__pycache__",
            client_dir / "logs",
            client_dir / "temp",
            client_dir / "call_recordings"
        ]

        for file_path in files_to_remove:
            if file_path.exists():
                if file_path.is_dir():
                    shutil.rmtree(file_path)
                else:
                    file_path.unlink()

        # Create fresh directories
        (client_dir / "logs").mkdir(exist_ok=True)
        (client_dir / "temp").mkdir(exist_ok=True)
        (client_dir / "call_recordings").mkdir(exist_ok=True)

        logger.info(f"✅ Directory structure created")

    def _generate_client_tts(self, client_dir: Path, client_data: Dict):
        """Generate custom TTS audio files for the business"""
        logger.info(f"🎵 Generating TTS audio for {client_data['business_name']}")

        # Import the TTS generator from the client directory
        sys.path.insert(0, str(client_dir))

        try:
            from tts_generator import PlumbingTTSGenerator

            tts_generator = PlumbingTTSGenerator(
                elevenlabs_api_key=os.getenv('ELEVENLABS_API_KEY'),
                output_dir=str(client_dir / "audio_optimised")
            )

            business_name = client_data['business_name']

            # Generate standard plumbing business audio files
            audio_scripts = {
                "intro_greeting.mp3": f"G'day! You've reached {business_name}. How can we help you today?",
                "pricing.mp3": f"Our pricing usually starts at $98 for standard service calls. We'll provide a full quote after understanding the job better.",
                "services_offered.mp3": f"We handle blocked drains, leaking taps, toilet repairs, hot water issues, and a range of other plumbing issues. We also do gas fitting, pipe relining, and kitchen or bathroom plumbing. What's the issue you're facing right now?",
                "after_hours_greeting.mp3": f"G'day, {business_name} here. It's after hours right now, but if it's urgent, we can still help for an after-hours call-out fee. Otherwise, leave your name and number and we'll get back to you first thing.",
                "booking_confirmation.mp3": f"Perfect! I'll book that appointment for you with {business_name}. You'll receive an SMS confirmation shortly with all the details."
            }

            for filename, text in audio_scripts.items():
                audio_path = tts_generator.generate_audio(text, filename)
                if audio_path:
                    logger.info(f"✅ Generated {filename}")
                else:
                    logger.warning(f"⚠️ Failed to generate {filename}")

            logger.info(f"✅ TTS generation completed")

        except ImportError as e:
            logger.warning(f"⚠️ Could not import TTS generator: {e}")
        except Exception as e:
            logger.error(f"❌ TTS generation failed: {e}")
        finally:
            sys.path.remove(str(client_dir))

    def _setup_client_env(self, client_dir: Path, client_data: Dict):
        """Create and configure .env file for the new client"""
        logger.info(f"⚙️ Setting up environment configuration")

        env_content = f"""# CLIENT CONFIGURATION
CLIENT_ID={client_data['client_id']}
BUSINESS_NAME={client_data['business_name']}
PORT={client_data['port']}

# API KEYS
DEEPGRAM_API_KEY={os.getenv('DEEPGRAM_API_KEY', '')}
OPENAI_API_KEY={os.getenv('OPENAI_API_KEY', '')}
ELEVENLABS_API_KEY={os.getenv('ELEVENLABS_API_KEY', '')}

# TWILIO CONFIGURATION
TWILIO_ACCOUNT_SID={os.getenv('TWILIO_ACCOUNT_SID', '')}
TWILIO_AUTH_TOKEN={os.getenv('TWILIO_AUTH_TOKEN', '')}

# BASE URL
BASE_URL=https://app.klariqo.com
"""

        env_file = client_dir / ".env"
        with open(env_file, 'w') as f:
            f.write(env_content)

        logger.info(f"✅ Environment configuration created")

    def _update_nginx_config(self, client_data: Dict):
        """Automatically update nginx configuration to add new client route"""
        logger.info(f"🌐 Updating nginx configuration")

        client_slug = client_data['client_slug']
        port = client_data['port']
        business_name = client_data['business_name']
        client_id = client_data['client_id']

        nginx_config_path = Path("/etc/nginx/sites-available/klariqo.com")

        # New route to insert
        new_route = f"""    # API routes for {business_name} client ({port})
    location /api/{client_slug}/ {{
        proxy_pass http://127.0.0.1:{port}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

"""

        try:
            # Read current nginx config
            with open(nginx_config_path, 'r') as f:
                nginx_content = f.read()

            # Find the insertion point (after jamesonplumbing route)
            insertion_marker = "    # API routes for Jameson Plumbing client (3011)"
            jameson_block_end = nginx_content.find("    }", nginx_content.find(insertion_marker))

            if jameson_block_end != -1:
                # Find the end of the Jameson block
                insert_position = nginx_content.find("\n", jameson_block_end) + 1

                # Insert the new route
                updated_content = (nginx_content[:insert_position] +
                                 "\n" + new_route +
                                 nginx_content[insert_position:])

                # Write updated config
                with open(nginx_config_path, 'w') as f:
                    f.write(updated_content)

                # Test nginx configuration
                result = subprocess.run(['nginx', '-t'], capture_output=True, text=True)
                if result.returncode == 0:
                    # Reload nginx
                    reload_result = subprocess.run(['systemctl', 'reload', 'nginx'],
                                                 capture_output=True, text=True)
                    if reload_result.returncode == 0:
                        logger.info(f"✅ Nginx configuration updated and reloaded successfully")
                    else:
                        logger.error(f"❌ Failed to reload nginx: {reload_result.stderr}")
                else:
                    logger.error(f"❌ Nginx configuration test failed: {result.stderr}")

            else:
                logger.error(f"❌ Could not find insertion point in nginx config")

        except Exception as e:
            logger.error(f"❌ Failed to update nginx config: {e}")

            # Fallback: write to temp file as before
            nginx_file = Path(f"/tmp/nginx_config_{client_slug}.conf")
            with open(nginx_file, 'w') as f:
                f.write(new_route)
            logger.info(f"📝 Fallback: Nginx config written to {nginx_file} for manual application")

    def _start_client_service(self, client_dir: Path, port: int):
        """Start the FastAPI service for the new client"""
        logger.info(f"🚀 Starting client service on port {port}")

        try:
            # Create a simple startup script
            startup_script = client_dir / "start_service.sh"
            script_content = f"""#!/bin/bash
cd {client_dir}
export PORT={port}
source .env
nohup python3 run_fastapi.py > logs/service.log 2>&1 &
echo $! > service.pid
echo "Service started on port {port} with PID $(cat service.pid)"
"""

            with open(startup_script, 'w') as f:
                f.write(script_content)

            # Make script executable
            startup_script.chmod(0o755)

            # Execute the startup script
            result = subprocess.run(['bash', str(startup_script)],
                                  capture_output=True, text=True, cwd=client_dir)

            if result.returncode == 0:
                logger.info(f"✅ Client service started on port {port}")
            else:
                logger.error(f"❌ Failed to start service: {result.stderr}")

        except Exception as e:
            logger.error(f"❌ Service startup failed: {e}")

# FastAPI endpoint for provisioning
if __name__ == "__main__":
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    import uvicorn

    class ProvisioningRequest(BaseModel):
        client_id: str
        business_name: str
        region: str
        industry: str
        client_slug: str
        port: int

    app = FastAPI()
    provisioner = ClientProvisioning()

    @app.post("/api/provision-client")
    async def provision_client(request: ProvisioningRequest):
        """Provision a new client"""
        try:
            result = provisioner.provision_client(request.dict())
            if result['success']:
                return result
            else:
                raise HTTPException(status_code=500, detail=result['error'])
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Run the provisioning server
    uvicorn.run(app, host="0.0.0.0", port=8000)