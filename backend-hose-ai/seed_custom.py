import sys
import os
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import get_password_hash
import sqlalchemy

def seed_admin():
    print('Testing DB connection...')
    
    try:
        # Pengecekan sekilas untuk memastikan tabel ada
        Base.metadata.create_all(bind=engine)
        print('Tables verified.')
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return

    db = SessionLocal()
    try:
        admin_email = 'admin@hosepro.id'
        admin = db.query(User).filter(User.email == admin_email).first()
        
        if not admin:
            print('Admin not found in DB. Creating now...')
            new_admin = User(
                name='Administrator',
                email=admin_email,
                password=get_password_hash('admin123'),
                role='admin',
                is_active=True,
                is_deleted=False
            )
            db.add(new_admin)
            db.commit()
            print('✅ Admin created successfully (admin@hosepro.id / admin123).')
        else:
            print('Admin already exists! Updating password to admin123 to be safe...')
            admin.password = get_password_hash('admin123')
            admin.is_active = True
            admin.is_deleted = False
            db.commit()
            print('✅ Admin password forcefully updated to admin123.')
            
    except Exception as e:
        print(f'Error seeding: {e}')
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
