"""
Migration Script: Create SystemSettings Table
"""
import sys
import os
from sqlalchemy import create_engine, text

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import Base
from app.models.system_settings import SystemSettings

def migrate():
    print("Migrating SystemSettings table...")
    
    # Use Superuser for DDL (Schema Change)
    # Recovered from previous context: postgres:postgress
    SUPERUSER_URL = "postgresql://postgres:postgress@localhost:5432/hose_pro_db"
    engine = create_engine(SUPERUSER_URL)
    
    # Create table
    # Base.metadata.create_all(bind=engine) # This would create all, but we want to be specific safely?
    # Ideally use Alembic, but we are doing script-based migrations for this task context.
    
    try:
        SystemSettings.__table__.create(bind=engine)
        print("Table 'system_settings' created successfully.")
    except Exception as e:
        if "already exists" in str(e):
            print("Table 'system_settings' already exists.")
        else:
            print(f"Error creating table: {e}")
            raise e
            
    # Initialize default row if empty
    from sqlalchemy.orm import sessionmaker
    Session = sessionmaker(bind=engine)
    db = Session()
    
    if db.query(SystemSettings).count() == 0:
        print("Seeding default settings...")
        default_settings = SystemSettings(
            company_profile={
                "name": "PT. HOSE PRO INDONESIA",
                "address": "Jl. Industri No. 123",
                "phone": "+62 21 8998 1234",
                "email": "info@hosepro.id"
            },
            tax_config={"ppnRate": 12, "currency": "IDR"},
            operations_config={"globalMinStock": 10},
            security_policy={"sessionTimeout": 30}
        )
        db.add(default_settings)
        db.commit()
        print("Default settings seeded.")
    else:
        print("Settings already exist.")
        
    db.close()

if __name__ == "__main__":
    migrate()
