
from app.core.database import SessionLocal
from app.models import JobOrder

db = SessionLocal()

print("🔍 Checking Job Orders for SO ID 4...")
jos = db.query(JobOrder).filter(JobOrder.so_id == 4).all()

if jos:
    print(f"✅ Found {len(jos)} JOs linked to SO #4:")
    for jo in jos:
        print(f"  - ID: {jo.id}, JO Number: {jo.jo_number}, Status: {jo.status}")
else:
    print("❌ No JOs found for SO #4.")
    
    # Check all JOs to see what SO IDs exist
    all_jos = db.query(JobOrder).limit(10).all()
    print("\n📋 First 10 JOs in DB:")
    for jo in all_jos:
        print(f"  - JO {jo.jo_number}: so_id={jo.so_id}")
