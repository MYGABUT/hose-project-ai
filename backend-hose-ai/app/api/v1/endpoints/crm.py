"""
HoseMaster WMS - CRM API Endpoints
Kanban backend logic
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.models.crm import CRMLead, LeadStatus

router = APIRouter()

# --- Schemas ---
class LeadCreate(BaseModel):
    title: str
    company_name: str
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    estimated_value: Optional[float] = 0.0
    status: Optional[str] = "PROSPECT"
    assigned_to_id: Optional[int] = None
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    estimated_value: Optional[float] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None
    notes: Optional[str] = None

# --- Endpoints ---

@router.get("")
def list_leads(
    status: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtain all CRM Leads, format suitable for Kanban columns"""
    query = db.query(CRMLead)
    
    if status:
        try:
            enum_status = LeadStatus[status.upper()]
            query = query.filter(CRMLead.status == enum_status)
        except KeyError:
            pass
            
    if assigned_to_id:
        query = query.filter(CRMLead.assigned_to_id == assigned_to_id)
        
    if search:
        query = query.filter(
            (CRMLead.title.ilike(f"%{search}%")) |
            (CRMLead.company_name.ilike(f"%{search}%"))
        )
        
    # Order by newest
    leads = query.order_by(CRMLead.created_at.desc()).all()
    
    return {
        "status": "success",
        "data": [lead.to_dict() for lead in leads]
    }

@router.post("")
def create_lead(data: LeadCreate, db: Session = Depends(get_db)):
    """Create a new CRM Lead"""
    
    status_enum = LeadStatus.PROSPECT
    if data.status:
        try:
            status_enum = LeadStatus[data.status.upper()]
        except KeyError:
            pass
            
    lead = CRMLead(
        title=data.title,
        company_name=data.company_name,
        contact_person=data.contact_person,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        estimated_value=data.estimated_value,
        status=status_enum,
        assigned_to_id=data.assigned_to_id,
        notes=data.notes
    )
    
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    return {
        "status": "success",
        "message": "Lead created successfully",
        "data": lead.to_dict()
    }

@router.put("/{lead_id}")
def update_lead(lead_id: int, data: LeadUpdate, db: Session = Depends(get_db)):
    """Update CRM Lead (e.g. changing Kanban column)"""
    lead = db.query(CRMLead).filter(CRMLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    updates = data.dict(exclude_unset=True)
    
    # Handle Enum conversion explicitly
    if 'status' in updates:
        try:
            updates['status'] = LeadStatus[updates['status'].upper()]
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid phase status")
            
    for k, v in updates.items():
        setattr(lead, k, v)
        
    db.commit()
    db.refresh(lead)
    
    return {
        "status": "success",
        "message": "Lead updated",
        "data": lead.to_dict()
    }

@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    """Delete a Lead"""
    lead = db.query(CRMLead).filter(CRMLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    db.delete(lead)
    db.commit()
    
    return {
        "status": "success",
        "message": "Lead deleted"
    }
