
import sys
sys.path.append(".")

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def reset_admin():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@hosepro.id").first()
        if user:
            print(f"Found user {user.name}. Resetting password...")
            user.password = get_password_hash("admin123")
            db.commit()
            print("✅ Password reset to 'admin123'")
        else:
            print("❌ User admin@hosepro.id not found!")
            # Create if missing
            print("Creating admin user...")
            new_user = User(
                name="Deep Dive Admin",
                email="admin@hosepro.id",
                password=get_password_hash("admin123"),
                role="super_admin",
                is_active=True
            )
            db.add(new_user)
            db.commit()
            print("✅ Admin user created.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()
