#!/usr/bin/env python3
"""
FastAPI startup script for Klariqo Plumbing Client Template
"""

import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment (REQUIRED for production)
    port = os.environ.get("PORT")
    if not port:
        raise ValueError("❌ PORT environment variable must be set for client deployment")
    port = int(port)

    print(f"🚀 Starting Klariqo Plumbing Client (FastAPI) on port {port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        access_log=False,
        log_level="warning"
    )