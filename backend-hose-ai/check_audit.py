from app.core.database import SessionLocal
from app.models.audit_log import AuditLog

db = SessionLocal()
count = db.query(AuditLog).count()
print(f"Total Audit Logs: {count}")
logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(5).all()
for log in logs:
    print(f"[{log.timestamp}] {log.action} {log.entity_type} by {log.user_name}: {log.changes_summary}")
db.close()
