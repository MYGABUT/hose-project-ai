"""
HoseMaster WMS - Audit Log Model
Tracks all user activities for fraud prevention
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class AuditLog(Base):
    """
    Audit Log - Jejak Aktivitas User
    
    Records every CREATE, UPDATE, DELETE operation on important entities.
    Used by owner to monitor and prevent fraud.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # User info
    user_id = Column(Integer, index=True)
    user_name = Column(String(100))
    user_role = Column(String(50))
    
    # Action
    action = Column(String(20), index=True)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    
    # Entity affected
    entity_type = Column(String(50), index=True)  # Invoice, JO, Product, Customer, etc
    entity_id = Column(Integer)
    entity_number = Column(String(100))  # Human-readable ID like JO-001, INV-202601-001
    
    # Changes
    old_values = Column(JSON)  # Values before change (for UPDATE/DELETE)
    new_values = Column(JSON)  # Values after change (for CREATE/UPDATE)
    changes_summary = Column(Text)  # Human-readable summary: "Harga diubah dari 100 ke 150"
    
    # Context
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    
    # Additional info
    module = Column(String(50))  # Finance, Production, Inventory, etc
    notes = Column(Text)

    def __repr__(self):
        return f"<AuditLog {self.action} {self.entity_type} by {self.user_name}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "user_role": self.user_role,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_number": self.entity_number,
            "old_values": self.old_values,
            "new_values": self.new_values,
            "changes_summary": self.changes_summary,
            "ip_address": self.ip_address,
            "module": self.module,
            "notes": self.notes
        }


# Helper function to create audit log
def create_audit_log(
    db,
    action: str,
    entity_type: str,
    entity_id: int = None,
    entity_number: str = None,
    old_values: dict = None,
    new_values: dict = None,
    changes_summary: str = None,
    user_id: int = None,
    user_name: str = "System",
    user_role: str = None,
    module: str = None,
    ip_address: str = None,
    notes: str = None
):
    """
    Helper to create audit log entry.
    Call this in your API endpoints after data changes.
    """
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_number=entity_number,
        old_values=old_values,
        new_values=new_values,
        changes_summary=changes_summary,
        user_id=user_id,
        user_name=user_name,
        user_role=user_role,
        module=module,
        ip_address=ip_address,
        notes=notes
    )
    db.add(log)
    return log
