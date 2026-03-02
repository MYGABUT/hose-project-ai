import sys
import os
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings
from sqlalchemy.engine.url import make_url

def forensic():
    print("🔍 Forensic Check...")
    
    # Connect as hose_app
    url = make_url(settings.DATABASE_URL)
    # Using the password we found
    new_url = f"postgresql://hose_app:TJycVY2_Ae09vsdtlVLLYg@{url.host}:{url.port}/{url.database}"
    engine = create_engine(new_url)
    
    with engine.connect() as conn:
        # 1. Check ID=999999
        fake_id = 999999
        conn.execute(text(f"SET app.current_company_id = '{fake_id}'"))
        
        # 2. Select rows
        rows = conn.execute(text("SELECT id, owner_id FROM inventory_batches LIMIT 10")).fetchall()
        
        print(f"👻 Visible Rows with company_id={fake_id}: {len(rows)}")
        for r in rows:
            print(f"   Row ID: {r[0]} | Owner ID: {r[1]}")
            
        if not rows:
            print("✅ No rows visible.")
            
if __name__ == "__main__":
    forensic()
