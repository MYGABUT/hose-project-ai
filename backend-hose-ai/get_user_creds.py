from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
user = db.query(User).first()
if user:
    print(f"EMAIL:{user.email}")
    print(f"PASSWORD:{user.password}") 
else:
    print("No users found")
db.close()
