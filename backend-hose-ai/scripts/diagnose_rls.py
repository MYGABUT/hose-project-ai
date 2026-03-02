import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def diagnose():
    print("🚑 Diagnosing RLS Failure...")
    
    # Connect as Superuser to check config
    engine_su = create_engine(settings.DATABASE_URL)
    
    with engine_su.connect() as conn:
        print("\n1. Checking 'hose_app' privileges:")
        # Check roles
        r = conn.execute(text("SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'hose_app'")).fetchone()
        print(f"   User: {r[0]}, Super: {r[1]}, BypassRLS: {r[2]}")
        
        print("\n2. Checking 'inventory_batches' RLS status:")
        # Check table
        # relrowsecurity: True if RLS enabled
        r = conn.execute(text("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'inventory_batches'")).fetchone()
        print(f"   Table: {r[0]}, RLS Enabled: {r[1]}, Force RLS: {r[2]}")
        
        print("\n3. Checking Policies:")
        r = conn.execute(text("SELECT polname, polcmd, polpermissive FROM pg_policy WHERE polrelid = 'inventory_batches'::regclass")).fetchall()
        for row in r:
            print(f"   Policy: {row[0]}, Cmd: {row[1]}, Permissive: {row[2]}")
            
        print("\n4. Checking Data Samples:")
        r = conn.execute(text("SELECT id, owner_id FROM inventory_batches LIMIT 5")).fetchall()
        for row in r:
            print(f"   Batch {row[0]}: Owner ID = {row[1]}")

if __name__ == "__main__":
    diagnose()
