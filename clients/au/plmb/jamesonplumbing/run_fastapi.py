#!/usr/bin/env python3
"""
FastAPI startup script for Klariqo Plumbing Client Template
"""

import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.environ.get("PORT", 3011))

    print(f"🚀 Starting {os.getenv('BUSINESS_NAME', 'Plumbing')} Client (FastAPI) on port {port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        access_log=False,
        log_level="warning"
    )