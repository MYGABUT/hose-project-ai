import os
import sys

# Add the app directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.api.v1.endpoints.batches import receive_batch
from app.schemas.batch import BatchInbound

db = SessionLocal()
try:
    data = BatchInbound(
        brand="ALFA",
        standard="R2AT",
        size_inch="1/2",
        category="HOSE",
        location_code="PY-TEST-001",
        quantity=10,
        received_by="Tester"
    )
    
    # We can't directly call async receive_batch if it's awaitable, but wait, it's defined as async def receive_batch?
    import asyncio
    result = asyncio.run(receive_batch(data=data, db=db))
    print(result)
except Exception as e:
    print(f"EXCEPTION: {e}")
finally:
    db.close()
