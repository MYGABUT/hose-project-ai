"""
Seed Users
Initialize default users for HoseMaster WMS
"""
import sys
sys.path.append(".")

from app.core.database import SessionLocal, init_db
from app.models.user import User
from app.core.security import get_password_hash

USERS = [
    {
        "name": "Admin Boss",
        "email": "admin@hosepro.id",
        "password": "admin123",
        "role": "super_admin",
        "bio": "Administrator System",
        "photo": "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
    },
    {
        "name": "Pak Budi (Manager)",
        "email": "budi@hosepro.id",
        "password": "budi123",
        "role": "manager",
        "bio": "Operational Manager",
        "photo": "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi"
    },
    {
        "name": "Siti Salesku",
        "email": "siti@hosepro.id",
        "password": "siti123",
        "role": "sales",
        "bio": "Sales Executive",
        "photo": "https://api.dicebear.com/7.x/avataaars/svg?seed=Siti"
    },
    {
        "name": "Agus Senior",
        "email": "agus@hosepro.id", 
        "password": "agus123",
        "role": "senior_technician",
        "bio": "Lead Technician",
        "photo": "https://api.dicebear.com/7.x/avataaars/svg?seed=Agus"
    },
     {
        "name": "Rudi QC",
        "email": "rudi@hosepro.id",
        "password": "rudi123",
        "role": "qc",
        "bio": "QC Inspector",
        "photo": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rudi"
    }
]

def seed_users():
    db = SessionLocal()
    try:
        print("🌱 Seeding Users...")
        for u_data in USERS:
            # Check if user exists - key by email
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            
            # If exists, we update password to ensure it's hashed (fixing previous bug)
            if existing:
                db.delete(existing)
                db.flush()
                print(f"♻️ Recreating user: {u_data['name']}")
            
            user = User(
                name=u_data["name"],
                email=u_data["email"],
                password=get_password_hash(u_data["password"]), # Hash it!
                role=u_data["role"],
                bio=u_data["bio"],
                photo=u_data["photo"],
                is_active=True,
                is_deleted=False
            )
            db.add(user)
            print(f"✅ Created user: {u_data['name']}")
        
        db.commit()
        print("✅ User seeding complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()  # Ensure tables exist
    seed_users()
