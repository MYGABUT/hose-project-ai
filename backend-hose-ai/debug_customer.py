import sys
import os
sys.path.append(".")
from app.core.database import SessionLocal
from app.models.customer import Customer

try:
    db = SessionLocal()
    print("🔌 DB Connected")
    
    name = "Debug Customer 1"
    existing = db.query(Customer).filter(Customer.name == name).first()
    if existing:
        print(f"⚠️ Customer {name} exists, deleting...")
        db.delete(existing)
        db.commit()
    
    new_cust = Customer(name=name, email="debug@test.com")
    db.add(new_cust)
    db.commit()
    print("✅ Customer Created Successfully")
    print(f"ID: {new_cust.id}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
