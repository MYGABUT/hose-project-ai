import sys
import os
from sqlalchemy.orm import Session
from datetime import datetime

# Add root directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.models.user import User
from app.core.security import get_password_hash

def seed_developer():
    print("Starting Developer seeder...")
    db = SessionLocal()
    
    try:
        # Check if developer already exists
        developer = db.query(User).filter(User.email == "dev@hosemaster.com").first()
        
        if developer:
            print("Developer already exists, updating password and permissions...")
            developer.password = get_password_hash("h0s3m4st3r_d3v")
            developer.role = "developer"
            developer.is_active = True
            developer.is_deleted = False
        else:
            print("Creating new Developer user...")
            developer = User(
                name="System Developer",
                email="dev@hosemaster.com",
                password=get_password_hash("h0s3m4st3r_d3v"),
                role="developer",
                phone="0000000000",
                address="Internal Core System",
                bio="Hidden Root Access Role",
                is_active=True,
                is_deleted=False
            )
            db.add(developer)
            
        db.commit()
        print("✅ Developer seeded successfully!")
        print("Login credentials:")
        print("Email: dev@hosemaster.com")
        print("Password: h0s3m4st3r_d3v")
        
    except Exception as e:
        print(f"❌ Error seeding developer: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_developer()
