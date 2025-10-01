#!/usr/bin/env python3
"""
Start the client provisioning service
Run this as: python3 start_provisioning_service.py
"""

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from client_provisioning import ClientProvisioning

class ProvisioningRequest(BaseModel):
    client_id: str
    business_name: str
    region: str
    industry: str
    client_slug: str
    port: int

# Create FastAPI app
app = FastAPI(title="Klariqo Client Provisioning Service", version="1.0.0")
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

@app.get("/")
async def root():
    return {"message": "Klariqo Client Provisioning Service", "status": "active"}

if __name__ == "__main__":
    print("🚀 Starting Client Provisioning Service on port 8080...")
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")