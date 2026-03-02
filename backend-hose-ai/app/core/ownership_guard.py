"""
Ownership Guard — Fortress Mode 3.0 🔒
Anti-BOLA Protection (OWASP API1:2023)

Ensures every data access verifies object ownership.
Prevents Broken Object Level Authorization attacks where
User A tries to access User B's data by guessing IDs.

Usage:
    from app.core.ownership_guard import verify_ownership

    @router.get("/invoices/{invoice_id}")
    def get_invoice(
        invoice_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        invoice = verify_ownership(db, Invoice, invoice_id, current_user)
        return invoice
"""
import logging
from typing import Type, TypeVar, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User

logger = logging.getLogger("security.bola")

T = TypeVar("T")

# Roles that bypass ownership checks (e.g., super admin across companies)
BYPASS_ROLES = {"superadmin"}


def verify_ownership(
    db: Session,
    model: Type[T],
    object_id: int,
    current_user: User,
    company_field: str = "company_id",
    allow_roles: Optional[set] = None,
) -> T:
    """
    Fetch an object and verify it belongs to the current user's company.
    
    Args:
        db: Database session
        model: SQLAlchemy model class (e.g., Invoice, SalesOrder)
        object_id: ID of the object to fetch
        current_user: Authenticated user from JWT
        company_field: Column name for company ownership (default: 'company_id')
        allow_roles: Additional roles that bypass check (merged with BYPASS_ROLES)
        
    Returns:
        The database object if ownership is verified
        
    Raises:
        404: Object not found
        403: Object belongs to different company (BOLA attempt)
    """
    obj = db.query(model).filter(model.id == object_id).first()
    
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{model.__name__} not found",
        )
    
    # SuperAdmin bypass
    bypass = BYPASS_ROLES.copy()
    if allow_roles:
        bypass.update(allow_roles)
    
    if current_user.role in bypass:
        return obj
    
    # Ownership check
    obj_company_id = getattr(obj, company_field, None)
    
    if obj_company_id is None:
        # Model doesn't have company_id — skip check but log warning
        logger.warning(
            f"⚠️ BOLA SKIP | Model={model.__name__} has no '{company_field}' column | "
            f"User={current_user.email}"
        )
        return obj
    
    if obj_company_id != current_user.company_id:
        # 🚨 BOLA ATTEMPT DETECTED!
        logger.warning(
            f"🚨 BOLA ATTEMPT | User={current_user.email} (Company={current_user.company_id}) "
            f"tried to access {model.__name__}#{object_id} "
            f"(Company={obj_company_id}) | BLOCKED"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )
    
    return obj


def verify_list_ownership(
    db: Session,
    model: Type[T],
    current_user: User,
    company_field: str = "company_id",
    extra_filters: list = None,
):
    """
    Query a list of objects filtered by company ownership.
    
    Args:
        db: Database session
        model: SQLAlchemy model class
        current_user: Authenticated user
        company_field: Column name for company ownership
        extra_filters: Additional SQLAlchemy filter conditions
        
    Returns:
        SQLAlchemy query filtered by company_id
    """
    query = db.query(model)
    
    # SuperAdmin sees everything
    if current_user.role not in BYPASS_ROLES:
        company_col = getattr(model, company_field, None)
        if company_col is not None:
            query = query.filter(company_col == current_user.company_id)
    
    if extra_filters:
        for f in extra_filters:
            query = query.filter(f)
    
    return query
