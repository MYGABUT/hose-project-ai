
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import DATABASE_URL
from app.models import JobOrder, JOStatus
from app.api.v1.endpoints.job_orders import complete_job_order

# Setup DB
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    print("[INFO] Looking for active JO to complete...")
    # Find a JO that is IN_PROGRESS or QC_PENDING
    jo = db.query(JobOrder).filter(
        JobOrder.status.in_([JOStatus.IN_PROGRESS, JOStatus.QC_PENDING])
    ).first()

    if not jo:
        print("[WARN] No active JO found to test completion.")
        sys.exit(0)

    print(f"[INFO] Found JO: {jo.jo_number} (Status: {jo.status})")
    
    print("[INFO] Attempting to complete JO...")
    result = complete_job_order(jo_id=jo.id, db=db)
    
    print("[SUCCESS] JO Completed Successfully!")
    print(result)

except Exception as e:
    print("\n[ERROR] CRASH DETECTED!")
    import traceback
    traceback.print_exc()
finally:
    db.close()
