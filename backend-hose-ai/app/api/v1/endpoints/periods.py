"""
HoseMaster WMS - Period Lock API
Monthly period closing and transaction blocking
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models import PeriodLock, is_period_locked, create_audit_log


router = APIRouter(prefix="/periods", tags=["Period Lock"])


class LockPeriodRequest(BaseModel):
    year: int
    month: int
    reason: Optional[str] = "Monthly closing"


class UnlockPeriodRequest(BaseModel):
    year: int
    month: int
    reason: str


@router.get("")
def list_periods(
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    📋 List all periods with lock status
    """
    query = db.query(PeriodLock)
    if year:
        query = query.filter(PeriodLock.year == year)
    
    periods = query.order_by(PeriodLock.year.desc(), PeriodLock.month.desc()).all()
    
    return {
        "status": "success",
        "data": [p.to_dict() for p in periods]
    }


@router.get("/check/{year}/{month}")
def check_period_status(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    """
    🔍 Check if a specific period is locked
    """
    is_locked = is_period_locked(db, year, month)
    
    return {
        "status": "success",
        "period": f"{year}-{month:02d}",
        "is_locked": is_locked
    }


@router.post("/lock")
def lock_period(
    data: LockPeriodRequest,
    db: Session = Depends(get_db)
):
    """
    🔒 Lock a period (Tutup Buku)
    
    After locking:
    - No new transactions can be created with dates in this period
    - No existing transactions can be modified
    """
    # Check if period exists
    period = db.query(PeriodLock).filter(
        PeriodLock.year == data.year,
        PeriodLock.month == data.month
    ).first()
    
    if period:
        if period.is_locked:
            raise HTTPException(
                status_code=400,
                detail=f"Periode {data.year}-{data.month:02d} sudah dikunci"
            )
        period.is_locked = True
        period.locked_at = datetime.now()
        period.locked_by = "Admin"  # TODO: Get from auth
        period.lock_reason = data.reason
    else:
        period = PeriodLock(
            year=data.year,
            month=data.month,
            is_locked=True,
            locked_at=datetime.now(),
            locked_by="Admin",
            lock_reason=data.reason
        )
        db.add(period)
    
    # Log the action
    create_audit_log(
        db=db,
        action="LOCK",
        entity_type="Period",
        entity_number=f"{data.year}-{data.month:02d}",
        new_values={"is_locked": True, "reason": data.reason},
        changes_summary=f"Periode {data.year}-{data.month:02d} ditutup",
        user_name="Admin",
        module="Finance"
    )
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Periode {data.year}-{data.month:02d} berhasil dikunci",
        "data": period.to_dict()
    }


@router.post("/unlock")
def unlock_period(
    data: UnlockPeriodRequest,
    db: Session = Depends(get_db)
):
    """
    🔓 Unlock a period (Emergency only)
    
    Requires reason for audit trail.
    This should only be done by owner/manager.
    """
    period = db.query(PeriodLock).filter(
        PeriodLock.year == data.year,
        PeriodLock.month == data.month
    ).first()
    
    if not period or not period.is_locked:
        raise HTTPException(
            status_code=400,
            detail=f"Periode {data.year}-{data.month:02d} tidak terkunci"
        )
    
    period.is_locked = False
    period.unlocked_at = datetime.now()
    period.unlocked_by = "Admin"
    period.unlock_reason = data.reason
    
    # Log the action (IMPORTANT for audit)
    create_audit_log(
        db=db,
        action="UNLOCK",
        entity_type="Period",
        entity_number=f"{data.year}-{data.month:02d}",
        old_values={"is_locked": True},
        new_values={"is_locked": False, "reason": data.reason},
        changes_summary=f"Periode {data.year}-{data.month:02d} dibuka kembali. Alasan: {data.reason}",
        user_name="Admin",
        module="Finance"
    )
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Periode {data.year}-{data.month:02d} berhasil dibuka",
        "data": period.to_dict()
    }


@router.get("/current")
def get_current_period(db: Session = Depends(get_db)):
    """
    📅 Get current period status
    """
    now = datetime.now()
    is_locked = is_period_locked(db, now.year, now.month)
    
    return {
        "status": "success",
        "current_period": f"{now.year}-{now.month:02d}",
        "is_locked": is_locked
    }
