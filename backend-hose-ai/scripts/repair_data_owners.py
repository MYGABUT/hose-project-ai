"""
Repair Script: Backfill Owner/Company IDs
RLS hides rows with NULL owner_id. This script assigns them to the default company.
"""
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.company import Company
from app.models.inventory_batch import InventoryBatch
from app.models.storage_location import StorageLocation
from app.models.user import User

def repair():
    print("🔧 Starting Data Repair for RLS Compliance...")
    
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # 1. Get or Create Default Company
        company = db.query(Company).filter(Company.code == 'HOSE-HQ').first()
        if not company:
            print("   Creating default company 'HOSE-HQ'...")
            company = Company(
                code='HOSE-HQ', 
                name='PT. HOSE PRO INDONESIA (Headquarters)', 
                is_parent=True
            )
            db.add(company)
            db.commit()
            db.refresh(company)
        
        print(f"   Default Company: {company.name} (ID: {company.id})")
        
        # 2. Update InventoryBatch
        print("   Checking InventoryBatch...")
        batches = db.query(InventoryBatch).filter(InventoryBatch.owner_id == None).all()
        if batches:
            print(f"   -> Fixing {len(batches)} batches with NULL owner_id...")
            for b in batches:
                b.owner_id = company.id
            db.commit()
            print("   ✅ Batches updated.")
        else:
            print("   -> All batches have owner_id.")
            
        # 3. Update StorageLocation
        print("   Checking StorageLocation...")
        locs = db.query(StorageLocation).filter(StorageLocation.company_id == None).all()
        if locs:
            print(f"   -> Fixing {len(locs)} locations with NULL company_id...")
            for l in locs:
                l.company_id = company.id
            db.commit()
            print("   ✅ Locations updated.")
        else:
            print("   -> All locations have company_id.")
            
        # 4. Update Users (Optional but good for completeness)
        users = db.query(User).filter(User.company_id == None).all()
        if users:
            print(f"   -> Fixing {len(users)} users with NULL company_id...")
            for u in users:
                u.company_id = company.id
            db.commit()
            print("   ✅ Users updated.")
            
    except Exception as e:
        print(f"❌ Error during repair: {e}")
        db.rollback()
    finally:
        db.close()
        
    print("\n✅ Repair Complete.")

if __name__ == "__main__":
    repair()
