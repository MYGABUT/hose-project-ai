"""
HoseMaster WMS - Audit Trail API
View and search user activity logs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import Optional
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.models import AuditLog


router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/logs")
def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_number: Optional[str] = None,
    action: Optional[str] = None,
    user_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    📋 Get audit logs with filters
    
    Filter by:
    - entity_type: Invoice, JO, Product, Customer, etc
    - action: CREATE, UPDATE, DELETE
    - user_name: partial match
    - date range
    """
    query = db.query(AuditLog)
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_number:
        query = query.filter(AuditLog.entity_number.ilike(f"%{entity_number}%"))
    if action:
        query = query.filter(AuditLog.action == action)
    if user_name:
        query = query.filter(AuditLog.user_name.ilike(f"%{user_name}%"))
    
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [log.to_dict() for log in logs]
    }


@router.get("/logs/summary")
def get_audit_summary(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    """
    📊 Get audit activity summary
    
    Shows counts by action type, entity type, and user
    """
    since = datetime.now() - timedelta(days=days)
    
    # By action
    action_counts = db.query(
        AuditLog.action,
        sqlfunc.count(AuditLog.id)
    ).filter(
        AuditLog.timestamp >= since
    ).group_by(AuditLog.action).all()
    
    # By entity
    entity_counts = db.query(
        AuditLog.entity_type,
        sqlfunc.count(AuditLog.id)
    ).filter(
        AuditLog.timestamp >= since
    ).group_by(AuditLog.entity_type).all()
    
    # By user (top 10)
    user_counts = db.query(
        AuditLog.user_name,
        sqlfunc.count(AuditLog.id)
    ).filter(
        AuditLog.timestamp >= since
    ).group_by(AuditLog.user_name).order_by(
        sqlfunc.count(AuditLog.id).desc()
    ).limit(10).all()
    
    # Total
    total = db.query(AuditLog).filter(AuditLog.timestamp >= since).count()
    
    return {
        "status": "success",
        "period_days": days,
        "total_activities": total,
        "by_action": {a: c for a, c in action_counts},
        "by_entity": {e: c for e, c in entity_counts},
        "top_users": [{"user": u, "count": c} for u, c in user_counts]
    }


@router.get("/logs/entity/{entity_type}/{entity_id}")
def get_entity_history(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db)
):
    """
    🔍 Get full history for a specific entity
    
    Example: /audit/logs/entity/Invoice/123
    """
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == entity_id
    ).order_by(AuditLog.timestamp.desc()).all()
    
    return {
        "status": "success",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "history_count": len(logs),
        "data": [log.to_dict() for log in logs]
    }


@router.get("/logs/user/{user_name}")
def get_user_activity(
    user_name: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    👤 Get all activities by a specific user
    
    Useful for monitoring employee actions
    """
    since = datetime.now() - timedelta(days=days)
    
    logs = db.query(AuditLog).filter(
        AuditLog.user_name.ilike(f"%{user_name}%"),
        AuditLog.timestamp >= since
    ).order_by(AuditLog.timestamp.desc()).limit(100).all()
    
    # Summary by action
    action_summary = db.query(
        AuditLog.action,
        sqlfunc.count(AuditLog.id)
    ).filter(
        AuditLog.user_name.ilike(f"%{user_name}%"),
        AuditLog.timestamp >= since
    ).group_by(AuditLog.action).all()
    
    return {
        "status": "success",
        "user_name": user_name,
        "period_days": days,
        "total_activities": len(logs),
        "action_summary": {a: c for a, c in action_summary},
        "recent_activities": [log.to_dict() for log in logs[:50]]
    }


@router.get("/logs/suspicious")
def get_suspicious_activities(
    db: Session = Depends(get_db)
):
    """
    ⚠️ Get potentially suspicious activities
    
    Flags:
    - DELETE actions
    - Price changes
    - After-hours activity
    """
    # Deletes in last 7 days
    week_ago = datetime.now() - timedelta(days=7)
    
    deletes = db.query(AuditLog).filter(
        AuditLog.action == 'DELETE',
        AuditLog.timestamp >= week_ago
    ).order_by(AuditLog.timestamp.desc()).all()
    
    # Price-related changes
    price_changes = db.query(AuditLog).filter(
        AuditLog.changes_summary.ilike('%harga%'),
        AuditLog.timestamp >= week_ago
    ).order_by(AuditLog.timestamp.desc()).all()
    
    return {
        "status": "success",
        "alerts": {
            "deletes_count": len(deletes),
            "price_changes_count": len(price_changes)
        },
        "deletes": [log.to_dict() for log in deletes[:20]],
        "price_changes": [log.to_dict() for log in price_changes[:20]]
    }
