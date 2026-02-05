"""
HoseMaster WMS - Asset Health API
Machine Tracking & Predictive Maintenance
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc, desc
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.customer_asset import CustomerAsset, AssetComponent, AssetHMLog, TrackingMode, AssetStressLevel

router = APIRouter()

# Schema
class ComponentCreate(BaseModel):
    position: str
    stressLevel: str = "medium"
    installDate: str
    installHM: float
    estimatedLife: float = 2000

class AssetCreate(BaseModel):
    name: str # e.g. PC200-8
    client: str # e.g. PT. PAMA
    location: str
    category: str
    currentHM: float
    components: List[ComponentCreate] = []

class HMUpdate(BaseModel):
    newHM: float

@router.get("/assets")
def list_assets(db: Session = Depends(get_db)):
    """🚜 List all Customer Assets with Health Status"""
    assets = db.query(CustomerAsset).all()
    # Trigger status recalc
    return {
        "status": "success",
        "data": [a.to_dict() for a in assets]
    }

@router.post("/assets")
def create_asset(data: AssetCreate, db: Session = Depends(get_db)):
    """➕ Create New Asset & Initial Components"""
    
    new_asset = CustomerAsset(
        name=data.name,
        customer_name=data.client,
        location=data.location,
        category=data.category,
        current_hm=data.currentHM,
        tracking_mode=TrackingMode.HOUR_METER,
        grade='A' # Start fresh
    )
    
    db.add(new_asset)
    db.flush() # Get ID
    
    # Add Components
    for c in data.components:
        comp = AssetComponent(
            asset_id=new_asset.id,
            position=c.position,
            stress_level=c.stressLevel,
            install_date=datetime.strptime(c.installDate, "%Y-%m-%d").date(),
            install_hm=c.installHM,
            estimated_life_hm=c.estimatedLife
        )
        db.add(comp)
        
    db.commit()
    db.refresh(new_asset)
    
    return {
        "status": "success",
        "message": "Aset berhasil didaftarkan",
        "data": new_asset.to_dict()
    }

@router.put("/assets/{asset_id}/hm")
def update_hour_meter(
    asset_id: int, 
    data: HMUpdate,
    db: Session = Depends(get_db)
):
    """⏱️ Update Asset Hour Meter (Trigger Prediction Recalc)"""
    asset = db.query(CustomerAsset).filter(CustomerAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
        
    old_hm = asset.current_hm
    asset.current_hm = data.newHM
    asset.last_hm_update = sqlfunc.now()
    
    # Log history
    log = AssetHMLog(
        asset_id=asset.id,
        prev_hm=old_hm,
        new_hm=data.newHM,
        updated_by="System/User"
    )
    db.add(log)
    
    # Recalculate Grade based on components
    # Just need simple logic: If any critical -> D, Warning -> C, else A/B
    components = db.query(AssetComponent).filter(AssetComponent.asset_id == asset.id).all()
    
    has_critical = False
    has_warning = False
    
    for c in components:
        status = c.calculate_status(data.newHM)
        c.status = status # Persist calculated status
        if status == 'critical': has_critical = True
        if status == 'warning': has_warning = True
        
    if has_critical: asset.grade = 'D'
    elif has_warning: asset.grade = 'C'
    else: asset.grade = 'B' # Default good
    
    db.commit()
    db.refresh(asset)
    
    return {
        "status": "success",
        "message": "HM Updated",
        "data": asset.to_dict()
    }
