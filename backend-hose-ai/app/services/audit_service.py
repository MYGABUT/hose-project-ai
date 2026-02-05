from sqlalchemy.orm import Session
from app.models.audit_log import create_audit_log

def log_activity(
    db: Session,
    action: str,
    entity_type: str,
    details: str,
    user=None,
    entity_id: int = None,
    entity_number: str = None,
    old_values: dict = None,
    new_values: dict = None,
    module: str = None
):
    """
    Helper to log user activity.
    """
    user_id = user.id if user else None
    user_name = user.name if user else "System"
    user_role = user.role if user else None

    try:
        create_audit_log(
            db=db,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_number=entity_number,
            changes_summary=details,
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            module=module,
            old_values=old_values,
            new_values=new_values
        )
        db.commit()
    except Exception as e:
        print(f"Failed to create audit log: {e}")
        # Don't fail the main request just because logging failed
        db.rollback()
