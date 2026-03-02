from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.system_settings import SystemSettings
from app.core.encryption import get_encryption_service

router = APIRouter()

# Schema for updating settings
class SettingsUpdate(BaseModel):
    company: Optional[Dict[str, Any]] = None
    tax: Optional[Dict[str, Any]] = None
    documents: Optional[Dict[str, Any]] = None
    operations: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None
    integrations: Optional[Dict[str, Any]] = None

@router.get("/", status_code=status.HTTP_200_OK)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get system settings. Secrets are returned masked or encrypted?
    Usually we return masked secrets (e.g. *******) for display.
    """
    # Only Super Admin or Manager? 
    # Settings.jsx says: user?.role === 'super_admin' || user?.role === 'manager'
    if current_user.role not in ['super_admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    settings = db.query(SystemSettings).order_by(SystemSettings.id.desc()).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not initialized")
        
    encryption = get_encryption_service()
    
    # Decrypt secrets for editing? Or keep masked?
    # If we return masked, the frontend must strictly handle "unchanged" vs "changed" state.
    # Let's return the real values decrypted for now, assuming the admin needs to see/edit them.
    # Ideally: Return masked "******", and only update if new value provided.
    
    wa_key = encryption.decrypt(settings.wa_api_key_enc) if settings.wa_api_key_enc else ""
    smtp_pass = encryption.decrypt(settings.smtp_password_enc) if settings.smtp_password_enc else ""
    
    return {
        "company": settings.company_profile or {},
        "tax": settings.tax_config or {},
        "documents": settings.document_formats or {},
        "operations": settings.operations_config or {},
        "security": settings.security_policy or {},
        "integrations": {
            "smtpHost": settings.smtp_host,
            "smtpPort": settings.smtp_port,
            "smtpUsername": settings.smtp_username,
            "smtpPassword": smtp_pass, # Decrypted
            "waApiKey": wa_key,         # Decrypted
            "waSenderNumber": settings.wa_sender_number,
            "printerType": settings.printer_type
        }
    }

@router.put("/", status_code=status.HTTP_200_OK)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ['super_admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    settings = db.query(SystemSettings).order_by(SystemSettings.id.desc()).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
    
    encryption = get_encryption_service()
    
    # Update JSON fields
    if payload.company:
        settings.company_profile = payload.company
    if payload.tax:
        settings.tax_config = payload.tax
    if payload.documents:
        settings.document_formats = payload.documents
    if payload.operations:
        settings.operations_config = payload.operations
    if payload.security:
        settings.security_policy = payload.security
        
    # Update Integrations & Encrypt Secrets
    if payload.integrations:
        integ = payload.integrations
        if "smtpHost" in integ: settings.smtp_host = integ["smtpHost"]
        if "smtpPort" in integ: settings.smtp_port = integ["smtpPort"]
        if "smtpUsername" in integ: settings.smtp_username = integ["smtpUsername"]
        if "waSenderNumber" in integ: settings.wa_sender_number = integ["waSenderNumber"]
        if "printerType" in integ: settings.printer_type = integ["printerType"]
        
        # Handle Secrets - Encrypt!
        if "waApiKey" in integ and integ["waApiKey"]:
            settings.wa_api_key_enc = encryption.encrypt(integ["waApiKey"])
            
        if "smtpPassword" in integ and integ["smtpPassword"]:
            settings.smtp_password_enc = encryption.encrypt(integ["smtpPassword"])
            
    settings.updated_by_id = current_user.id
    db.commit()
    db.refresh(settings)
    
    return {"status": "success", "message": "Settings updated"}
