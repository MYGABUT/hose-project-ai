import sys
from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).filter(User.locked_until != None).all()
count = 0
for u in users:
    u.locked_until = None
    u.failed_login_count = 0
    count += 1
db.commit()
print(f"Unlocked {count} users")
